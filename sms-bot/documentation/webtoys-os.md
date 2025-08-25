# WebtoysOS Documentation

## Overview

**WebtoysOS** (also known as **Community Desktop** or **ToyBox OS**) is a browser-based windowed operating system that serves as a "super Webtoys app" - a special case application that leverages Webtoys.ai infrastructure to create a "desktop in the cloud" that users can collectively use AND help build.

## 🎯 CRITICAL DISTINCTION: WebtoysOS as a "Super Webtoys App"

### WebtoysOS - The Special Case
**WebtoysOS is a "super Webtoys app"** that uniquely combines:
- **Uses Webtoys.ai infrastructure**: Same database tables, ZAD API, deployment systems
- **Creates a shared desktop OS**: Browser-based Windows 95-style environment 
- **Built by Claude CLI agent**: Running on dedicated Mac mini (not LLM API calls)
- **Collaborative development**: Users can request new desktop apps, agent builds them
- **Database-resident**: The actual desktop lives in Supabase, not local files

### Two Creation Systems Working Together

#### Webtoys.ai Apps (SMS + LLM API)
- **Created by**: Users texting requests to SMS number
- **Built using**: LLM API calls (OpenAI, Anthropic, etc.)
- **Process**: SMS → AI → Generated HTML → Deployed to Supabase
- **Examples**: Games, memes, CRUD apps requested via text

#### WebtoysOS Apps (CLI Agent + Local Development)
- **Created by**: Claude CLI agent on dedicated Mac mini
- **Built using**: Full development workflow with proper tooling
- **Process**: Local development → Safe wrapper updates → Database modification
- **Examples**: Desktop environment, Window Manager, Community apps

### The Architecture Reality
```
Webtoys.ai (SMS System)           WebtoysOS ("Super App")
├── SMS → LLM APIs                ├── Claude CLI Agent
├── Direct to database            ├── Local dev workflow
├── Individual apps               ├── Desktop environment
└── Uses infrastructure ──────────┼── Uses SAME infrastructure
                                  ↓
                    Shared Webtoys.ai Infrastructure
                    ├── Supabase (wtaf_content, wtaf_zero_admin_collaborative)
                    ├── ZAD API system (/api/zad/save, /api/zad/load)
                    ├── Public URLs (webtoys.ai/public/[app-name])
                    └── Authentication & theme systems
```

## The Split Architecture: Files vs Database

### Understanding Where WebtoysOS Lives

**WebtoysOS exists in TWO places:**

#### 1. Development Infrastructure (Local Files)
```
/sms-bot/community-desktop-v2/       # Development "mission control"
├── scripts/                         # Database update scripts
│   ├── safe-update-wrapper.js      # CRITICAL: Database backup system
│   ├── safe-css-wrapper.js         # CSS backup functionality
│   ├── update-toybox.js            # Primary database update script
│   └── [various fix scripts]       # Individual database modifications
├── backups/                         # Database content backups (git-ignored)
│   ├── toybox-os_*.html           # HTML backups with timestamps
│   └── css/                       # Theme CSS backups
├── themes/                         # Local theme development
├── prompts/                        # Templates for new apps
└── CLAUDE.md                       # Local documentation
```

#### 2. Live Application (Database)
- **Location**: Supabase `wtaf_content` table as the `webtoys-os` app
- **Plus**: System 7 theme in `wtaf_themes` table
- **Contains**: The ACTUAL running desktop OS that users see
- **URL**: https://webtoys.ai/public/toybox-os

**⚠️ DEPRECATED**: `/sms-bot/community-desktop/` - DO NOT USE

### Why This Split Architecture Exists

**Traditional Development vs WebtoysOS Reality:**
```
Traditional:                   WebtoysOS:
Local Files → Deploy → Live    Local Scripts → Database → Live
     ↑                              ↑
  Git handles rollbacks       Safe wrapper handles rollbacks
```

