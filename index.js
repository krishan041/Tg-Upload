// index.js
import { initBot } from './bot.js';
import { downloadWithLogging, cancelDownload,checkFilename, activeDownloaders } from './download-files.js';
import { uploadDirectoryOneByOne, uploadFilesOneByOne } from "./tg-upload.js";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

const downloadsDirectory = process.env.DOWNLOAD_PATH;
const extractsDirectory = process.env.EXTRACT_PATH;
const parallelStreams = 3;

// Initialize the bot
const bot = initBot();

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

// Function to send initial message and return the message ID
let messageId = null;
const sendInitialMessage = async (chatId) => {
    const initialMessage = 'Download started...';
    const sentMessage = await bot.sendMessage(chatId, initialMessage, { parse_mode: 'Markdown' });
    messageId = sentMessage.message_id;
};

const escapeMarkdown = (text) => {
    return text
        .replace(/([_*[\]()~`>#+\-=|{}.!])/, '\\$1');
};

let lastLogMessage = '';

const updateDownloadLog = (chatId, logs) => {
    const cleanTransferred = logs.transferred.replace(/\\/g, '');
    const cleanSpeed = logs.speed.replace(/\\/g, '');
    const cleanTimeLeft = logs.timeLeft.replace(/\\/g, '');
    const cleanPercentage = logs.percentage.replace(/\\/g, '');

    const logMessage = `*File Name:* \`${escapeMarkdown(logs.fileName)}\`\n` +
        `*Action:* ${escapeMarkdown(logs.transferAction)}\n` +
        `*Status:* ${logs.downloadStatus === 'Active' ? '▶️ In Progress' : '✅ Finished'}\n` +
        `*Transferred:* ${cleanTransferred}\n` +
        `*Speed:* ${cleanSpeed}\n` +
        `*Time Left:* ${cleanTimeLeft}\n` +
        `*Percentage:* ${cleanPercentage}%`;

    // Find the download ID associated with this filename
    const downloadEntry = Array.from(activeDownloaders.entries()).find(([id, data]) => data.fileName === logs.fileName);
    let downloadId = null;
    if (downloadEntry) {
        downloadId = downloadEntry[0];
    }

    const inlineKeyboard = {
        inline_keyboard: [[
            {
                text: '❌ Cancel Download',
                callback_data: `cancel_${downloadId}` // Use the unique ID
            }
        ]]
    };

    if (logMessage !== lastLogMessage) {
        if (messageId) {
            bot.editMessageText(logMessage, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: inlineKeyboard
            }).catch((err) => {
                console.error('Failed to edit message:', err);
            });
        }
        lastLogMessage = logMessage;
    }
};


const askQuestion = async (chatId, question, options) => {
    const keyboard = options.map(option => [{
        text: option,
        callback_data: option
    }]);

    const message = await bot.sendMessage(chatId, question, {
        reply_markup: {
            inline_keyboard: keyboard
        }
    });

    return new Promise((resolve) => {
        bot.once('callback_query', (query) => {
            bot.answerCallbackQuery(query.id);
            bot.deleteMessage(chatId, message.message_id);
            resolve(query.data);
        });
    });
};

const deleteAllFilesAndDirectories = (dirPath) => {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteAllFilesAndDirectories(curPath);
            } else {
                fs.unlinkSync(curPath);
                console.log(`Deleted file: ${curPath}`);
            }
        });
        fs.rmdirSync(dirPath);
        console.log(`Deleted directory: ${dirPath}`);
    } else {
        console.log(`Directory does not exist: ${dirPath}`);
    }
};

