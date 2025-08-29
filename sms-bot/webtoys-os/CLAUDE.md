# WebtoysOS v3 - Complete Documentation for Claude Code

## 🚨 CRITICAL: Read This First

**WebtoysOS (also called ToyBox OS or Community Desktop) is a DATABASE-CENTRIC system**
- The desktop and apps live in Supabase tables, NOT in local files
- Local HTML files are just templates that get deployed to the database
- NEVER confuse local files with deployed apps - they are separate!

## System Architecture

### Core Components

```
/sms-bot/webtoys-os/
├── core/                    # Desktop and window manager
│   └── desktop-v3.html     # The main desktop (deployed to database)
├── apps/                    # All WebtoysOS applications
│   ├── issue-tracker-v3.html
│   ├── t3xt.html
│   └── [other apps].html
├── agents/                  # Automated agents
│   └── edit-agent/         # Processes issues from tracker
├── scripts/                 # Deployment and management
│   ├── auto-deploy-app.js # Deploy any app to desktop
│   └── deploy-*.js         # Various deployment scripts
└── lib/                     # Shared libraries
    └── desktop-config-client.js
```

### Database Tables

1. **`wtaf_content`** - Stores all HTML apps
   - `user_slug`: 'public' for WebtoysOS apps
   - `app_slug`: Unique identifier (e.g., 'toybox-os-v3-test')
   - `html_content`: Complete HTML of the app

2. **`wtaf_desktop_config`** - Desktop configuration
   - `desktop_version`: 'webtoys-os-v3'
   - `app_registry`: JSON array of all apps
   - `icon_positions`: JSON object with x,y coordinates
   - `user_settings`: Theme, preferences, etc.

3. **`webtoys_issue_tracker_data`** - Issue tracker data
   - Direct Supabase access (no RLS)
   - Stores issues with JSONB content_data
   - Used by Issue Tracker v3 and Edit Agent

## Key URLs and Access Points

- **Desktop**: https://webtoys.ai/public/toybox-os-v3-test
- **Issue Tracker**: https://webtoys.ai/public/toybox-issue-tracker-v3
- **Apps**: https://webtoys.ai/public/toybox-[app-name]

## Critical Rules for Development

### 1. NEVER Hardcode Secrets
```javascript
// ❌ WRONG
const key = 'eyJhbGc...actual-key...';

// ✅ CORRECT
const key = process.env.SUPABASE_SERVICE_KEY;
```

### 2. Use Correct Supabase Keys
- **Browser/Client**: Use ANON key (`sb_publishable_...`)
- **Server/Scripts**: Use SERVICE key (from .env.local)
- **NEVER expose service key to browser**

### 3. Database Updates vs Local Files
- Local HTML files are just templates
- Real apps live in the database
- Always deploy changes using scripts
- Never assume local file = live app

## Common Workflows

### Adding a New App to WebtoysOS

1. **Create the app HTML** in `/apps/` directory:
```bash
# Create your app file
/apps/my-app.html
```

2. **Deploy using auto-deploy script**:
```bash
node scripts/auto-deploy-app.js apps/my-app.html 🎯
# Last parameter is optional icon emoji
```

This automatically:
- Deploys to Supabase (`wtaf_content` table)
- Registers in desktop config
- Adds icon to desktop
- Makes accessible at `/public/toybox-my-app`

### Updating an Existing App

1. **Modify the local HTML file**
2. **Redeploy**:
```bash
node scripts/auto-deploy-app.js apps/my-app.html
```

### Manual App Deployment (Advanced)

```javascript
// Example deployment script
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const htmlContent = fs.readFileSync('apps/my-app.html', 'utf8');

// Deploy to database
await supabase
    .from('wtaf_content')
    .upsert({
        user_slug: 'public',
        app_slug: 'toybox-my-app',
        html_content: htmlContent
    });
```

## Issue Tracker & Edit Agent System

### How It Works

1. **Users submit issues** via Issue Tracker at `/public/toybox-issue-tracker-v3`
2. **Issues stored** in `webtoys_issue_tracker_data` table
3. **Edit Agent runs every 2 minutes** (via cron)
4. **Processes open issues** with Claude Code
5. **Updates issue status** and adds execution log as comment

### Issue Statuses
- `open` / `new` - Ready for processing
- `processing` - Currently being worked on
- `completed` - Successfully processed
- `failed` - Processing failed

### Edit Agent Commands

```bash
# Check issues
ISSUE_TRACKER_APP_ID=toybox-issue-tracker-v3 node agents/edit-agent/debug-issues.js

# Process open issues
ISSUE_TRACKER_APP_ID=toybox-issue-tracker-v3 node agents/edit-agent/execute-open-issue.js

# Monitor logs
tail -f agents/edit-agent/edit-agent-v3.log
```

### Cron Job Setup
```bash
*/2 * * * * cd /path/to/webtoys-os/agents/edit-agent && ISSUE_TRACKER_APP_ID=toybox-issue-tracker-v3 node execute-open-issue.js >> edit-agent-v3.log 2>&1
```

## Authentication System