**The Challenge**: Regular version control can't help when the "source of truth" is database content, not files.

**The Solution**: Safe wrapper system that backs up database content before modifications.

## 🔴 CRITICAL: Safe Database Update System

### NEVER directly edit HTML in Supabase without using safe wrappers!

**Key Understanding**: When we "update WebtoysOS", we are **modifying database content** (the HTML in Supabase), **NOT** deploying local files.

#### Why Safe Wrappers Are Essential
```
Traditional Development Problem:       WebtoysOS Solution:
Local Files → Git → Deploy → Users    Local Scripts → Database → Users
     ↑                         ↑           ↑                    ↑
   Git rollback works      No git help   Safe wrapper backup  Database rollback
```

#### Primary Update Methods

1. **Using the organized update system** (RECOMMENDED):
```bash
cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/community-desktop-v2

# For HTML changes (content, menus, icons) - modifies database
node scripts/update-toybox.js html "description" --change="type"

# For CSS changes (styling, themes, layout) - modifies database
node scripts/update-toybox.js css "description" --change="type"
```

2. **Using safe-update-wrapper.js directly**:
```javascript
import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './scripts/safe-update-wrapper.js';

// Get current HTML from DATABASE
const current = await fetchCurrentToyBoxOS();
let html = current.html_content;

// Make your changes
html = html.replace('old content', 'new content');

// Safe update DATABASE with automatic backup
await safeUpdateToyBoxOS(html, 'Description of changes');
```

3. **Restoring from backup** (DATABASE restore):
```bash
# Restore HTML to database
node scripts/update-toybox-os.js backups/toybox-os_latest-backup.html

# Restore CSS theme to database
node scripts/css-backup-manager.js restore system7-theme_latest-backup.css
```

