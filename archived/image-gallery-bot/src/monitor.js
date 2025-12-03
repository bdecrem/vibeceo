const fs = require('fs-extra');
const path = require('path');
const logger = require('./logger');

class SystemMonitor {
  constructor() {
    this.configPath = path.join(__dirname, '..', 'config.json');
    this.galleriesDir = path.join(__dirname, '..', 'galleries');
    this.imagesDir = path.join(__dirname, '..', 'images');
    this.logsDir = path.join(__dirname, '..', 'logs');
    this.thresholds = {
      maxLogSize: 50 * 1024 * 1024, // 50MB
      minFreeSpace: 100 * 1024 * 1024, // 100MB
      maxGalleryAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      maxImageAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      staleThreshold: 2 * 60 * 60 * 1000 // 2 hours
    };
  }

  async getSystemStatus() {
    const status = {
      timestamp: new Date().toISOString(),
      healthy: true,
      issues: [],
      metrics: {}
    };

    try {
      // Check config file
      const configStatus = await this.checkConfig();
      status.metrics.config = configStatus;
      if (!configStatus.healthy) {
        status.healthy = false;
        status.issues.push(...configStatus.issues);
      }

      // Check galleries
      const galleryStatus = await this.checkGalleries();
      status.metrics.galleries = galleryStatus;
      if (!galleryStatus.healthy) {
        status.healthy = false;
        status.issues.push(...galleryStatus.issues);
      }

      // Check disk space
      const diskStatus = await this.checkDiskSpace();
      status.metrics.disk = diskStatus;
      if (!diskStatus.healthy) {
        status.healthy = false;
        status.issues.push(...diskStatus.issues);
      }

      // Check logs
      const logStatus = await this.checkLogs();
      status.metrics.logs = logStatus;
      if (!logStatus.healthy) {
        status.healthy = false;
        status.issues.push(...logStatus.issues);
      }

      // Check last run time
      const runStatus = await this.checkLastRun();
      status.metrics.lastRun = runStatus;
      if (!runStatus.healthy) {
        status.healthy = false;
        status.issues.push(...runStatus.issues);
      }

    } catch (error) {
      status.healthy = false;
      status.issues.push({
        type: 'MONITOR_ERROR',
        message: `Monitor failed: ${error.message}`,
        severity: 'critical'
      });
    }

    return status;
  }

  async checkConfig() {
    const result = { healthy: true, issues: [] };

    try {
      const config = await fs.readJson(this.configPath);
      
      // Check required fields
      const requiredFields = ['currentTopic', 'topicQueue', 'maxImages', 'unsplashAccessKey'];
      for (const field of requiredFields) {
        if (!config[field]) {
          result.healthy = false;
          result.issues.push({
            type: 'CONFIG_MISSING_FIELD',
            message: `Missing required field: ${field}`,
            severity: 'critical'
          });
        }
      }

      // Check topic queue
      if (!Array.isArray(config.topicQueue) || config.topicQueue.length === 0) {
        result.healthy = false;
        result.issues.push({
          type: 'CONFIG_EMPTY_QUEUE',
          message: 'Topic queue is empty',
          severity: 'high'
        });
      }

      result.data = config;
    } catch (error) {
      result.healthy = false;
      result.issues.push({
        type: 'CONFIG_READ_ERROR',
        message: `Cannot read config: ${error.message}`,
        severity: 'critical'
      });
    }

    return result;
  }

  async checkGalleries() {
    const result = { healthy: true, issues: [], data: {} };

    try {
      const files = await fs.readdir(this.galleriesDir);
      const htmlFiles = files.filter(f => f.endsWith('.html') && f !== 'index.html');
      
      result.data.total = htmlFiles.length;
      result.data.recent = [];

      if (htmlFiles.length === 0) {
        result.issues.push({
          type: 'NO_GALLERIES',
          message: 'No galleries found',
          severity: 'medium'
        });
      }

      // Check recent galleries
      const now = Date.now();
      for (const file of htmlFiles) {
        const filepath = path.join(this.galleriesDir, file);
        const stats = await fs.stat(filepath);
        const age = now - stats.mtimeMs;

        if (age < 24 * 60 * 60 * 1000) { // Last 24 hours
          result.data.recent.push({
            file,
            created: stats.mtime,
            age: Math.floor(age / 1000 / 60) // minutes
          });
        }

        if (age > this.thresholds.maxGalleryAge) {
          result.issues.push({
            type: 'OLD_GALLERY',
            message: `Old gallery: ${file} (${Math.floor(age / 1000 / 60 / 60 / 24)} days old)`,
            severity: 'low',
            file,
            age
          });
        }
      }

      // Sort recent by creation time
      result.data.recent.sort((a, b) => b.created - a.created);

    } catch (error) {
      result.healthy = false;
      result.issues.push({
        type: 'GALLERY_CHECK_ERROR',
        message: `Cannot check galleries: ${error.message}`,
        severity: 'high'
      });
    }

    return result;
  }

