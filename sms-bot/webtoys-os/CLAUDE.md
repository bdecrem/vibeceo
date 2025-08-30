# WebtoysOS v3 - Complete Documentation for Claude Code

## 🚨 CRITICAL: Read This First

**WebtoysOS (BUILD PLAY SHARE) is a DATABASE-CENTRIC system**
- The desktop and apps live in Supabase tables, NOT in local files
- Local HTML files are just templates that get deployed to the database
- NEVER confuse local files with deployed apps - they are separate!
- Title: BUILD PLAY SHARE
- Live URL: https://webtoys.ai/public/toybox-os-v3-test

## System Architecture

### Core Components

```
/sms-bot/webtoys-os/
├── core/                    # Desktop and window manager
│   └── desktop-v3-modern-new.html  # The main desktop (deployed to database)
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

### 🚨 CRITICAL: Authentication Requirements 🚨

**See `agents/edit-agent/AUTH-DOCUMENTATION.md` for COMPLETE implementation details**

WebtoysOS uses a handle + PIN system with STRICT requirements:
- **Handle**: 3-15 characters, alphanumeric, MUST BE UPPERCASE
- **PIN**: 4 digits
- **participant_id**: MUST be `UPPERCASE_HANDLE_PIN` (e.g., `JOHN_1234`)

### Common Authentication Failures
1. **Lowercase handles** - Causes data isolation, can't find saved data
2. **Missing participantId** - ZAD API calls fail
3. **No localStorage fallback** - Race conditions on app load
4. **Missing action_type** - Can't filter data properly

### Correct Implementation (MUST USE BOTH)
```javascript
// STEP 1: Load from localStorage (immediate)
function loadAuthFromStorage() {
    const savedUser = localStorage.getItem('toybox_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        // CRITICAL: Ensure uppercase and participantId
        if (currentUser) {
            if (currentUser.handle) {
                currentUser.handle = currentUser.handle.toUpperCase();
            }
            if (!currentUser.participantId && currentUser.handle && currentUser.pin) {
                currentUser.participantId = `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;
            }
        }
    }
}

// STEP 2: Listen for postMessage (real-time)
window.addEventListener('message', (e) => {
    if (e.data.type === 'TOYBOX_AUTH') {
        currentUser = e.data.user;
        // Fix format same as above
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

### For Regular Apps (ZAD API)
**CRITICAL: Must use correct participant_id format and action_type**

```javascript
// CORRECT: Save data with proper format
const participantId = currentUser.participantId || `${currentUser.handle.toUpperCase()}_${currentUser.pin}`;

await fetch('/api/zad/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        app_id: 'my-app',
        participant_id: participantId,  // UPPERCASE_HANDLE_PIN
        action_type: 'save_data',       // REQUIRED for filtering
        content_data: data
    })
});

// CORRECT: Load and filter data
const response = await fetch(`/api/zad/load?app_id=my-app&action_type=save_data&participant_id=${participantId}`);
const data = await response.json();
// CRITICAL: Filter for current user only
const userData = data.filter(d => d.participant_id === participantId);
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
**Solution**: 
1. Apps must be in iframe on desktop to receive auth
2. Check localStorage AND postMessage listeners
3. Verify handle is UPPERCASE
4. Confirm participantId format: `UPPERCASE_HANDLE_PIN`
Test at: https://webtoys.ai/public/toybox-os-v3-test

### Issue: Data not saving / Open dialog empty
**Solution**: Authentication format issues:
1. **participantId must be uppercase**: `JOHN_1234` not `john_1234`
2. **Include action_type**: Required for filtering data
3. **Filter load results**: Must filter by participant_id
4. **Check console logs**: Look for participantId format

Example fix:
```javascript
// WRONG - lowercase handle, no action_type
participant_id: `${handle}_${pin}`

// CORRECT - uppercase, with action_type
participant_id: `${handle.toUpperCase()}_${pin}`,
action_type: 'save_data'
```

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