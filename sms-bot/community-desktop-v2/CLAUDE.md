# WebtoysOS / Community Desktop V2 (ACTIVE PROJECT)

⚠️ **This is the ACTIVE WebtoysOS project. The v1 folder (`/sms-bot/community-desktop/`) is deprecated.**

## 🎯 CRITICAL DISTINCTION: WebtoysOS as a "Super Webtoys App"

### Understanding WebtoysOS
**WebtoysOS is a "super Webtoys app"** that uniquely:
- **Uses Webtoys.ai infrastructure**: Same database tables, ZAD API, deployment systems
- **Creates collaborative desktop OS**: Browser-based environment users can collectively build
- **Built by Claude CLI agent**: Running on dedicated Mac mini (NOT via SMS or LLM APIs)
- **Lives in database**: The actual desktop environment resides in Supabase, not local files
- **Development infrastructure**: This directory contains scripts and tools to safely modify the database-resident desktop

### The Two Creation Systems in Webtoys.ai

#### Webtoys.ai Apps (SMS + LLM API)
- **Built by**: Users texting requests to SMS number
- **Created using**: LLM API calls (OpenAI, Anthropic, etc.)
- **Process**: SMS → AI → Generated HTML → Deployed to Supabase
- **Examples**: User-created pages, games, memes via SMS

#### WebtoysOS Apps (CLI Agent + Local Development)
- **Built by**: Claude CLI agent on dedicated Mac mini  
- **Created using**: Full development workflow with proper tooling
- **Process**: Local development → Safe wrapper updates → Database modification
- **Examples**: Desktop environment, Window Manager, Community apps

### The Architecture Reality
```
Webtoys.ai (SMS System)           WebtoysOS ("Super App")
├── SMS → LLM APIs                ├── Claude CLI Agent
├── Direct to database            ├── Safe wrapper scripts
├── Individual apps               ├── Desktop environment
└── Uses infrastructure ──────────┼── Uses SAME infrastructure
                                  ↓
                    Shared Webtoys.ai Infrastructure
                    ├── Supabase (wtaf_content, wtaf_zero_admin_collaborative)
                    ├── ZAD API system (/api/zad/save, /api/zad/load)
                    ├── Public URLs (webtoys.ai/public/[app-name])
                    └── Authentication & theme systems
```

**KEY POINT**: When working on WebtoysOS, you are using LOCAL DEVELOPMENT TOOLS to safely modify a DATABASE-RESIDENT desktop environment that integrates with the broader Webtoys.ai platform.

## Project Overview

**WebtoysOS** is an evolution of the Community Desktop that transforms it from a collection of simple JavaScript alerts into a full **windowed operating system** running in the browser. Users can open real applications in draggable, resizable windows while still enjoying the simple one-click toys from V1.

### The Split Architecture

**WebtoysOS exists in TWO places:**

1. **Development Infrastructure** (This Directory):
   - Scripts to safely modify database content
   - Backup system for database rollbacks
   - Development tools and documentation

2. **Live Application** (Database):
   - Actual desktop OS lives in Supabase `wtaf_content` table
   - System 7 theme in `wtaf_themes` table
   - What users actually see and interact with

### Live URLs
- **Production Desktop**: https://webtoys.ai/public/toybox-os (loads from Supabase)
- **Community Notepad**: https://webtoys.ai/public/community-notepad (loads from Supabase)
- **Local Testing**: http://localhost:3000/public/toybox-os (also loads from Supabase)

## 🔴 CRITICAL: How to Update WebtoysOS

### ALWAYS Use the Safe Database Update System

**NEVER directly edit the HTML in Supabase without backing up first!**

**Key Understanding**: When we "update WebtoysOS", we are **modifying database content** (the HTML in Supabase), **NOT** editing and deploying local files.

#### For ANY WebtoysOS changes:

1. **Use the organized update system**:
```bash
# For HTML changes (content, menus, icons) - modifies DATABASE
node scripts/update-toybox.js html "description" --change="type"

# For CSS changes (styling, themes, layout) - modifies DATABASE
node scripts/update-toybox.js css "description" --change="type"

# Available change types:
# HTML: menu-item, icon-removal, padding-adjustment
# CSS: font-size, colors, layout
```

2. **Or use the safe update wrapper directly**:
```javascript
import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './scripts/safe-update-wrapper.js';

// Get current HTML from DATABASE
const current = await fetchCurrentToyBoxOS();
let html = current.html_content;

// Make your changes
html = html.replace('old', 'new');

// Safe update DATABASE (automatic backup)
await safeUpdateToyBoxOS(html, 'Description of changes');
```

