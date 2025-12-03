const fs = require('fs-extra');
const path = require('path');

class Logger {
  constructor() {
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.activityLog = path.join(this.logsDir, 'activity.log');
    this.errorLog = path.join(this.logsDir, 'errors.log');
    
    // Ensure logs directory exists
    fs.ensureDirSync(this.logsDir);
  }

  getTimestamp() {
    return new Date().toISOString();
  }

  formatLogEntry(level, message, metadata = {}) {
    return JSON.stringify({
      timestamp: this.getTimestamp(),
      level,
      message,
      ...metadata
    }) + '\n';
  }

  async logActivity(message, metadata = {}) {
    try {
      const logEntry = this.formatLogEntry('INFO', message, metadata);
      await fs.appendFile(this.activityLog, logEntry);
      console.log(`[INFO] ${message}`);
    } catch (error) {
      console.error('Failed to write to activity log:', error);
    }
  }

  async logError(message, error = null, metadata = {}) {
    try {
      const errorData = {
        ...metadata,
        errorMessage: error?.message,
        errorStack: error?.stack
      };
      const logEntry = this.formatLogEntry('ERROR', message, errorData);
      
      // Write to both error log and activity log
      await fs.appendFile(this.errorLog, logEntry);
      await fs.appendFile(this.activityLog, logEntry);
      
      console.error(`[ERROR] ${message}`, error?.message || '');
    } catch (writeError) {
      console.error('Failed to write to error log:', writeError);
    }
  }

  async logSuccess(message, metadata = {}) {
    try {
      const logEntry = this.formatLogEntry('SUCCESS', message, metadata);
      await fs.appendFile(this.activityLog, logEntry);
      console.log(`[SUCCESS] ${message}`);
    } catch (error) {
      console.error('Failed to write to activity log:', error);
    }
  }

  async logWarning(message, metadata = {}) {
    try {
      const logEntry = this.formatLogEntry('WARNING', message, metadata);
      await fs.appendFile(this.activityLog, logEntry);
      console.warn(`[WARNING] ${message}`);
    } catch (error) {
      console.error('Failed to write to activity log:', error);
    }
  }

  // Get recent logs for monitoring
  async getRecentLogs(logType = 'activity', lines = 50) {
    try {
      const logFile = logType === 'error' ? this.errorLog : this.activityLog;
      const content = await fs.readFile(logFile, 'utf8');
      const allLines = content.trim().split('\n');
      return allLines.slice(-lines).join('\n');
    } catch (error) {
      return `No logs found or error reading logs: ${error.message}`;
    }
  }
}

module.exports = new Logger();