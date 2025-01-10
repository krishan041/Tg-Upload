import { downloadFile, DownloadStatus } from 'ipull';
import { extractFiles } from './extract.js';

function isValidUrl(url) {
    try {
        new URL(url); // Throws an error if the URL is invalid
        return true;
    } catch (error) {
        return false;
    }
}

export async function checkFilename(urlLink) {
    // Validate the URL before proceeding
    if (!isValidUrl(urlLink)) {
        console.error('Invalid URL:', urlLink);
        return null;
    }

    let downloader = null; // Define downloader outside of try block to ensure scope availability in catch
    try {
        const config = {
            url: urlLink,
            directory: './downloads', // or 'savePath' for full path
            cliProgress: true, // Show progress bar in the CLI (default: false)
            parallelStreams: 3, // Number of parallel connections (default: 3)
        };

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Timeout exceeded')), 10000) // 10 seconds timeout
        );

        const downloaderPromise = downloadFile(config);

        // Use Promise.race to trigger the timeout or downloader promise whichever resolves first
        downloader = await Promise.race([downloaderPromise, timeoutPromise]);

        // Ensure the filename is available
        if (!downloader.fileName) {
            throw new Error('Filename not available after download.');
        }

        return downloader.fileName;
    } catch (error) {
        console.error('Error:', error);

        // If there's a downloader instance and it has a closeAndDeleteFile method, clean up the file
        if (downloader && downloader.closeAndDeleteFile) {
            await downloader.closeAndDeleteFile();
        }

        return 'failed'; // Return 'failed' in case of error or timeout
    }
}



export async function downloadWithLogging(url, directory, parallelStreams = 3, extract, callback) {
    return new Promise(async (resolve, reject) => {
        try {
            const downloader = await downloadFile({
                url: url,
                directory: directory,
                parallelStreams: parallelStreams
            });

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

                // Call the callback with the logs
                if (callback) {
                    callback(logs);
                }

                if (status.downloadStatus === "Finished") {
                    clearInterval(interval); // Stop the interval when download is finished
                    if(fileName.includes('.zip') && (extract===true)) {
                        console.log("extrating file")
                        const path=await extractFiles(fileName);
                        console.log(`Extracted ${fileName}`);
                        clearInterval(interval); // Stop the interval when extraction is finished
                        resolve(path)
                    }
                    resolve(fileName); // Resolve the promise with "download"
                }
            }, 1000);
        } catch (error) {
            console.log(error);
            reject("error"); // Reject the promise if there's an error
        }
    });
}
