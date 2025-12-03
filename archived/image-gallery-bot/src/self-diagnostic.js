const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('./logger');
const SystemMonitor = require('./monitor');

class SelfDiagnostic {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    this.monitor = new SystemMonitor();
    this.diagnosticResults = {
      timestamp: new Date().toISOString(),
      passed: [],
      failed: [],
      warnings: [],
      recommendations: []
    };
  }

  async runFullDiagnostics() {
    console.log('🔍 Running full system diagnostics...\n');
    
    // Core checks
    await this.checkNodeVersion();
    await this.checkDependencies();
    await this.checkFileStructure();
    await this.checkPermissions();
    await this.checkConfiguration();
    
    // Functional checks
    await this.checkModules();
    await this.checkLogging();
    await this.checkAPIAccess();
    
    // System health
    const monitorStatus = await this.monitor.getSystemStatus();
    await this.analyzeMonitorStatus(monitorStatus);
    
    // Performance checks
    await this.checkPerformance();
    
    // Generate report
    return this.generateReport();
  }

  async checkNodeVersion() {
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
      
      if (majorVersion >= 14) {
        this.diagnosticResults.passed.push({
          test: 'Node.js Version',
          message: `Running Node.js ${nodeVersion}`,
          details: 'Version is compatible'
        });
      } else {
        this.diagnosticResults.failed.push({
          test: 'Node.js Version',
          message: `Node.js ${nodeVersion} is too old`,
          fix: 'Update to Node.js 14 or higher'
        });
      }
    } catch (error) {
      this.diagnosticResults.failed.push({
        test: 'Node.js Version',
        message: 'Could not determine Node.js version',
        error: error.message
      });
    }
  }

  async checkDependencies() {
    try {
      const packageJson = await fs.readJson(path.join(this.projectRoot, 'package.json'));
      const requiredDeps = ['axios', 'fs-extra', 'unsplash-js'];
      const missingDeps = [];
      
      for (const dep of requiredDeps) {
        if (!packageJson.dependencies[dep]) {
          missingDeps.push(dep);
        }
      }
      
      if (missingDeps.length === 0) {
        // Check if node_modules exists
        const nodeModulesExists = await fs.pathExists(
          path.join(this.projectRoot, 'node_modules')
        );
        
        if (nodeModulesExists) {
          this.diagnosticResults.passed.push({
            test: 'Dependencies',
            message: 'All required dependencies are defined and installed'
          });
        } else {
          this.diagnosticResults.failed.push({
            test: 'Dependencies',
            message: 'Dependencies defined but not installed',
            fix: 'Run: npm install'
          });
        }
      } else {
        this.diagnosticResults.failed.push({
          test: 'Dependencies',
          message: `Missing dependencies: ${missingDeps.join(', ')}`,
          fix: 'Add missing dependencies to package.json'
        });
      }
    } catch (error) {
      this.diagnosticResults.failed.push({
        test: 'Dependencies',
        message: 'Could not check dependencies',
        error: error.message
      });
    }
  }

  async checkFileStructure() {
    const requiredDirs = ['src', 'images', 'galleries', 'logs'];
    const requiredFiles = [
      'config.json',
      'task.txt',
      'src/main.js',
      'src/logger.js',
      'src/search.js',
      'src/download.js',
      'src/gallery.js',
      'src/monitor.js'
    ];
    
    const missingDirs = [];
    const missingFiles = [];
    
    // Check directories
    for (const dir of requiredDirs) {
      const dirPath = path.join(this.projectRoot, dir);
      if (!await fs.pathExists(dirPath)) {
        missingDirs.push(dir);
      }
    }
    
    // Check files
    for (const file of requiredFiles) {
      const filePath = path.join(this.projectRoot, file);
      if (!await fs.pathExists(filePath)) {
        missingFiles.push(file);
      }
    }
    
    if (missingDirs.length === 0 && missingFiles.length === 0) {
      this.diagnosticResults.passed.push({
        test: 'File Structure',
        message: 'All required files and directories exist'
      });
    } else {
      if (missingDirs.length > 0) {
        this.diagnosticResults.failed.push({
          test: 'Missing Directories',
          message: `Missing directories: ${missingDirs.join(', ')}`,
          fix: `Create directories: mkdir -p ${missingDirs.join(' ')}`
        });
      }
      if (missingFiles.length > 0) {
        this.diagnosticResults.failed.push({
          test: 'Missing Files',
          message: `Missing files: ${missingFiles.join(', ')}`,
          fix: 'Restore or recreate missing files'
        });
      }
    }
  }

  async checkPermissions() {
    const checkPaths = [
      { path: 'logs', type: 'directory', need: 'write' },
      { path: 'images', type: 'directory', need: 'write' },
      { path: 'galleries', type: 'directory', need: 'write' },
      { path: 'config.json', type: 'file', need: 'read/write' }
    ];
    
    const permissionIssues = [];
    
    for (const check of checkPaths) {
      const fullPath = path.join(this.projectRoot, check.path);
      
      try {
        await fs.access(fullPath, fs.constants.R_OK | fs.constants.W_OK);
      } catch (error) {
        permissionIssues.push({
          path: check.path,
          type: check.type,
          need: check.need,
          error: error.code
        });
      }
    }
    
    if (permissionIssues.length === 0) {
      this.diagnosticResults.passed.push({
        test: 'File Permissions',
        message: 'All paths have correct permissions'
      });
    } else {
      this.diagnosticResults.failed.push({
        test: 'File Permissions',
        message: 'Permission issues detected',
        details: permissionIssues,
        fix: 'Check file ownership and permissions'
      });
    }
  }

  async checkConfiguration() {
    try {
      const config = await fs.readJson(path.join(this.projectRoot, 'config.json'));
      const issues = [];
      
      // Check API key
      if (!config.unsplashAccessKey || config.unsplashAccessKey === 'DEMO_KEY_REPLACE_LATER') {
        this.diagnosticResults.warnings.push({
          test: 'API Configuration',
          message: 'Using demo mode - no real Unsplash API key configured',
          recommendation: 'Add valid Unsplash API key for real image downloads'
        });
      }
      
      // Check topics
      if (!config.currentTopic || !config.topicQueue || config.topicQueue.length === 0) {
        issues.push('Missing or empty topic configuration');
      }
      
      // Check maxImages
      if (!config.maxImages || config.maxImages < 1) {
        issues.push('Invalid maxImages setting');
      }
      
      if (issues.length === 0) {
        this.diagnosticResults.passed.push({
          test: 'Configuration',
          message: 'Configuration file is valid'
        });
      } else {
        this.diagnosticResults.failed.push({
          test: 'Configuration',
          message: 'Configuration issues found',
          details: issues,
          fix: 'Update config.json with valid settings'
        });
      }
    } catch (error) {
      this.diagnosticResults.failed.push({
        test: 'Configuration',
        message: 'Cannot read configuration file',
        error: error.message,
        fix: 'Ensure config.json exists and is valid JSON'
      });
    }
  }

  async checkModules() {
    const modules = [
      { name: 'logger', path: './logger' },
      { name: 'search', path: './search' },
      { name: 'download', path: './download' },
      { name: 'gallery', path: './gallery' },
      { name: 'monitor', path: './monitor' }
    ];
    
    const moduleErrors = [];
    
    for (const module of modules) {
      try {
        require(module.path);
      } catch (error) {
        moduleErrors.push({
          module: module.name,
          error: error.message
        });
      }
    }
    
    if (moduleErrors.length === 0) {
      this.diagnosticResults.passed.push({
        test: 'Module Loading',
        message: 'All modules load successfully'
      });
    } else {
      this.diagnosticResults.failed.push({
        test: 'Module Loading',
        message: 'Some modules failed to load',
        details: moduleErrors,
        fix: 'Check module syntax and dependencies'
      });
    }
  }

  async checkLogging() {
    try {
      // Test logging
      await logger.logActivity('Diagnostic test log entry');
      
      // Verify log was written
      const activityLog = path.join(this.projectRoot, 'logs', 'activity.log');
      const logContent = await fs.readFile(activityLog, 'utf8');
      
      if (logContent.includes('Diagnostic test log entry')) {
        this.diagnosticResults.passed.push({
          test: 'Logging System',
          message: 'Logging system is functional'
        });
      } else {
        this.diagnosticResults.failed.push({
          test: 'Logging System',
          message: 'Log entry not found after write',
          fix: 'Check logger implementation'
        });
      }
    } catch (error) {
      this.diagnosticResults.failed.push({
        test: 'Logging System',
        message: 'Logging system test failed',
        error: error.message
      });
    }
  }

  async checkAPIAccess() {
    try {
      const config = await fs.readJson(path.join(this.projectRoot, 'config.json'));
      
      if (config.unsplashAccessKey === 'DEMO_KEY_REPLACE_LATER') {
        this.diagnosticResults.passed.push({
          test: 'API Access',
          message: 'Demo mode active - API check skipped'
        });
      } else {
        // Could add actual API test here
        this.diagnosticResults.warnings.push({
          test: 'API Access',
          message: 'API key configured but not tested',
          recommendation: 'Run main.js to verify API access'
        });
      }
    } catch (error) {
      this.diagnosticResults.warnings.push({
        test: 'API Access',
        message: 'Could not verify API configuration'
      });
    }
  }

  async analyzeMonitorStatus(status) {
    if (status.healthy) {
      this.diagnosticResults.passed.push({
        test: 'System Health',
        message: 'Monitor reports system is healthy'
      });
    } else {
      this.diagnosticResults.warnings.push({
        test: 'System Health',
        message: 'Monitor detected issues',
        details: status.issues.map(i => `[${i.severity}] ${i.message}`)
      });
      
      // Add recommendations based on issues
      status.issues.forEach(issue => {
        switch (issue.type) {
          case 'STALE_SYSTEM':
            this.diagnosticResults.recommendations.push(
              'Run the main workflow to refresh the system'
            );
            break;
          case 'LOGS_TOO_LARGE':
            this.diagnosticResults.recommendations.push(
              'Implement log rotation to manage disk space'
            );
            break;
          case 'NO_GALLERIES':
            this.diagnosticResults.recommendations.push(
              'Create initial galleries by running main.js'
            );
            break;
        }
      });
    }
  }

  async checkPerformance() {
    try {
      // Simple performance check
      const startTime = Date.now();
      const testOperations = [
        fs.readdir(this.projectRoot),
        fs.readJson(path.join(this.projectRoot, 'config.json')),
        fs.pathExists(path.join(this.projectRoot, 'logs'))
      ];
      
      await Promise.all(testOperations);
      const duration = Date.now() - startTime;
      
      if (duration < 100) {
        this.diagnosticResults.passed.push({
          test: 'Performance',
          message: `Basic operations completed in ${duration}ms`
        });
      } else {
        this.diagnosticResults.warnings.push({
          test: 'Performance',
          message: `Basic operations took ${duration}ms`,
          recommendation: 'Check disk performance'
        });
      }
    } catch (error) {
      this.diagnosticResults.warnings.push({
        test: 'Performance',
        message: 'Could not complete performance check'
      });
    }
  }

  generateReport() {
    const report = {
      ...this.diagnosticResults,
      summary: {
        total: this.diagnosticResults.passed.length + 
               this.diagnosticResults.failed.length + 
               this.diagnosticResults.warnings.length,
        passed: this.diagnosticResults.passed.length,
        failed: this.diagnosticResults.failed.length,
        warnings: this.diagnosticResults.warnings.length,
        health: this.diagnosticResults.failed.length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
      }
    };
    
    // Save report
    const reportPath = path.join(this.projectRoot, 'logs', 'diagnostic-report.json');
    fs.writeJsonSync(reportPath, report, { spaces: 2 });
    
    return report;
  }

  printReport(report) {
    console.log('\n📊 DIAGNOSTIC REPORT');
    console.log('===================\n');
    
    console.log(`Overall Health: ${
      report.summary.health === 'HEALTHY' ? '✅ HEALTHY' : '⚠️  NEEDS ATTENTION'
    }`);
    console.log(`Tests Run: ${report.summary.total}`);
    console.log(`Passed: ${report.summary.passed}`);
    console.log(`Failed: ${report.summary.failed}`);
    console.log(`Warnings: ${report.summary.warnings}`);
    
    if (report.failed.length > 0) {
      console.log('\n❌ FAILURES:');
      report.failed.forEach(fail => {
        console.log(`\n  ${fail.test}:`);
        console.log(`    ${fail.message}`);
        if (fail.fix) {
          console.log(`    Fix: ${fail.fix}`);
        }
        if (fail.details) {
          console.log(`    Details: ${JSON.stringify(fail.details, null, 2).split('\n').join('\n    ')}`);
        }
      });
    }
    
    if (report.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      report.warnings.forEach(warn => {
        console.log(`\n  ${warn.test}:`);
        console.log(`    ${warn.message}`);
        if (warn.recommendation) {
          console.log(`    Recommendation: ${warn.recommendation}`);
        }
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach(rec => {
        console.log(`  - ${rec}`);
      });
    }
    
    if (report.passed.length > 0) {
      console.log('\n✅ PASSED TESTS:');
      report.passed.forEach(pass => {
        console.log(`  - ${pass.test}: ${pass.message}`);
      });
    }
    
    console.log('\n📄 Full report saved to: logs/diagnostic-report.json\n');
  }
}

// CLI interface
if (require.main === module) {
  const diagnostic = new SelfDiagnostic();
  
  diagnostic.runFullDiagnostics()
    .then(report => {
      diagnostic.printReport(report);
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('Diagnostic failed:', error);
      process.exit(2);
    });
}

module.exports = SelfDiagnostic;