3. **Database backups are automatically created** in `backups/` folder:
   - **HTML backups**: `toybox-os_2025-08-20_17-13-03.html` (database content)
   - **CSS backups**: `backups/css/system7-theme_2025-08-20_17-13-03.css` (database content)
   - **Latest backups**: `toybox-os_latest-backup.html` and `system7-theme_latest-backup.css`
   - **Metadata**: `.json` files with descriptions for both HTML and CSS

4. **To restore database from backup**:
```bash
# Restore HTML to database
node scripts/update-toybox-os.js backups/toybox-os_latest-backup.html

# Restore CSS to database
node scripts/css-backup-manager.js restore system7-theme_latest-backup.css

# List available CSS backups
node scripts/css-backup-manager.js list
```

### Theme System Architecture

**WebtoysOS uses a dynamic theme engine:**

1. **HTML Structure** (stored in `wtaf_content` table - DATABASE):
   - Minimal embedded CSS (structural only)
   - Theme class on body: `<body class="theme-system7">`
   - `theme_id` field links to theme

2. **Theme CSS** (stored in `wtaf_themes` table - DATABASE):
   - Complete theme styling
   - Loaded dynamically by theme engine
   - Current theme: System 7 (ID: `2ec89c02-d424-4cf6-81f1-371ca6b9afcf`)

3. **To update theme CSS** (USE SAFE WRAPPERS):
```javascript
// DON'T do direct database updates!
// Use safe wrapper scripts instead:
node scripts/update-toybox.js css "Updated theme colors"
```

### File Structure for Database Management

```
community-desktop-v2/                      # DATABASE MANAGEMENT TOOLS
├── backups/                              # Database content backups (git-ignored)
│   ├── toybox-os_[timestamp].html      # HTML from database
│   ├── toybox-os_latest-backup.html    # Latest HTML backup
│   └── css/                           # CSS theme backups
│       ├── system7-theme_[timestamp].css # CSS from database
│       ├── system7-theme_[timestamp].json # Metadata
│       └── system7-theme_latest-backup.css # Latest CSS backup
├── scripts/                              # DATABASE UPDATE SCRIPTS
│   ├── update-toybox.js             # Primary database update script
│   ├── safe-update-wrapper.js       # HTML database backup functionality
│   ├── safe-css-wrapper.js          # CSS database backup functionality  
│   ├── css-backup-manager.js        # CSS database backup utility
│   ├── README.md                    # Scripts documentation
│   └── [legacy scripts]             # Historical database changes
├── themes/                               # LOCAL DEVELOPMENT THEMES
│   ├── base.css                     # Minimal structural CSS
│   └── system7/
│       └── system7.css              # System 7 theme (for development)
└── current-toybox-os.html               # Local working copy (NOT the live version)

NOTE: The LIVE WebtoysOS desktop exists in Supabase database, NOT in local files!
```

### Database Update Workflow

1. **Use organized scripts** - `node scripts/update-toybox.js` for most database changes
2. **Always backup first** (automatic with safe-update-wrapper)
3. **Test locally** at http://localhost:3000/public/toybox-os (loads from database)
4. **Commit development changes** to git (scripts, documentation, etc.)
5. **Never lose work** - backups folder preserves all database versions

**Key Understanding**: 
- Local git tracks the development tools
- Database backups track the live application content
- Changes are immediately live (since app lives in database)

**Best Practice**: Instead of creating new scripts, edit `scripts/update-toybox.js` with specific modifications for reusability.

## Architecture

### Core Components

1. **Window Manager** (`window-manager.js`)
   - Handles window creation, dragging, resizing
   - Z-index management for window focus
   - Minimize/maximize/close functionality
   - Windows 95-style UI with title bars and controls

2. **ToyBox OS Desktop** (`toybox-os.html`)
   - Main desktop environment
   - Embedded window manager
   - App launcher icons
   - Taskbar (future: show open windows)
   - Welcome screen for new users

3. **Windowed Apps** (ZAD apps that run in iframes)
   - **Community Notepad** - Full text editor with save/load
   - **Community Paint** (planned) - Drawing application
   - **Community Chat** (planned) - Shared message board
   - Each app is a standalone ZAD app stored in Supabase

4. **Desktop Integration** (`desktop-integration.js`)
   - Bridge between V1 simple apps and V2 windowed apps
   - Preserves backward compatibility
   - Registry system for app management

## How It Works

### Window System
```javascript
// Apps are defined with metadata
window.windowedApps = {
    'community-notepad': {
        name: 'Community Notepad',
        url: '/public/community-notepad',  // Loads from Supabase
        icon: '📝',
        width: 600,
        height: 400
    }
};

// Clicking an icon opens the app in a window
onclick="openWindowedApp('community-notepad')"
```

