import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import winston from 'winston';
import { validateUrl, telegramRateLimiter, IPBlocklist } from './security.js';

dotenv.config();

let bot = null;
let botInitTime = null;
const ipBlocklist = new IPBlocklist();

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'bot-errors.log', level: 'error' }),
        new winston.transports.File({ filename: 'bot-combined.log' })
    ]
});

export function initBot() {
    if (!bot) {
        bot = new TelegramBot(process.env.TOKEN, {
            polling: {
                autoStart: true,
                interval: 1000,
                params: {
                    timeout: 10
                }
            },
            baseApiUrl: process.env.BASE_API_URL || 'http://localhost:8081',
            request: {
                timeout: 30000 // 30 seconds timeout
            }
        });

        botInitTime = Date.now();

        // Enhanced error handling
        bot.on('error', (error) => {
            logger.error('Telegram bot critical error', { 
                error: error.message, 
                stack: error.stack 
            });
        });

        // Advanced message filtering and rate limiting
        const originalOnMessage = bot.on;
        bot.on = function(event, handler) {
            if (event === 'message') {
                originalOnMessage.call(bot, event, async (msg) => {
                    // Check message timestamp
                    if (msg.date * 1000 >= botInitTime) {
                        try {
                            // Rate limit per user
                            await telegramRateLimiter.consume(msg.from.id.toString());

                            // IP-based blocking
                            const userIp = msg.from.ip || 'unknown';
                            if (ipBlocklist.isBlocked(userIp)) {
                                logger.warn(`Blocked message from blocked IP: ${userIp}`);
                                return;
                            }

                            handler(msg);
                        } catch (rateLimitError) {
                            logger.warn(`Rate limit exceeded for user ${msg.from.id}`);
                            bot.sendMessage(msg.chat.id, 'Too many requests. Please slow down.');
                        }
                    }
                });
            } else {
                originalOnMessage.apply(bot, arguments);
            }
        };

        // Graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Initiating bot shutdown');
            await bot.stopPolling();
            process.exit(0);
        });

        // Periodic health checks
        setInterval(() => {
            if (!bot.isPolling()) {
                logger.warn('Bot polling stopped unexpectedly. Restarting...');
                bot.startPolling();
            }
        }, 60000); // Check every minute
    }
    return bot;
}

export function getBot() {
    if (!bot) {
        throw new Error('Bot not initialized. Call initBot() first.');
    }
    return bot;
}

export function getBotInitTime() {
    return botInitTime;
}

export function blockUserIP(ip) {
    ipBlocklist.blockIP(ip);
    logger.warn(`IP blocked: ${ip}`);
}

export function unblockUserIP(ip) {
    ipBlocklist.unblockIP(ip);
    logger.info(`IP unblocked: ${ip}`);
}
