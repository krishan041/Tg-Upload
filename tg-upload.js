import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import fs from 'fs';
import mime from 'mime-types';
import ffmpeg from 'fluent-ffmpeg'; // For extracting video dimensions
import { getBot,initBot } from './bot.js';
import path from 'path';
dotenv.config();
 // List of files you want to upload

// Function to get video dimensions (width & height)
function getVideoDimensions(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) {
                reject(err);
            } else {
                const { width, height } = metadata.streams[0];
                resolve({ width, height });
            }
        });
    });
}

// Function to auto-detect if file is audio or video based on extension or MIME type
function detectMediaType(filePath) {
    const mimeType = mime.lookup(filePath);

    if (mimeType) {
        if (mimeType.startsWith('audio/')) {
            return 'audio';
        } else if (mimeType.startsWith('video/')) {
            return 'video';
        }
    }

    // If unable to detect, assume it's a document
    return 'document';
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));


// Main function to upload multiple files as documents (one by one)
export async function uploadFilesOneByOne(chatId, filesName, uploadType) {
    console.log('im from uploading scripts...');
    console.log(filesName)
    const bot = getBot();

    for (let i = 0; i < filesName.length; i++) {
        const filePath = filesName[i];
        const fileMime = mime.lookup(filePath); // Get MIME type for each file
        let retryCount = 0;
        const maxRetries = 5;
        console.log("filepath: " + typeof(filePath))
        console.log("filepath: " + filePath)
        const shortFilePath = filePath.substring(10);


        while (retryCount < maxRetries) {
            try {
                if (uploadType === 'document') {
                    // Send the file as a document
                    await bot.sendDocument(chatId, filePath, { caption: shortFilePath, mime_type: fileMime });
                } else if (uploadType === 'mediaType') {
                    // Auto-detect the media type
                    const mediaType = detectMediaType(filePath);

                    if (mediaType === 'document') {
                        // Send as a document if it is not audio/video
                        await bot.sendDocument(chatId, filePath, { caption: shortFilePath, mime_type: fileMime });
                    } else if (mediaType === 'audio') {
                        // Send as audio
                        await bot.sendAudio(chatId, filePath, { caption: shortFilePath });
                    } else if (mediaType === 'video') {
                        // Get video dimensions if it's a video
                        const { width, height } = await getVideoDimensions(filePath);
                        await bot.sendVideo(chatId, filePath, { caption: shortFilePath, width, height });
                    }
                }

                console.log(`File ${filePath} sent successfully as ${uploadType}.`);
                break; // Exit the retry loop if successful
            } catch (error) {
                retryCount++;
                console.error(`Error sending file ${filePath} (Attempt ${retryCount}):`, error);

                if (error.code === 'ETELEGRAM' && error.response.statusCode === 400) {
                    const retryAfter = error.response.headers['retry-after'] || Math.pow(2, retryCount); // Exponential backoff
                    console.log(`Rate limit hit. Retrying after ${retryAfter} seconds...`);
                    await delay(retryAfter * 1000);
                } else {
                    break; // Exit the retry loop if the error is not related to rate limiting
                }
            }
        }

        await delay(8000); // Add a delay of 8 seconds between each upload
    }
}

// Main function to upload multiple files concurrently (using Promise.all)
export async function uploadFilesConcurrently(chatId, filesName, uploadType) {
    const bot = getBot();
    try {
        // Create an array of promises for sending documents in parallel
        const uploadPromises = filesName.map(async (filePath) => {
            const fileMime = mime.lookup(filePath); // Get MIME type for each file

            if (uploadType === 'document') {
                // Send the file as a document
                return bot.sendDocument(chatId, filePath, { caption: filePath, mime_type: fileMime });
            } else if (uploadType === 'mediaType') {
                // Auto-detect the media type
                const mediaType = detectMediaType(filePath);

                if (mediaType === 'document') {
                    // Send as document if detected as document
                    return bot.sendDocument(chatId, filePath, { caption: filePath, mime_type: fileMime });
                } else if (mediaType === 'audio') {
                    // Send as audio
                    return bot.sendAudio(chatId, filePath, { caption: filePath });
                } else if (mediaType === 'video') {
                    // Get video dimensions if it's a video
                    const { width, height } = await getVideoDimensions(filePath);
                    return bot.sendVideo(chatId, filePath, { caption: filePath, width, height });
                }
            }
        });

        // Use Promise.all to send all files concurrently
        const results = await Promise.all(uploadPromises);

        // Log success
        results.forEach((result, index) => {
            console.log(`File ${filesName[index]} sent successfully.`);
        });
    } catch (error) {
        console.error('Error sending files concurrently:', error);
    }
}

