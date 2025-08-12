#!/usr/bin/env node

/**
 * Port Configuration Helper
 * Reads .env.local to determine which ports to use for this worktree
 */

const fs = require('fs');
const path = require('path');

function loadEnvFile(envPath) {
    if (!fs.existsSync(envPath)) {
        return {};
    }
    
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    
    content.split('\n').forEach(line => {
        if (line && !line.startsWith('#')) {
            const [key, value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.trim();
            }
        }
    });
    
    return env;
}

// Load .env.local if it exists
const projectRoot = process.cwd();
const envLocalPath = path.join(projectRoot, '.env.local');
const envLocal = loadEnvFile(envLocalPath);

// Set environment variables from .env.local
Object.keys(envLocal).forEach(key => {
    if (!process.env[key]) {
        process.env[key] = envLocal[key];
    }
});

// Export for use in scripts
module.exports = {
    SMS_PORT: process.env.SMS_PORT || '3030',
    WEB_PORT: process.env.PORT || '3000',
    NGROK_PORT: process.env.NGROK_PORT || '8000',
    WORKTREE_ID: process.env.WORKTREE_ID || '1',
    WORKTREE_BRANCH: process.env.WORKTREE_BRANCH || 'main'
};

// If running directly, print the configuration
if (require.main === module) {
    console.log('Port Configuration:');
    console.log(`  SMS Port: ${module.exports.SMS_PORT}`);
    console.log(`  Web Port: ${module.exports.WEB_PORT}`);
    console.log(`  Ngrok Port: ${module.exports.NGROK_PORT}`);
    console.log(`  Worktree ID: ${module.exports.WORKTREE_ID}`);
    console.log(`  Branch: ${module.exports.WORKTREE_BRANCH}`);
}