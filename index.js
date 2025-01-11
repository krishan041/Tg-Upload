// index.js
import { initBot } from './bot.js';
import { downloadWithLogging, checkFilename } from './download-files.js';
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
    messageId = sentMessage.message_id; // Save message ID for future updates
};

const escapeMarkdown = (text) => {
    return text
        .replace(/([_*[\]()~`>#+\-=|{}.!])/, '\\$1'); // Escape special Markdown characters
};

let lastLogMessage = '';  // Variable to store the last log message

// Function to update the log message in real-time
const updateDownloadLog = (chatId, logs) => {
    // Clean up unnecessary backslashes in file size and other numbers
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

    // Check if the new message is different from the last one
    if (logMessage !== lastLogMessage) {
        if (messageId) {
            bot.editMessageText(logMessage, {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
            }).catch((err) => {
                console.error('Failed to edit message:', err);
            });
        }
        // Update the lastLogMessage with the new message content
        lastLogMessage = logMessage;
    }
};



// Function to ask a question with inline keyboard
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

// Function to delete all files and directories in a given directory
const deleteAllFilesAndDirectories = (dirPath) => {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                // Recursively delete directories
                deleteAllFilesAndDirectories(curPath);
            } else {
                // Delete files
                fs.unlinkSync(curPath);
                console.log(`Deleted file: ${curPath}`);
            }
        });
        // Remove the directory itself
        fs.rmdirSync(dirPath);
        console.log(`Deleted directory: ${dirPath}`);
    } else {
        console.log(`Directory does not exist: ${dirPath}`);
    }
};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;

    if (urlPattern.test(msg.text)) {
        bot.sendMessage(chatId, 'Okay! This is a valid link. Please wait...');
        const fileName = await checkFilename(msg.text);
        
        if (fileName !== "failed") { // Corrected the condition here

            bot.sendMessage(chatId, `File name: ${fileName}`);
            
            if (fileName.includes('.zip')) {
                // Ask for extraction preference
                const extractChoice = await askQuestion(
                    chatId,
                    'Do you want to extract the zip file?',
                    ['Yes', 'No']
                );
                
                // Ask for upload type
                let uploadType = await askQuestion(
                    chatId,
                    'How would you like to receive the files?',
                    ['Document', 'Media']
                );
                
                uploadType = uploadType === 'Document' ? 'document' : 'mediaType';
                
                bot.sendMessage(chatId, `Your choice is ${uploadType} and extract: ${extractChoice === 'Yes'}`);
                
                // Send the initial download message and start download
                await sendInitialMessage(chatId);
                
                const path = await downloadWithLogging(msg.text, downloadsDirectory, parallelStreams, extractChoice === 'Yes', async(logs) => {
                    // console.log('Logs:', logs);
                    await delay(5000)
                    // Update the Telegram message with the download progress
                    updateDownloadLog(chatId, logs);
                });
                
                console.log("Return logs:", path);
                console.log("Finished downloading file and extracting...");
                bot.sendMessage(chatId, "Sending the file...");
                
                // Handle upload logic
                if (extractChoice === 'Yes') {
                    const extractPath = `${extractsDirectory}/${path}`;
                    await uploadDirectoryOneByOne(chatId, extractPath, uploadType);
                } else {
                    const fileName1 = [`${downloadsDirectory}/${fileName}`];
                    await uploadFilesOneByOne(chatId, fileName1, uploadType);
                }
                
                // Clean up both directories after successful upload
                deleteAllFilesAndDirectories(downloadsDirectory);
                deleteAllFilesAndDirectories(extractsDirectory);
                
                bot.sendMessage(chatId, "Upload complete. All files and directories have been cleaned up.");
            }
        } else {
            bot.sendMessage(chatId, 'File download failed due to timeout or error.');
        }
    } else {
        bot.sendMessage(chatId, 'Please send a valid link.');
    }
});
