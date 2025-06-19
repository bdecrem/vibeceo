/**
 * Enhanced logging for production debugging
 * Extracted from monitor.py log_with_timestamp function
 */

export function logWithTimestamp(message) {
    const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    console.log(`[${timestamp}] ${message}`);
    // Flush output for Railway logs
    if (process.stdout && process.stdout.flush) {
        process.stdout.flush();
    }
}

// Convenience methods for different log levels
export function logInfo(message) {
    logWithTimestamp(`ℹ️ ${message}`);
}

export function logSuccess(message) {
    logWithTimestamp(`✅ ${message}`);
}

export function logWarning(message) {
    logWithTimestamp(`⚠️ ${message}`);
}

export function logError(message) {
    logWithTimestamp(`❌ ${message}`);
}

export function logDebug(message) {
    logWithTimestamp(`🔧 ${message}`);
}

export function logStartup(message) {
    logWithTimestamp(`🚀 ${message}`);
}

export function logProcess(message) {
    logWithTimestamp(`🔄 ${message}`);
}

// Startup logging helper
export function logStartupInfo(webAppUrl, wtafDomain, webOutputDir) {
    logStartup("Monitor engine starting up...");
    logWithTimestamp(`📁 Current working directory: ${process.cwd()}`);
    logWithTimestamp(`🌐 WEB_APP_URL: ${webAppUrl}`);
    logWithTimestamp(`🌐 WTAF_DOMAIN: ${wtafDomain}`);
    logWithTimestamp(`📂 WEB_OUTPUT_DIR: ${webOutputDir}`);
} 