### Database Backup System
- **Automatic backups** of database content before every update
- **Location**: `backups/` folder (git-ignored)
- **Naming**: `toybox-os_YYYY-MM-DD_HH-MM-SS.html`
- **Latest backup**: Always available as `toybox-os_latest-backup.html`
- **Purpose**: Version control for database content (since git can't help here)

## Database Architecture

### Primary Tables

#### wtaf_content
Stores all HTML pages including ToyBox OS and its apps:
- `user_slug`: 'public' for ToyBox OS apps
- `app_slug`: 'toybox-os', 'community-notepad', etc.
- `html_content`: Complete HTML including embedded JavaScript
- `theme_id`: Links to theme CSS

#### wtaf_zero_admin_collaborative (ZAD)
Stores all app data and user information:
- `app_id`: UUID or app identifier
- `action_type`: Data category (e.g., 'user_registry', 'update_request')
- `participant_id`: User identifier
- `content_data`: JSONB with actual data

#### wtaf_themes
Stores theme CSS:
- `id`: Theme UUID
- `css_content`: Complete CSS for theme
- `name`: Theme name (e.g., 'System 7')

## User Authentication System

### Overview
ToyBox OS provides user authentication that persists across sessions and is shared with all windowed apps.

### Database Details
- **Table**: `wtaf_zero_admin_collaborative`
- **App ID**: `toybox-os-users`
- **Action Type**: `user_registry`

### User Data Structure
```json
{
    "handle": "bart",           // Username (3-15 chars) - THIS IS THE KEY FIELD!
    "pin": "1234",             // 4-digit PIN
    "id": "bart",              // Same as handle
    "created": "2025-01-21T..." // ISO timestamp
}
```

### Critical Authentication Notes
- **Use `.handle` NOT `.username`** - This is the most common error!
- User object stored in `currentUser` or `window.toyboxUser`
- Always check for null before accessing properties
- Authentication broadcasts via postMessage to all iframes

### Correct Authentication Pattern for Apps
```javascript
// Global user variable
let currentUser = null;

// Listen for auth from ToyBox OS
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOYBOX_AUTH') {
        currentUser = event.data.user;
        updateUI();
    }
});

// Access username correctly
const username = currentUser?.handle || 'anonymous';  // NOT .username!
```

## ZAD API System

All ToyBox OS apps use the Zero Admin Data (ZAD) system for data persistence.

### Endpoints
- **Save**: `/api/zad/save`
- **Load**: `/api/zad/load`

### NEVER use direct Supabase access in apps!

### Required Helper Functions
Every windowed app MUST include these ZAD helpers:

```javascript
window.APP_ID = 'unique-app-id';  // Required!

async function save(dataType, data) {
    const response = await fetch('/api/zad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: window.APP_ID,
            participant_id: currentUser?.handle || 'anonymous',
            action_type: dataType,
            content_data: data
        })
    });
    return response.ok;
}

async function load(dataType) {
    const response = await fetch(`/api/zad/load?app_id=${window.APP_ID}&action_type=${dataType}`);
    const data = await response.json();
    return data || [];
}
```

## Creating New Windowed Apps

### Template Structure
```html
<!DOCTYPE html>
<html>
<head>
    <title>App Name</title>
    <style>
        /* Windows 95 aesthetic */
        body { 
            background: #c0c0c0;
            font-family: 'MS Sans Serif', Tahoma, sans-serif;
            margin: 0;
            padding: 8px;
        }
    </style>
</head>
<body>
    <!-- App UI here -->
    
    <script>
        // REQUIRED: App ID
        window.APP_ID = 'unique-app-id';
        
        // REQUIRED: User variable
        let currentUser = null;
        
        // REQUIRED: ZAD helper functions
        async function save(dataType, data) { /* ... */ }
        async function load(dataType) { /* ... */ }
        
        // REQUIRED: Auth listener
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                currentUser = event.data.user;
                // Update UI based on login state
            }
        });
        
        // Your app logic here
    </script>
</body>
</html>
```

### Deployment Process

1. **Create the app HTML** following the template
2. **Deploy to Supabase**:
```javascript
const { error } = await supabase
    .from('wtaf_content')
    .insert({
        user_slug: 'public',
        app_slug: 'your-app-name',
        html_content: yourHTML,
        original_prompt: 'App description'
    });
```

3. **Register in ToyBox OS**:
```javascript
// Add to window.windowedApps registry in toybox-os.html
window.windowedApps['your-app'] = {
    name: 'Your App',
    url: '/public/your-app-name',
    icon: '🎯',
    width: 800,
    height: 600
};
```

4. **Add desktop icon**:
```html
<div class="desktop-icon" onclick="openWindowedApp('your-app')">
    <div class="icon">🎯</div>
    <div class="label">Your App</div>
</div>
```

## Common APIs and Patterns

### Window Manager API
```javascript
// Open a windowed app
openWindowedApp('app-id');

// Close current window (from inside app)
window.parent.postMessage({ type: 'CLOSE_WINDOW' }, '*');
```

### Authentication Check Pattern
```javascript
if (!currentUser) {
    alert('Please log in to use this feature');
    return;
}
// Proceed with authenticated action
```

### Data Persistence Pattern
```javascript
// Save user-specific data
async function saveUserData(data) {
    return await save('user_data', {
        ...data,
        userId: currentUser?.handle || 'anonymous',
        timestamp: new Date().toISOString()
    });
}

// Load and filter user data
async function loadUserData() {
    const allData = await load('user_data');
    return allData.filter(item => 
        item.content_data.userId === (currentUser?.handle || 'anonymous')
    );
}
```

## Theme System

### Current Theme
- **Name**: System 7
- **ID**: `2ec89c02-d424-4cf6-81f1-371ca6b9afcf`
- **Storage**: `wtaf_themes` table

### Updating Themes
```javascript
// Update theme CSS in database
const { error } = await supabase
    .from('wtaf_themes')
    .update({ css_content: newCSS })
    .eq('id', themeId);
```

### Theme Application
ToyBox OS dynamically loads theme CSS on startup:
```javascript
const theme = await loadTheme(themeId);
const styleElement = document.createElement('style');
styleElement.textContent = theme.css_content;
document.head.appendChild(styleElement);
```

## Testing & Development

### Local Development Setup
```bash
# Navigate to web directory
cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web

# Start development server
npm run dev

# Access WebtoysOS locally (loads from database)
# http://localhost:3000/public/toybox-os
```

### Development Workflow Understanding
1. **Local server serves database content**: The local dev server fetches WebtoysOS from Supabase
2. **Changes happen in database**: Scripts modify the live database content
3. **Refresh to see changes**: Local and production both show the updated database content
4. **Backups protect against mistakes**: Since git can't rollback database changes

### Testing Checklist
- [ ] Test app in windowed mode
- [ ] Verify authentication integration
- [ ] Check data persistence with ZAD
- [ ] Test with logged in and anonymous users
- [ながら Verify responsive behavior in different window sizes
- [ ] Check for console errors
- [ ] Test app reopening/state restoration

## Security & Best Practices

### Security Rules
1. **NEVER hardcode secrets** - Use environment variables
2. **NEVER expose Supabase keys** in client code
3. **Always validate user input** before saving
4. **Use participant_id** for data isolation
5. **Check authentication** before sensitive operations

### Development Best Practices
1. **ALWAYS use safe-update-wrapper.js** for updates
2. **ALWAYS backup before major changes**
3. **ALWAYS test locally first**
4. **ALWAYS use `.handle` not `.username`** for user field
5. **ALWAYS include ZAD helpers** in windowed apps
6. **ALWAYS listen for auth updates** via postMessage
7. **NEVER edit directly in Supabase** without backups

## Common Issues & Solutions

### Issue: Username shows as "anonymous" when logged in
**Solution**: Use `currentUser.handle` not `currentUser.username`

### Issue: App doesn't receive authentication
**Solution**: Add message event listener for TOYBOX_AUTH

### Issue: Data not persisting
**Solution**: Ensure APP_ID is set and ZAD helpers are included

### Issue: Changes lost after update
**Solution**: Always use safe-update-wrapper.js with backups

### Issue: App not opening in window
**Solution**: Register in windowedApps and add desktop icon

## Quick Command Reference

```bash
# Update WebtoysOS HTML in database
cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/community-desktop-v2
node scripts/update-toybox.js html "Added new feature"

# Update theme CSS in database
node scripts/update-toybox.js css "Updated colors"

# Restore database from backup
node scripts/update-toybox-os.js backups/toybox-os_latest-backup.html

# Create test issue (Issue Tracker)
node scripts/create-test-issue.js

# Fix specific issue
node scripts/fix-[issue-name].js
```

## Important Files Reference

- **Main Desktop**: Lives in Supabase `wtaf_content` table (NOT a local file)
- **Safe Update**: `scripts/safe-update-wrapper.js` (modifies database safely)
- **Local Docs**: `community-desktop-v2/CLAUDE.md`
- **This File**: `sms-bot/documentation/webtoys-os.md`
- **ZAD Docs**: `sms-bot/documentation/ZAD-API-REFERENCE.md`
- **Backup Location**: `backups/` folder (database content backups)

## Support & Troubleshooting

For issues or questions about WebtoysOS development:
1. Check this documentation first
2. Review existing scripts in `scripts/` folder
3. Look at working examples (Chat, Notepad, Issue Tracker)
4. Check backups folder for previous database versions
5. Use debug scripts to investigate issues

Remember: 
- **The user authentication field is `.handle` NOT `.username`!**
- **WebtoysOS lives in the database, not local files**
- **Always use safe wrapper scripts to modify database content**

---

*Last Updated: August 2025*
*Version: 2.0 (WebtoysOS - Community Desktop V2)*