  async checkDiskSpace() {
    const result = { healthy: true, issues: [], data: {} };

    try {
      // Calculate directory sizes
      const imageSize = await this.getDirectorySize(this.imagesDir);
      const gallerySize = await this.getDirectorySize(this.galleriesDir);
      const logSize = await this.getDirectorySize(this.logsDir);

      result.data = {
        images: this.formatBytes(imageSize),
        galleries: this.formatBytes(gallerySize),
        logs: this.formatBytes(logSize),
        total: this.formatBytes(imageSize + gallerySize + logSize)
      };

      // Check if logs are too large
      if (logSize > this.thresholds.maxLogSize) {
        result.healthy = false;
        result.issues.push({
          type: 'LOGS_TOO_LARGE',
          message: `Logs are too large: ${this.formatBytes(logSize)}`,
          severity: 'medium',
          size: logSize
        });
      }

    } catch (error) {
      result.issues.push({
        type: 'DISK_CHECK_ERROR',
        message: `Cannot check disk space: ${error.message}`,
        severity: 'medium'
      });
    }

    return result;
  }

  async checkLogs() {
    const result = { healthy: true, issues: [], data: {} };

    try {
      const logFiles = await fs.readdir(this.logsDir);
      result.data.files = logFiles;

      // Check each log file
      for (const file of logFiles) {
        const filepath = path.join(this.logsDir, file);
        const stats = await fs.stat(filepath);

        if (stats.size > this.thresholds.maxLogSize) {
          result.healthy = false;
          result.issues.push({
            type: 'LOG_FILE_TOO_LARGE',
            message: `${file} is too large: ${this.formatBytes(stats.size)}`,
            severity: 'medium',
            file,
            size: stats.size
          });
        }
      }

      // Check for error patterns in recent logs
      if (logFiles.includes('errors.log')) {
        const errorContent = await fs.readFile(
          path.join(this.logsDir, 'errors.log'), 
          'utf8'
        );
        const lines = errorContent.trim().split('\n').slice(-10); // Last 10 errors
        
        if (lines.length > 0 && lines[0] !== '') {
          result.data.recentErrors = lines.length;
          
          // Check for repeated errors
          const errorCounts = {};
          lines.forEach(line => {
            try {
              const parsed = JSON.parse(line);
              const key = parsed.message || 'Unknown error';
              errorCounts[key] = (errorCounts[key] || 0) + 1;
            } catch (e) {
              // Skip malformed lines
            }
          });

          Object.entries(errorCounts).forEach(([error, count]) => {
            if (count >= 3) {
              result.issues.push({
                type: 'REPEATED_ERROR',
                message: `Repeated error (${count}x): ${error}`,
                severity: 'high',
                error,
                count
              });
            }
          });
        }
      }

    } catch (error) {
      result.issues.push({
        type: 'LOG_CHECK_ERROR',
        message: `Cannot check logs: ${error.message}`,
        severity: 'low'
      });
    }

    return result;
  }

  async checkLastRun() {
    const result = { healthy: true, issues: [], data: {} };

    try {
      const config = await fs.readJson(this.configPath);
      
      if (config.lastRun) {
        const lastRun = new Date(config.lastRun);
        const now = new Date();
        const timeSinceLastRun = now - lastRun;

        result.data = {
          lastRun: lastRun.toISOString(),
          timeSinceLastRun: Math.floor(timeSinceLastRun / 1000 / 60), // minutes
          isStale: timeSinceLastRun > this.thresholds.staleThreshold
        };

        if (result.data.isStale) {
          result.healthy = false;
          result.issues.push({
            type: 'STALE_SYSTEM',
            message: `System hasn't run in ${result.data.timeSinceLastRun} minutes`,
            severity: 'high',
            lastRun: config.lastRun,
            threshold: this.thresholds.staleThreshold
          });
        }
      } else {
        result.healthy = false;
        result.issues.push({
          type: 'NO_LAST_RUN',
          message: 'System has never run',
          severity: 'high'
        });
      }

    } catch (error) {
      result.issues.push({
        type: 'LAST_RUN_CHECK_ERROR',
        message: `Cannot check last run: ${error.message}`,
        severity: 'medium'
      });
    }

    return result;
  }

