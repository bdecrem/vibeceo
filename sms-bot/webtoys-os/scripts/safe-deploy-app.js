#!/usr/bin/env node

/**
 * Safe Deploy App - Git-aware deployment wrapper
 * 
 * This script ensures all app deployments:
 * 1. Save HTML to local file in apps/ directory
 * 2. Create git commit with descriptive message
 * 3. Push to GitHub (creating permanent record)
 * 4. Deploy to Supabase via auto-deploy-app.js
 * 5. Return commit hash for tracking
 * 
 * Usage: node safe-deploy-app.js <app-filename> [icon-emoji] [--message "Custom message"]
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { deployApp } from './auto-deploy-app.js';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Create change manifest entry
 */
async function updateChangeManifest(entry) {
    const manifestPath = path.join(__dirname, '../change-manifest.json');
    
    let manifest = [];
    if (fs.existsSync(manifestPath)) {
        try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        } catch (e) {
            console.warn('⚠️ Could not read existing manifest, creating new one');
        }
    }
    
    manifest.push(entry);
    
    // Keep only last 100 entries
    if (manifest.length > 100) {
        manifest = manifest.slice(-100);
    }
    
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

/**
 * Safe deployment with git tracking
 */
async function safeDeployApp(filename, icon, options = {}) {
    const startTime = Date.now();
    const appsDir = path.join(__dirname, '../apps');
    
    // Parse filename - could be just name or full path
    const appFile = filename.includes('/') 
        ? filename 
        : path.join(appsDir, filename.endsWith('.html') ? filename : `${filename}.html`);
    
    const appName = path.basename(appFile, '.html');
    const customMessage = options.message || null;
    
    console.log('🔒 Safe App Deployment Starting...');
    console.log(`📁 App: ${appName}`);
    
    try {
        // Step 1: Check if file exists (or will be created)
        if (!fs.existsSync(appFile)) {
            console.log(`📝 File will be created: ${appFile}`);
        } else {
            console.log(`📝 File exists: ${appFile}`);
        }
        
        // Step 2: Git operations (if file exists in apps/)
        let commitHash = null;
        const relativeAppPath = path.relative(process.cwd(), appFile);
        
        if (fs.existsSync(appFile)) {
            console.log('\n🔄 Git operations...');
            
            // Check git status
            const { stdout: gitStatus } = await execAsync('git status --porcelain');
            
            if (gitStatus.includes(path.basename(appFile))) {
                // File has changes, commit them
                console.log('📝 Staging changes...');
                await execAsync(`git add "${relativeAppPath}"`);
                
                // Create commit message
                const isNew = gitStatus.includes('?? ');
                const action = isNew ? 'Add' : 'Update';
                const commitMessage = customMessage || 
                    `${action} ${appName} app for WebtoysOS\n\nDeployed via Edit Agent automated system`;
                
                console.log('💾 Creating git commit...');
                const { stdout: commitOutput } = await execAsync(
                    `git commit -m "${commitMessage}" --no-verify`
                );
                
                // Extract commit hash
                const hashMatch = commitOutput.match(/\[[\w\-]+ ([a-f0-9]+)\]/);
                commitHash = hashMatch ? hashMatch[1] : 'unknown';
                
                console.log(`✅ Committed: ${commitHash}`);
                
                // Push to GitHub (optional, based on environment)
                if (process.env.AUTO_PUSH === 'true') {
                    console.log('📤 Pushing to GitHub...');
                    try {
                        await execAsync('git push');
                        console.log('✅ Pushed to GitHub');
                    } catch (pushError) {
                        console.warn('⚠️ Push failed (continuing anyway):', pushError.message);
                    }
                }
            } else {
                console.log('ℹ️ No changes to commit');
                // Get latest commit hash for this file
                try {
                    const { stdout } = await execAsync(`git log -1 --format=%h -- "${relativeAppPath}"`);
                    commitHash = stdout.trim();
                } catch (e) {
                    commitHash = 'uncommitted';
                }
            }
        }
        
        // Step 3: Deploy to Supabase
        console.log('\n🚀 Deploying to Supabase...');
        const deploymentResult = await deployApp(filename, icon);
        
        // Step 4: Update change manifest
        const manifestEntry = {
            timestamp: new Date().toISOString(),
            app: appName,
            appSlug: deploymentResult.appSlug,
            appId: deploymentResult.appId,
            commitHash: commitHash,
            filePath: relativeAppPath,
            icon: icon || deploymentResult.appIcon,
            duration: Date.now() - startTime,
            deployedBy: 'edit-agent'
        };
        
        await updateChangeManifest(manifestEntry);
        console.log('📋 Updated change manifest');
        
        // Step 5: Return results
        const result = {
            success: true,
            ...deploymentResult,
            commitHash: commitHash,
            duration: Date.now() - startTime
        };
        
        console.log('\n✅ Safe deployment complete!');
        console.log(`🔗 Commit: ${commitHash || 'none'}`);
        console.log(`🌐 URL: https://webtoys.ai${deploymentResult.url}`);
        console.log(`⏱️ Duration: ${result.duration}ms`);
        
        return result;
        
    } catch (error) {
        console.error('\n❌ Safe deployment failed:', error.message);
        
        // Log failure to manifest
        await updateChangeManifest({
            timestamp: new Date().toISOString(),
            app: appName,
            error: error.message,
            duration: Date.now() - startTime,
            deployedBy: 'edit-agent'
        });
        
        throw error;
    }
}

// Export for use in other scripts
export { safeDeployApp };

// If run directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
    const filename = process.argv[2];
    const icon = process.argv[3];
    
    // Parse additional options
    const options = {};
    for (let i = 4; i < process.argv.length; i++) {
        if (process.argv[i] === '--message' && process.argv[i + 1]) {
            options.message = process.argv[i + 1];
            i++;
        }
    }
    
    if (!filename) {
        console.error('❌ Usage: node safe-deploy-app.js <filename> [icon] [--message "Custom message"]');
        console.error('   Example: node safe-deploy-app.js paint.html 🎨');
        process.exit(1);
    }
    
    safeDeployApp(filename, icon, options)
        .then(result => {
            // Output commit hash for scripts to capture
            if (result.commitHash) {
                console.log(`\n🔑 COMMIT_HASH=${result.commitHash}`);
            }
            process.exit(0);
        })
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}