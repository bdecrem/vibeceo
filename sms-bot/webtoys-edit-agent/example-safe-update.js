#!/usr/bin/env node

/**
 * Example: How to safely update a Webtoy app using the safe wrapper
 * 
 * This shows the pattern you should use whenever updating an app
 */

import { safeUpdateApp, fetchCurrentApp } from './safe-update-wrapper.js';

// Example: Fix something in an app
async function fixAppSafely() {
    try {
        // 1. Fetch the current app
        console.log('🔍 Fetching current app...');
        const current = await fetchCurrentApp('bart', 'tide-worm-speaking');
        
        // 2. Make your changes to the HTML
        let modifiedHtml = current.html_content;
        
        // Example: Fix a specific issue
        modifiedHtml = modifiedHtml.replace(
            'old-broken-code',
            'new-fixed-code'
        );
        
        // 3. Use safeUpdateApp to deploy with automatic backup
        console.log('\n🚀 Deploying with automatic backup...');
        const success = await safeUpdateApp(
            'bart',                    // user slug
            'tide-worm-speaking',      // app slug  
            modifiedHtml,              // new HTML
            'Fixed edit functionality' // description for backup
        );
        
        if (success) {
            console.log('\n🎉 Update successful!');
        } else {
            console.log('\n⛔ Update was cancelled');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\n💡 Tip: Check backups/ folder for the latest backup');
    }
}

// Example: Update multiple apps in batch
async function batchUpdateApps() {
    const appsToUpdate = [
        { user: 'bart', app: 'app1', fix: 'Fix issue 1' },
        { user: 'bart', app: 'app2', fix: 'Fix issue 2' },
        { user: 'public', app: 'shared-app', fix: 'Update feature' }
    ];
    
    for (const { user, app, fix } of appsToUpdate) {
        try {
            console.log(`\n🔄 Processing ${user}/${app}...`);
            
            const current = await fetchCurrentApp(user, app);
            let html = current.html_content;
            
            // Apply your fixes here
            // html = html.replace(...);
            
            await safeUpdateApp(user, app, html, fix);
            
        } catch (error) {
            console.error(`❌ Failed to update ${user}/${app}:`, error.message);
            // Continue with next app
        }
    }
}

// Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log(`
📚 Safe Update Example

This demonstrates how to use the safe wrapper for updates.
The wrapper will:
1. Validate your HTML
2. Create automatic backup
3. Apply the update
4. Show you how to restore if needed

Let's try a simple example...
`);
    
    // Uncomment to run:
    // fixAppSafely();
    
    console.log(`To use in your own scripts:

import { safeUpdateApp } from './safe-update-wrapper.js';

// Then in your update code:
await safeUpdateApp(
    'bart',                    // user
    'my-app',                  // app
    modifiedHtml,              // new HTML
    'Description of changes'   // for backup
);
`);
}