bot.on('callback_query', async (query) => {
    const data = query.data;
    if (data.startsWith('cancel_')) {
        const downloadId = data.replace('cancel_', ''); // Extract the unique ID
        if (cancelDownload(downloadId)) { // Pass the ID to cancelDownload
            await bot.editMessageText(
                `Download cancelled.`,
                {
                    chat_id: query.message.chat.id,
                    message_id: query.message.message_id,
                    parse_mode: 'Markdown'
                }
            );
            await bot.answerCallbackQuery(query.id, {
                text: 'Download cancelled successfully'
            });
        } else {
            await bot.answerCallbackQuery(query.id, {
                text: 'Download not found or already finished'
            });
        }
    }
});


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (urlPattern.test(msg.text)) {
        bot.sendMessage(chatId, 'Okay! This is a valid link. Please wait...');
        const fileName = await checkFilename(msg.text);
        
        if (fileName !== "failed") {
            bot.sendMessage(chatId, `File name: ${fileName}`);
            
            try {
                if (fileName.includes('.zip')) {
                    const extractChoice = await askQuestion(
                        chatId,
                        'Do you want to extract the zip file?',
                        ['Yes', 'No']
                    );
                    
                    let uploadType = await askQuestion(
                        chatId,
                        'How would you like to receive the files?',
                        ['Document', 'Media']
                    );
                    
                    uploadType = uploadType === 'Document' ? 'document' : 'mediaType';
                    
                    bot.sendMessage(chatId, `Your choice is ${uploadType} and extract: ${extractChoice === 'Yes'}`);
                    
                    await sendInitialMessage(chatId);
                    
                    try {
                        const path = await downloadWithLogging(msg.text, downloadsDirectory, parallelStreams, extractChoice === 'Yes', async(logs) => {
                            await delay(5000);
                            updateDownloadLog(chatId, logs);
                        });
                        
                        console.log("Return logs:", path);
                        console.log("Finished downloading file and extracting...");
                        bot.sendMessage(chatId, "Sending the file...");
                        
                        if (extractChoice === 'Yes') {
                            const extractPath = `${extractsDirectory}/${path}`;
                            await uploadDirectoryOneByOne(chatId, extractPath, uploadType);
                        } else {
                            const fileName1 = [`${downloadsDirectory}/${fileName}`];
                            await uploadFilesOneByOne(chatId, fileName1, uploadType);
                        }
                        
                        deleteAllFilesAndDirectories(downloadsDirectory);
                        deleteAllFilesAndDirectories(extractsDirectory);
                        
                        bot.sendMessage(chatId, "Upload complete. All files and directories have been cleaned up.");
                    } catch (error) {
                        if (error === "cancelled") {
                            bot.sendMessage(chatId, "Download was cancelled by user.");
                        } else {
                            console.error("Download error:", error);
                            bot.sendMessage(chatId, "An error occurred during download.");
                        }
                        // Clean up directories even if download failed or was cancelled
                        deleteAllFilesAndDirectories(downloadsDirectory);
                        deleteAllFilesAndDirectories(extractsDirectory);
                    }
                } else {
                    const extractChoice = 'No';
                    bot.sendMessage(chatId, 'This is not a zip file.');
                    let uploadType = await askQuestion(
                        chatId,
                        'How would you like to receive the files?',
                        ['Document', 'Media']
                    );
                    
                    uploadType = uploadType === 'Document' ? 'document' : 'mediaType';
                    
                    bot.sendMessage(chatId, `Your choice is ${uploadType} and extract: ${extractChoice === 'Yes'}`);
                    
                    await sendInitialMessage(chatId);
                    
                    try {
                        const path = await downloadWithLogging(msg.text, downloadsDirectory, parallelStreams, extractChoice === 'Yes', async(logs) => {
                            await delay(5000);
                            updateDownloadLog(chatId, logs);
                        });
                        
                        console.log("Return logs:", path);
                        console.log("Finished downloading file and extracting...");
                        bot.sendMessage(chatId, "Sending the file...");
                        
                        const fileName1 = [`${downloadsDirectory}/${fileName}`];
                        await uploadFilesOneByOne(chatId, fileName1, uploadType);
                        
                        deleteAllFilesAndDirectories(downloadsDirectory);
                        deleteAllFilesAndDirectories(extractsDirectory);
                        
                        bot.sendMessage(chatId, "Upload complete. All files and directories have been cleaned up.");
                    } catch (error) {
                        if (error === "cancelled") {
                            bot.sendMessage(chatId, "Download was cancelled by user.");
                        } else {
                            console.error("Download error:", error);
                            bot.sendMessage(chatId, "An error occurred during download.");
                        }
                        // Clean up directories even if download failed or was cancelled
                        deleteAllFilesAndDirectories(downloadsDirectory);
                        deleteAllFilesAndDirectories(extractsDirectory);
                    }
                }
            } catch (error) {
                console.error("General error:", error);
                bot.sendMessage(chatId, "An error occurred while processing your request.");
                deleteAllFilesAndDirectories(downloadsDirectory);
                deleteAllFilesAndDirectories(extractsDirectory);
            }
        } else {
            bot.sendMessage(chatId, 'File download failed due to timeout or error.');
        }
    } else {
        bot.sendMessage(chatId, 'Please send a valid link.');
    }
});