// Function to upload all files from a directory (one by one)

export const uploadDirectoryOneByOne = async (chatId, directoryPath, uploadType) => {
    console.log("from tg uploadDirectoryOneByOne", chatId, directoryPath)
    const files = fs.readdirSync(directoryPath);
    const bot = getBot();

    for (const file of files) {
        const filePath = path.join(directoryPath, file);
        const fileMime = mime.lookup(filePath); // Detect MIME type
        let retryCount = 0;
        const maxRetries = 5;

        while (retryCount < maxRetries) {
            try {
                if (uploadType === 'document') {
                    // Send as document regardless of file type
                    await bot.sendDocument(chatId, filePath, { caption: file, mime_type: fileMime });
                } else if (uploadType === 'mediaType') {
                    // Auto-detect the media type and send accordingly
                    const mediaType = detectMediaType(filePath);

                    if (mediaType === 'document') {
                        await bot.sendDocument(chatId, filePath, { caption: file, mime_type: fileMime });
                    } else if (mediaType === 'audio') {
                        await bot.sendAudio(chatId, filePath, { caption: file });
                    } else if (mediaType === 'video') {
                        const { width, height } = await getVideoDimensions(filePath);
                        await bot.sendVideo(chatId, filePath, { caption: file, width, height });
                    }
                }

                console.log(`File ${filePath} sent successfully from directory as ${uploadType}.`);
                break; // Exit the retry loop if successful
            } catch (error) {
                retryCount++;
                console.error(`Error sending file ${filePath} (Attempt ${retryCount}):`, error);

                if (error.code === 'ETELEGRAM' && error.response.statusCode === 400) {
                    const retryAfter = error.response.headers['retry-after'] || Math.pow(2, retryCount); // Exponential backoff
                    console.log(`Rate limit hit. Retrying after ${retryAfter} seconds...`);
                    await delay(retryAfter * 1000);
                } else {
                    break; // Exit the retry loop if the error is not related to rate limiting
                }
            }
        }

        await delay(8000); // Add a delay of 8 seconds between each upload
    }
};

// Function to upload all files from a directory (concurrently)
export async function uploadDirectoryConcurrently(chatId, directoryPath, uploadType) {
    const bot = getBot();
    try {
        const files = fs.readdirSync(directoryPath); // Get all files in the directory

        const uploadPromises = files.map(async (fileName) => {
            const filePath = `${directoryPath}/${fileName}`;
            const fileMime = mime.lookup(filePath); // Detect MIME type

            if (uploadType === 'document') {
                return bot.sendDocument(chatId, filePath, { caption: fileName, mime_type: fileMime });
            } else if (uploadType === 'mediaType') {
                // Auto-detect the media type
                const mediaType = detectMediaType(filePath);

                if (mediaType === 'document') {
                    return bot.sendDocument(chatId, filePath, { caption: fileName, mime_type: fileMime });
                } else if (mediaType === 'audio') {
                    return bot.sendAudio(chatId, filePath, { caption: fileName });
                } else if (mediaType === 'video') {
                    const { width, height } = await getVideoDimensions(filePath);
                    return bot.sendVideo(chatId, filePath, { caption: fileName, width, height });
                }
            }
        });

        // Send all files concurrently
        const results = await Promise.all(uploadPromises);

        // Log success
        results.forEach((result, index) => {
            console.log(`File ${files[index]} sent successfully from directory.`);
        });
    } catch (error) {
        console.error('Error sending files from directory concurrently:', error);
    }
}