### ZAD Integration
All windowed apps use the ZAD (Zero Admin Data) system:
- Data persists to `wtaf_zero_admin_collaborative` table
- No direct database access - only `/api/zad/save` and `/api/zad/load`
- Multi-user collaboration support
- Each app has unique `APP_ID`

## Development Guide

### Creating a New Windowed App

1. **Use the prompt template** (`prompts/windowed-zad-app-prompt.md`)
2. **Follow the structure**:
```html
<!DOCTYPE html>
<html>
<head>
    <title>App Name</title>
    <style>
        /* Windows 95 aesthetic */
        body { background: white; font-family: 'Tahoma'; }
    </style>
</head>
<body>
    <!-- App UI -->
    <script>
        // Required ZAD configuration
        window.APP_ID = 'unique-app-id';
        
        // ZAD helper functions (required)
        async function save(dataType, data) { /* ... */ }
        async function load(dataType) { /* ... */ }
        
        // App logic
    </script>
</body>
</html>
```

3. **Deploy to Supabase**:
```javascript
// Insert into wtaf_content table
user_slug: 'public'
app_slug: 'app-name'
html_content: [your HTML]
original_prompt: 'App description'
```

4. **Register in ToyBox OS**:
```javascript
window.windowedApps['app-id'] = {
    name: 'App Name',
    url: '/public/app-name',
    icon: '🎨',
    width: 800,
    height: 600
};
```

### Adding Apps to Desktop

#### Option 1: Windowed App (opens in window)
```html
<div class="desktop-icon" onclick="openWindowedApp('app-id')">
    <div class="icon">🎨</div>
    <div class="label">Paint</div>
</div>
```

#### Option 2: Simple App (preserves V1 behavior)
```html
<div class="desktop-icon" onclick="alert('Hello!')">
    <div class="icon">👋</div>
    <div class="label">Greeting</div>
</div>
```

## File Structure

```
community-desktop-v2/
├── CLAUDE.md                    # This file
├── toybox-os.html              # Main desktop (deployed)
├── community-notepad.html      # Notepad app (deployed)
├── window-manager.js           # Window system (embedded in toybox-os)
├── desktop-integration.js      # V1/V2 compatibility bridge
├── test-desktop.html           # Local testing environment
└── prompts/
    └── windowed-zad-app-prompt.md  # Template for new apps
```

## Design Principles

1. **Backward Compatibility** - All V1 simple apps must continue working
2. **ZAD-Only Data** - No direct database access in apps
3. **Windows 95 Aesthetic** - Retro UI with modern functionality
4. **Iframe Isolation** - Apps run in sandboxed iframes
5. **Community First** - Apps should enable collaboration

## Current Status

### ✅ Completed
- Window manager system
- ToyBox OS desktop environment
- Community Notepad (text editor)
- Deployment to Supabase
- V1/V2 compatibility

### 🚧 In Progress
- Community Paint (drawing app)
- Community Chat (message board)
- Taskbar window management
- Start menu

### 📋 Planned
- App submission via Community Desktop form
- Window persistence (remember positions)
- Multi-window layouts
- File system abstraction
- Inter-app communication

## Testing

### Local Development
```bash
# Serve the test environment
cd web
npm run dev

# Access test desktop
http://localhost:3000/community-desktop-v2/test-desktop.html
```

### Production
- ToyBox OS: https://webtoys.ai/public/toybox-os
- Test by clicking Notepad icon - should open in window
- Test simple apps - should still work with alerts

## Important Notes

### CORS Considerations
- Apps load in iframes from same domain (webtoys.ai)
- ZAD API calls work because they're same-origin
- External resources may need CORS headers

### Performance
- Each windowed app is a full iframe (heavier than simple apps)
- Limit concurrent windows for performance
- Consider lazy loading for complex apps

### Security
- Apps are sandboxed in iframes
- No access to parent window
- ZAD provides data isolation per app

## Future Vision

WebtoysOS will become a full collaborative desktop where:
- Users submit app ideas via SMS/form
- Claude CLI agent generates functional windowed apps using proper development practices
- Apps appear on everyone's shared desktop in the database
- Community builds an OS together using both SMS (Webtoys.ai) and agent development (WebtoysOS)
- Simple toys and complex apps coexist

Think of it as "Windows 95 meets GitHub meets Wikipedia" - a collectively-built operating system where anyone can contribute an app, leveraging both SMS creativity and professional development practices.

## Common Update Scripts

