import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { startBot } from '../dist/lib/discord/bot.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

// Create log file with timestamp
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFile = path.join(logsDir, `bot-log-${timestamp}.txt`);

// Write initial timestamp
fs.writeFileSync(logFile, `=== Bot Started at ${new Date().toISOString()} ===\n\n`);

// Capture console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function() {
    const output = Array.from(arguments).join(' ') + '\n';
    fs.appendFileSync(logFile, output);
    originalConsoleLog.apply(console, arguments);
};

console.error = function() {
    const output = 'ERROR: ' + Array.from(arguments).join(' ') + '\n';
    fs.appendFileSync(logFile, output);
    originalConsoleError.apply(console, arguments);
};

// Environment detection and node flags
const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables from .env.local
if (!isProduction) {
    dotenv.config({ path: '.env.local' });
}

// Start the bot
startBot().catch(error => {
    console.error('Bot error:', error);
    process.exit(1);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    const message = 'Received SIGTERM signal. Starting graceful shutdown...\n';
    fs.appendFileSync(logFile, message);
    console.log(message);
    cleanup();
});

process.on('SIGINT', () => {
    const message = 'Received SIGINT signal. Starting graceful shutdown...\n';
    fs.appendFileSync(logFile, message);
    console.log(message);
    cleanup();
});

async function cleanup() {
    const message = 'Cleaning up...\n';
    fs.appendFileSync(logFile, message);
    console.log(message);
    try {
        const { cleanup: handlersCleanup } = await import('../dist/lib/discord/handlers.js');
        await handlersCleanup();
        const completedMessage = 'Cleanup completed\n';
        fs.appendFileSync(logFile, completedMessage);
        console.log(completedMessage);
        process.exit(0);
    } catch (error) {
        const errorMessage = `Error during cleanup: ${error}\n`;
        fs.appendFileSync(logFile, errorMessage);
        console.error(errorMessage);
        process.exit(1);
    }
} 