WebtoysOS uses a handle + PIN system:
- **Handle**: 3-15 characters, alphanumeric
- **PIN**: 4 digits
- Stored in `participant_id` as `HANDLE_PIN`

Apps access auth via postMessage:
```javascript
// Request auth from desktop
parent.postMessage({ type: 'GET_AUTH' }, '*');

// Receive auth
window.addEventListener('message', (e) => {
    if (e.data.type === 'AUTH_RESPONSE') {
        const { handle, participantId } = e.data;
    }
});
```

## App Communication

### Desktop → App
```javascript
// Desktop sends auth
iframe.contentWindow.postMessage({
    type: 'AUTH_RESPONSE',
    handle: userHandle,
    participantId: participantId
}, '*');
```

### App → Desktop
```javascript
// App requests auth
parent.postMessage({ type: 'GET_AUTH' }, '*');
```

## Data Storage Patterns

### For Regular Apps
Use ZAD API endpoints:
```javascript
// Save data
await fetch('/api/zad/save', {
    method: 'POST',
    body: JSON.stringify({
        app_id: 'my-app',
        participant_id: userId,
        content_data: data
    })
});

// Load data
await fetch('/api/zad/load?app_id=my-app');
```

### For System Apps (Issue Tracker)
Direct Supabase access:
```javascript
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Create issue
await supabase
    .from('webtoys_issue_tracker_data')
    .insert({ app_id, content_data });

// Update issue  
await supabase
    .from('webtoys_issue_tracker_data')
    .update({ content_data })
    .eq('id', issueId);
```

## Testing & Development

### Local Testing
```bash
# Open HTML file locally
open apps/my-app.html

# Note: Some features require deployment to work (auth, data storage)
```

### Deploy to Test
```bash
# Deploy and get URL immediately
node scripts/auto-deploy-app.js apps/my-app.html
# Output: https://webtoys.ai/public/toybox-my-app
```

### Check Deployment
```bash
# Verify in database
node -e "
const supabase = createClient(...);
const { data } = await supabase
    .from('wtaf_content')
    .select('app_slug, updated_at')
    .eq('user_slug', 'public')
    .like('app_slug', '%my-app%');
console.log(data);
"
```

## Common Issues & Solutions

### Issue: Changes not showing
**Solution**: Did you deploy? Local changes need deployment:
```bash
node scripts/auto-deploy-app.js apps/my-app.html
```

### Issue: Auth not working
**Solution**: Apps must be in iframe on desktop to receive auth.
Test at: https://webtoys.ai/public/toybox-os-v3-test

### Issue: Data not saving
**Solution**: Check if using correct table and have proper keys:
- Browser apps: Use ANON key
- Scripts: Use SERVICE key

### Issue: Icon not showing on desktop
**Solution**: Check desktop config was updated:
```javascript
// Should have entry in app_registry
{ id: 'my-app', name: 'My App', icon: '🎯', url: '/public/toybox-my-app' }
```

## Emergency Procedures

### Restore Desktop from Backup
```bash
# Backups are created automatically
ls community-desktop-v2/backups/

# Restore specific backup
node scripts/restore-from-backup.js backups/toybox-os_[timestamp].html
```

### Fix Broken App Registry
```javascript
// Manually fix via Supabase dashboard
// Table: wtaf_desktop_config
// Column: app_registry (JSONB)
// Remove broken entry from array
```

### Reset Issue Tracker
```sql
-- Clear all issues (nuclear option)
DELETE FROM webtoys_issue_tracker_data 
WHERE app_id = 'toybox-issue-tracker-v3';
```

## Best Practices

1. **Always commit before cron runs** - Edit agent switches branches
2. **Test locally first** - But remember some features need deployment
3. **Use auto-deploy script** - It handles all the complexity
4. **Monitor logs** - Check edit-agent-v3.log for issues
5. **Backup before major changes** - Desktop has auto-backup on updates

## Quick Command Reference

```bash
# Deploy app
node scripts/auto-deploy-app.js apps/[app].html [icon]

# Check issues  
ISSUE_TRACKER_APP_ID=toybox-issue-tracker-v3 node agents/edit-agent/debug-issues.js

# Process issues
ISSUE_TRACKER_APP_ID=toybox-issue-tracker-v3 node agents/edit-agent/execute-open-issue.js

# Monitor agent
tail -f agents/edit-agent/edit-agent-v3.log

# Deploy issue tracker
node scripts/deploy-issue-tracker-v3.js

# Test desktop config access
node scripts/test-desktop-config-access.js
```

## Architecture Philosophy

WebtoysOS follows these principles:

1. **Database-centric** - The database is the source of truth
2. **No local state** - Everything persists to Supabase
3. **Apps are islands** - Each app is self-contained HTML
4. **Desktop is coordinator** - Manages auth, windows, and app lifecycle
5. **Agents are autonomous** - Run independently via cron

## For New Developers

Start here:
1. Read this entire document
2. Deploy a simple "Hello World" app
3. Add it to the desktop
4. Submit an issue to test the Edit Agent
5. Check how your issue was processed

Remember: **The database is everything. Local files are just templates.**