  async getDirectorySize(dirPath) {
    let size = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filepath = path.join(dirPath, file);
        const stats = await fs.stat(filepath);
        
        if (stats.isDirectory()) {
          size += await this.getDirectorySize(filepath);
        } else {
          size += stats.size;
        }
      }
    } catch (error) {
      // Directory might not exist
      return 0;
    }

    return size;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async attemptFixes(status) {
    const fixes = [];

    for (const issue of status.issues) {
      try {
        switch (issue.type) {
          case 'NO_GALLERIES':
            // Trigger a gallery creation
            logger.logActivity('Monitor: No galleries found, triggering creation');
            fixes.push({
              issue: issue.type,
              action: 'Run main.js to create gallery',
              command: 'node src/main.js'
            });
            break;

          case 'LOGS_TOO_LARGE':
          case 'LOG_FILE_TOO_LARGE':
            // Rotate logs
            await this.rotateLogs(issue.file);
            fixes.push({
              issue: issue.type,
              action: 'Rotated large log file',
              file: issue.file
            });
            break;

          case 'CONFIG_EMPTY_QUEUE':
            // Add default topics
            const config = await fs.readJson(this.configPath);
            config.topicQueue = ['landscape', 'architecture', 'abstract', 'nature'];
            await fs.writeJson(this.configPath, config, { spaces: 2 });
            fixes.push({
              issue: issue.type,
              action: 'Added default topics to queue'
            });
            break;

          case 'STALE_SYSTEM':
            fixes.push({
              issue: issue.type,
              action: 'System needs to run main workflow',
              command: 'node src/main.js'
            });
            break;

          default:
            // No automatic fix available
            break;
        }
      } catch (error) {
        logger.logError(`Failed to fix ${issue.type}`, error);
      }
    }

    return fixes;
  }

  async rotateLogs(filename) {
    const logPath = filename ? 
      path.join(this.logsDir, filename) : 
      path.join(this.logsDir, 'activity.log');
    
    const archivePath = logPath + '.' + Date.now() + '.archive';
    
    try {
      await fs.move(logPath, archivePath);
      logger.logActivity(`Rotated log file: ${path.basename(logPath)}`);
    } catch (error) {
      logger.logError('Failed to rotate log', error);
    }
  }

  async printStatus(status) {
    console.log('\n=== SYSTEM STATUS ===');
    console.log(`Time: ${status.timestamp}`);
    console.log(`Health: ${status.healthy ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}`);
    
    if (status.metrics.config) {
      console.log('\nConfiguration:');
      console.log(`  Current Topic: ${status.metrics.config.data?.currentTopic || 'N/A'}`);
      console.log(`  Topics in Queue: ${status.metrics.config.data?.topicQueue?.length || 0}`);
    }

    if (status.metrics.galleries) {
      console.log('\nGalleries:');
      console.log(`  Total: ${status.metrics.galleries.data.total}`);
      console.log(`  Recent (24h): ${status.metrics.galleries.data.recent.length}`);
    }

    if (status.metrics.disk) {
      console.log('\nDisk Usage:');
      console.log(`  Images: ${status.metrics.disk.data.images}`);
      console.log(`  Galleries: ${status.metrics.disk.data.galleries}`);
      console.log(`  Logs: ${status.metrics.disk.data.logs}`);
      console.log(`  Total: ${status.metrics.disk.data.total}`);
    }

    if (status.metrics.lastRun?.data) {
      console.log('\nLast Run:');
      console.log(`  Time: ${status.metrics.lastRun.data.lastRun}`);
      console.log(`  Minutes Ago: ${status.metrics.lastRun.data.timeSinceLastRun}`);
    }

    if (status.issues.length > 0) {
      console.log('\n⚠️  ISSUES:');
      status.issues.forEach(issue => {
        console.log(`  [${issue.severity.toUpperCase()}] ${issue.message}`);
      });
    }

    console.log('\n===================\n');
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new SystemMonitor();
  const command = process.argv[2];

  switch (command) {
    case 'status':
      monitor.getSystemStatus()
        .then(status => {
          monitor.printStatus(status);
          process.exit(status.healthy ? 0 : 1);
        })
        .catch(error => {
          console.error('Monitor failed:', error);
          process.exit(2);
        });
      break;

    case 'fix':
      monitor.getSystemStatus()
        .then(async status => {
          monitor.printStatus(status);
          
          if (!status.healthy) {
            console.log('Attempting automatic fixes...\n');
            const fixes = await monitor.attemptFixes(status);
            
            if (fixes.length > 0) {
              console.log('Fixes applied:');
              fixes.forEach(fix => {
                console.log(`  - ${fix.action}`);
                if (fix.command) {
                  console.log(`    Run: ${fix.command}`);
                }
              });
            } else {
              console.log('No automatic fixes available.');
            }
          }
          
          process.exit(0);
        })
        .catch(error => {
          console.error('Monitor failed:', error);
          process.exit(2);
        });
      break;

    case 'json':
      monitor.getSystemStatus()
        .then(status => {
          console.log(JSON.stringify(status, null, 2));
          process.exit(status.healthy ? 0 : 1);
        })
        .catch(error => {
          console.error(JSON.stringify({ error: error.message }));
          process.exit(2);
        });
      break;

    default:
      console.log('Usage: node monitor.js [status|fix|json]');
      console.log('  status - Show system status');
      console.log('  fix    - Attempt to fix issues');
      console.log('  json   - Output status as JSON');
      process.exit(1);
  }
}

module.exports = SystemMonitor;