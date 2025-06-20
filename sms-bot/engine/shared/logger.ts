/**
 * Enhanced logging for production debugging
 * Extracted from monitor.py log_with_timestamp function
 */

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
    
    console.log(`[${timestamp}] ${message}`);
    // Flush output for Railway logs
    // Note: flush() may not be available in all Node.js environments
    if (process.stdout && 'flush' in process.stdout && typeof (process.stdout as any).flush === 'function') {
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