### Remove an icon from DATABASE:
```javascript
// Use remove-paint-icon.js as template - modifies DATABASE HTML
const pattern = /<div class="desktop-icon"[^>]*>[\s\S]*?YourApp[\s\S]*?<\/div>/g;
htmlContent = htmlContent.replace(pattern, '');
await safeUpdateToyBoxOS(htmlContent, 'Removed YourApp icon');
```

### Add a new app to DATABASE:
```javascript
// Add to windowedApps registry in DATABASE HTML
window.windowedApps['new-app'] = {
    name: 'New App',
    url: '/public/new-app',
    icon: '🆕',
    width: 800,
    height: 600
};
```

### Update theme:
```bash
# Edit theme CSS
node fix-menu-bar-css.js

# Or create new theme
node add-new-theme.js
```

## Contributing

To add a new app to WebtoysOS:

1. Create the app following the ZAD template
2. Test locally (loads from database)
3. Deploy app to Supabase as /public/[app-name]
4. **Use safe-update-wrapper.js to add icon to database desktop**
5. Update the database desktop with new icon
6. Submit PR with development tool changes

⚠️ **CRITICAL RULES:**
- **ALWAYS use safe-update-wrapper.js for database changes**
- **NEVER edit directly in Supabase without backup**
- **ALWAYS test locally first (even though it loads from database)**
- **Keep backups/ folder (it's git-ignored but essential)**
- **Remember the desktop lives in DATABASE, not local files**

Remember: **Preserve the magic of V1 while building the future in V2!**

## User Authentication System

ToyBox OS includes a complete user authentication system that allows users to log in and access personalized features across all windowed apps.

### Authentication Overview

The ToyBox OS authentication system provides:
- User registration and login via handle + 4-digit PIN
- Session persistence across browser sessions
- Real-time authentication broadcast to all open windows
- Integration with ZAD API for user data storage

### Database Schema

**Table**: `wtaf_zero_admin_collaborative`
**App ID**: `toybox-os-users` 
**Action Type**: `user_registry`

**User Record Structure**:
```json
{
    "handle": "bart",           // Username (3-15 characters)
    "pin": "1234",             // 4-digit numeric PIN
    "id": "bart",              // User ID (same as handle)
    "created": "2025-01-21T..."  // ISO timestamp
}
```

### Profile/Login Button

The profile button is located in the upper right corner of the menu bar:

```html
<div id="profile-icon" onclick="toggleAuth(event)">
    <span id="profile-emoji">👤</span>
    <span id="username-display"></span>
</div>
```

**Visual States**:
- **Not logged in**: Shows `👤` with empty username display
- **Logged in**: Shows `👤 username` with user's handle

### Authentication Flow

#### 1. Login Process
```javascript
async function doLogin() {
    const handle = document.getElementById('loginHandle').value.trim();
    const pin = document.getElementById('loginPin').value;
    
    // Load all users from ZAD
    const response = await fetch('/api/zad/load?app_id=toybox-os-users&action_type=user_registry');
    const users = await response.json();
    
    // Find matching user
    const user = users.find(u => 
        u.content_data && 
        u.content_data.handle === handle && 
        u.content_data.pin === pin
    );
    
    if (user) {
        currentToyBoxUser = user.content_data;
        localStorage.setItem('toybox_user', JSON.stringify(currentToyBoxUser));
        updateProfileDisplay();
        broadcastAuth();
    }
}
```

#### 2. Registration Process
```javascript
async function doRegister() {
    const userData = {
        handle: handle,
        pin: pin,
        id: handle,
        created: new Date().toISOString()
    };
    
    // Save to ZAD system
    const saveResponse = await fetch('/api/zad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: 'toybox-os-users',
            data_type: 'user_registry',
            content_data: userData,
            participant_id: handle,
            action_type: 'user_registry'
        })
    });
}
```

#### 3. Session Persistence
- User data stored in `localStorage` as `toybox_user`
- Session automatically restored on page load
- Survives browser restarts and tab refreshes

```javascript
function initToyBoxAuth() {
    const savedUser = localStorage.getItem('toybox_user');
    if (savedUser) {
        try {
            currentToyBoxUser = JSON.parse(savedUser);
            updateProfileDisplay();
        } catch (e) {
            localStorage.removeItem('toybox_user');
        }
    }
}
```

### How Windowed Apps Access User Data

#### 1. Authentication Broadcast System

ToyBox OS broadcasts authentication state to all open windows via `postMessage`:

```javascript
function broadcastAuth() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            iframe.contentWindow.postMessage({
                type: 'TOYBOX_AUTH',
                user: currentUser  // Full user object or null
            }, '*');
        } catch (e) {
            // Silently fail if iframe not ready
        }
    });
}
```

#### 2. App-Side Authentication Handler

Windowed apps should include this pattern to receive authentication data:

```javascript
// Global variable to store current user
let currentUser = null;

// Listen for auth updates from ToyBox OS
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOYBOX_AUTH') {
        console.log('Received auth update:', event.data.user);
        currentUser = event.data.user;
        
        if (currentUser) {
            // User is logged in - update UI
            updateStatus(`Logged in as ${currentUser.handle}`);
        } else {
            // User is logged out - update UI
            updateStatus('Not logged in');
        }
    }
});

// Request current auth state when app loads
window.addEventListener('DOMContentLoaded', function() {
    // Also try localStorage as fallback
    const savedUser = localStorage.getItem('toybox_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
        } catch (e) {
            console.error('Failed to parse saved user');
        }
    }
    
    // Request fresh auth state from ToyBox OS
    window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
});
```

#### 3. Common User Data Access Patterns

**Check if user is logged in**:
```javascript
if (currentUser) {
    // User is logged in
    console.log('Username:', currentUser.handle);
    console.log('User ID:', currentUser.id);
} else {
    // User not logged in
    alert('Please login to use this feature');
}
```

**Get current username for display**:
```javascript
const displayName = currentUser ? currentUser.handle : 'Anonymous';
```

**Use in ZAD API calls**:
```javascript
async function saveUserData(data) {
    const response = await fetch('/api/zad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: window.APP_ID,
            participant_id: currentUser ? currentUser.handle : 'anonymous',
            action_type: 'user_data',
            content_data: data
        })
    });
}
```

### Complete Working Example: ToyBox Chat App

The ToyBox Chat app demonstrates proper authentication integration:

```javascript
// State management
let currentUser = null;

// Load auth from localStorage (backup method)
function loadAuth() {
    const savedUser = localStorage.getItem('toybox_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            updateStatus(`Logged in as ${currentUser.handle}`);
        } catch (e) {
            updateStatus('Not logged in');
        }
    }
}

// Send message with authentication
async function sendMessage() {
    if (!currentUser) {
        alert('Please login to send messages');
        return;
    }
    
    const message = {
        text: text,
        author: currentUser.handle,  // Use authenticated username
        timestamp: new Date().toISOString(),
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    await save('chat_message', message);
}

// Listen for auth changes from ToyBox OS
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOYBOX_AUTH') {
        currentUser = event.data.user;
        if (currentUser) {
            updateStatus(`Logged in as ${currentUser.handle}`);
        } else {
            updateStatus('Not logged in');
        }
    }
});

// Initialize
window.addEventListener('DOMContentLoaded', function() {
    loadAuth();  // Fallback method
});
```

### Common Pitfalls and Solutions

#### ❌ Wrong: Using `.username`
```javascript
const name = currentUser.username;  // UNDEFINED - wrong field
```

#### ✅ Correct: Using `.handle`
```javascript
const name = currentUser.handle;  // Works - correct field
```

#### ❌ Wrong: Not handling null user
```javascript
const name = currentUser.handle;  // ERROR if user is null
```

#### ✅ Correct: Always check for null
```javascript
const name = currentUser ? currentUser.handle : 'Anonymous';
```

#### ❌ Wrong: Only using localStorage
```javascript
// Only checks localStorage - misses real-time updates
const savedUser = localStorage.getItem('toybox_user');
```

#### ✅ Correct: Using postMessage + localStorage fallback
```javascript
// Listen for real-time updates AND check localStorage
window.addEventListener('message', handleAuthUpdate);
window.addEventListener('DOMContentLoaded', loadAuthFallback);
```

### Authentication Security Model

1. **Local Authentication**: Handle + PIN stored in ZAD database
2. **Session Management**: localStorage for persistence
3. **No Passwords**: 4-digit numeric PINs for simplicity
4. **User Isolation**: Each app uses participant_id for data separation
5. **No Cross-App Data**: User data isolated by app_id

### Testing Authentication Integration

To test authentication in your windowed app:

1. **Open ToyBox OS**: https://webtoys.ai/public/toybox-os
2. **Login/Register**: Click profile icon, create account or sign in
3. **Open your app**: Click app icon to open in window
4. **Check console**: Look for auth messages and currentUser object
5. **Test features**: Verify app respects login state

### Global Variables Reference

**In ToyBox OS main window**:
- `currentToyBoxUser` - Main user object
- `currentUser` - Sync variable for compatibility

**In windowed apps**:
- `currentUser` - User object received from ToyBox OS
- Available fields: `handle`, `pin`, `id`, `created`

**localStorage key**: `toybox_user` - JSON string of user object