#!/usr/bin/env node

/**
 * Configure webhook URL in Issue Tracker via browser console
 * This script generates the JavaScript command to run in the browser
 */

const WEBHOOK_URL = 'https://03ffa53d166c.ngrok.app';

console.log(`
🔧 CONFIGURATION COMMANDS FOR ISSUE TRACKER

1. Open https://webtoys.ai/public/toybox-issue-tracker-v3 in your browser

2. Open browser console (F12 → Console)

3. Run this command to configure webhook:

configureWebhook('${WEBHOOK_URL}')

4. Verify the configuration:

console.log('Webhook URL:', localStorage.getItem('edit_agent_webhook_url'))

5. Test by creating a new issue - it should automatically trigger the Edit Agent!

✅ The webhook URL points to: ${WEBHOOK_URL}/webhook
`);