// bot.js
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';

dotenv.config();

let bot = null;

export function initBot() {
    if (!bot) {
        bot = new TelegramBot(process.env.TOKEN, {
            polling: true,
            baseApiUrl: 'http://localhost:8081',
        });

        bot.on('error', (error) => {
            console.error('Telegram bot error:', error);
        });

        process.on('SIGINT', async () => {
            console.log('Stopping bot polling...');
            await bot.stopPolling();
            process.exit(0);
        });
    }
    return bot;
}

export function getBot() {
    if (!bot) {
        throw new Error('Bot not initialized. Call initBot() first.');
    }
    return bot;
}