/**
 * Enhanced logging for production debugging
 * Extracted from monitor.py log_with_timestamp function
 * Now includes file logging with daily rotation
 */

import { appendFileSync, existsSync, statSync, renameSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log file configuration
const LOG_DIR = join(__dirname, '..', '..', '..', 'logs');
const LOG_FILE = join(LOG_DIR, 'wtaf-engine.log');
const LOG_FILE_OLD = join(LOG_DIR, 'wtaf-engine.old.log');
const MAX_LOG_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Ensure log directory exists
if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Check if log file needs rotation (older than 24 hours)
 */
function checkLogRotation(): void {
    try {
        if (existsSync(LOG_FILE)) {
            const stats = statSync(LOG_FILE);
            const fileAge = Date.now() - stats.birthtimeMs;
            
            if (fileAge > MAX_LOG_AGE_MS) {
                // Rotate the log file
                if (existsSync(LOG_FILE_OLD)) {
                    // Delete the old backup
                    require('fs').unlinkSync(LOG_FILE_OLD);
                }
                renameSync(LOG_FILE, LOG_FILE_OLD);
                console.log(`[LOG ROTATION] Rotated log file after ${(fileAge / 1000 / 60 / 60).toFixed(1)} hours`);
            }
        }
    } catch (error) {
        console.error('Error checking log rotation:', error);
    }
}

// Check rotation on module load
checkLogRotation();

/**
 * Write message to log file
 */
function writeToLogFile(formattedMessage: string): void {
    try {
        appendFileSync(LOG_FILE, formattedMessage + '\n', 'utf8');
    } catch (error) {
        // Silently fail if we can't write to log file
        // We don't want logging to break the application
    }
}

export function logWithTimestamp(message: string): void {
    const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const formattedMessage = `[${timestamp}] ${message}`;
    
    // Write to console
    console.log(formattedMessage);
    
    // Write to file
    writeToLogFile(formattedMessage);
    
    // Flush output for Railway logs
    if (process.stdout && 'flush' in process.stdout && typeof process.stdout.flush === 'function') {
        (process.stdout as any).flush();
    }
}

// Convenience methods for different log levels
export function logInfo(message: string): void {
    logWithTimestamp(`ℹ️ ${message}`);
}

export function logSuccess(message: string): void {
    logWithTimestamp(`✅ ${message}`);
}

export function logWarning(message: string): void {
    logWithTimestamp(`⚠️ ${message}`);
}

export function logError(message: string): void {
    logWithTimestamp(`❌ ${message}`);
}

export function logDebug(message: string): void {
    logWithTimestamp(`🔧 ${message}`);
}

export function logStartup(message: string): void {
    logWithTimestamp(`🚀 ${message}`);
}

export function logProcess(message: string): void {
    logWithTimestamp(`🔄 ${message}`);
}

// Startup logging helper
export function logStartupInfo(webAppUrl: string, wtafDomain: string, webOutputDir: string): void {
    logStartup("Monitor engine starting up...");
    logWithTimestamp(`📁 Current working directory: ${process.cwd()}`);
    logWithTimestamp(`🌐 WEB_APP_URL: ${webAppUrl}`);
    logWithTimestamp(`🌐 WTAF_DOMAIN: ${wtafDomain}`);
    logWithTimestamp(`📂 WEB_OUTPUT_DIR: ${webOutputDir}`);
} 