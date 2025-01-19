import { RateLimiterMemory } from 'rate-limiter-flexible';

// Strict URL validation function
export function validateUrl(url) {
    try {
        const parsedUrl = new URL(url);
        const allowedProtocols = ['http:', 'https:'];
        
        // Check protocol
        if (!allowedProtocols.includes(parsedUrl.protocol)) {
            return false;
        }

        // Optional: Additional checks like domain validation, length restrictions
        const maxUrlLength = 2048; // Standard max URL length
        if (parsedUrl.toString().length > maxUrlLength) {
            return false;
        }

        return true;
    } catch (error) {
        return false;
    }
}

// Rate limiter for Telegram bot interactions
export const telegramRateLimiter = new RateLimiterMemory({
    points: 10,     // Number of actions allowed
    duration: 60,   // Per 60 seconds
    blockDuration: 60 * 15 // Block for 15 minutes if limit exceeded
});

// Input sanitization function
export function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters and HTML/script tags
    return input
        .replace(/</g, '&lt;')   // Escape HTML tags
        .replace(/>/g, '&gt;')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .trim();
}

// IP Blocklist management
export class IPBlocklist {
    constructor() {
        this.blockedIPs = new Set();
    }

    blockIP(ip) {
        this.blockedIPs.add(ip);
    }

    unblockIP(ip) {
        this.blockedIPs.delete(ip);
    }

    isBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    clearBlocklist() {
        this.blockedIPs.clear();
    }
}

// Placeholder for future malware scanning
export async function scanFileForMalware(filePath) {
    // TODO: Implement actual malware scanning
    // This could integrate with services like VirusTotal, ClamAV, etc.
    return true; // Default to safe until implementation
}

// Secure token generation
export function generateSessionToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}
import crypto from 'crypto';
