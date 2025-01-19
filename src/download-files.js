import { downloadFile, DownloadStatus } from 'ipull';
import { extractFiles } from './extract.js';
import { v4 as uuidv4 } from 'uuid';
// Store active downloads
export const activeDownloaders = new Map();

function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

export async function checkFilename(urlLink) {
    if (!isValidUrl(urlLink)) {
        console.error('Invalid URL:', urlLink);
        return null;
    }

    let downloader = null;
    try {
        const config = {
            url: urlLink,
            directory: './downloads',
            cliProgress: true,
            parallelStreams: 3,
        };

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout exceeded')), 10000)
        );

        const downloaderPromise = downloadFile(config);

        downloader = await Promise.race([downloaderPromise, timeoutPromise]);

        if (!downloader.fileName) {
            throw new Error('Filename not available after download.');
        }

        return downloader.fileName;
    } catch (error) {
        console.error('Error:', error);

        if (downloader && downloader.closeAndDeleteFile) {
            await downloader.closeAndDeleteFile();
        }

        return 'failed';
    }
}

export async function downloadWithLogging(url, directory,userId, parallelStreams = 3, extract, callback) {
    return new Promise(async (resolve, reject) => {
        let downloader = null;
        try {
            const userDownloadDir = `${directory}/${userId}/`;
            const downloadId = uuidv4(); // Generate a unique ID
            downloader = await downloadFile({
                url: url,
                directory: userDownloadDir,
                parallelStreams: parallelStreams
            });

            // Store the downloader instance with the unique ID as key
            activeDownloaders.set(downloadId, { downloader, fileName: downloader.fileName });

            downloader.download();
            const fileName = downloader.fileName;
            console.log(fileName);

            const interval = setInterval(async() => {
                let status = downloader.status;
                const logs = {
                    fileName: status.fileName,
                    transferAction: status.transferAction,
                    downloadStatus: status.downloadStatus,
                    transferred: status.formatTransferredOfTotal,
                    speed: status.formattedSpeed,
                    timeLeft: status.formatTimeLeft,
                    percentage: status.formattedPercentage
                };

                if (callback) {
                    callback(logs);
                }

                if (status.downloadStatus === "Finished") {
                    clearInterval(interval);
                    activeDownloaders.delete(downloadId); // Use the ID here

                    if(fileName.includes('.zip') && (extract===true)) {
                        console.log("extracting file")
                        const path = await extractFiles(fileName,userId);
                        console.log(`Extracted ${fileName}`);
                        resolve(path);
                    } else {
                        resolve(fileName);
                    }
                } else if (status.downloadStatus === "Cancelled") {
                    clearInterval(interval);
                    activeDownloaders.delete(downloadId); // Use the ID here
                    reject("cancelled");
                }
            }, 1000);
        } catch (error) {
            console.log(error);
            if (downloader) {
                // We might not have the downloadId here if the error happened before downloader was created,
                // but it's safer to try to delete if it exists.
                if (downloader.fileName) {
                    const existingDownloadEntry = Array.from(activeDownloaders.entries()).find(([id, data]) => data.fileName === downloader.fileName);
                    if (existingDownloadEntry) {
                        activeDownloaders.delete(existingDownloadEntry[0]);
                    }
                }
            }
            reject("error");
        }
    });
}

export function cancelDownload(downloadId) {
    const downloadEntry = activeDownloaders.get(downloadId);
    if (downloadEntry && downloadEntry.downloader) {
        try {
            downloadEntry.downloader.closeAndDeleteFile();
            activeDownloaders.delete(downloadId);
            return true;
        } catch (error) {
            console.error('Error cancelling download:', error);
            return false;
        }
    }
    return false;
}