# ToyBox OS / Community Desktop V2 (ACTIVE PROJECT)

⚠️ **This is the ACTIVE Community Desktop project. The v1 folder (`/sms-bot/community-desktop/`) is deprecated.**

## Project Overview

**ToyBox OS** is an evolution of the Community Desktop that transforms it from a collection of simple JavaScript alerts into a full **windowed operating system** running in the browser. Users can open real applications in draggable, resizable windows while still enjoying the simple one-click toys from V1.

### Live URL
- Production: https://webtoys.ai/public/toybox-os
- Community Notepad: https://webtoys.ai/public/community-notepad

## 🔴 CRITICAL: How to Update ToyBox OS

### ALWAYS Use the Safe Update System

**NEVER directly edit the HTML in Supabase without backing up first!**

#### For ANY ToyBox OS changes:

1. **Use the safe update wrapper**:
```javascript
import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

// Get current HTML
const current = await fetchCurrentToyBoxOS();
let html = current.html_content;

// Make your changes
html = html.replace('old', 'new');

// Safe update (automatic backup)
await safeUpdateToyBoxOS(html, 'Description of changes');
```

2. **Backups are automatically created** in `backups/` folder:
   - Timestamped: `toybox-os_2025-08-20_17-13-03.html`
   - Latest: `toybox-os_latest-backup.html`
   - Metadata: `.json` files with descriptions

3. **To restore from backup**:
```bash
node update-toybox-os.js backups/toybox-os_latest-backup.html
```

### Theme System Architecture

**ToyBox OS uses a dynamic theme engine:**

1. **HTML Structure** (stored in `wtaf_content` table):
   - Minimal embedded CSS (structural only)
   - Theme class on body: `<body class="theme-system7">`
   - `theme_id` field links to theme

2. **Theme CSS** (stored in `wtaf_themes` table):
   - Complete theme styling
   - Loaded dynamically by theme engine
   - Current theme: System 7 (ID: `2ec89c02-d424-4cf6-81f1-371ca6b9afcf`)

3. **To update theme CSS**:
```javascript
// Update theme in database
const { error } = await supabase
    .from('wtaf_themes')
    .update({ css_content: newCSS })
    .eq('id', 'theme-id-here');
```

### File Structure for Updates

```
community-desktop-v2/
├── backups/                    # Automatic backups (git-ignored)
│   ├── toybox-os_[timestamp].html
│   └── toybox-os_latest-backup.html
├── themes/
│   ├── base.css               # Minimal structural CSS
│   └── system7/
│       └── system7.css        # System 7 theme
├── safe-update-wrapper.js     # ALWAYS USE THIS for updates
├── update-toybox-os.js        # Manual update/restore tool
└── current-toybox-os.html     # Local working copy
```

### Update Workflow

1. **Always backup first** (automatic with safe-update-wrapper)
2. **Test locally** at http://localhost:3000/public/toybox-os
3. **Commit changes** to git for version control
4. **Never lose work** - backups folder preserves all versions

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

ToyBox OS will become a full collaborative desktop where:
- Users submit app ideas via SMS/form
- AI generates functional windowed apps
- Apps appear on everyone's desktop
- Community builds an OS together
- Simple toys and complex apps coexist

Think of it as "Windows 95 meets GitHub meets Wikipedia" - a collectively-built operating system where anyone can contribute an app.

## Common Update Scripts

### Remove an icon:
```javascript
// Use remove-paint-icon.js as template
const pattern = /<div class="desktop-icon"[^>]*>[\s\S]*?YourApp[\s\S]*?<\/div>/g;
htmlContent = htmlContent.replace(pattern, '');
await safeUpdateToyBoxOS(htmlContent, 'Removed YourApp icon');
```

### Add a new app:
```javascript
// Add to windowedApps registry
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

To add a new app to ToyBox OS:

1. Create the app following the ZAD template
2. Test locally in test-desktop.html
3. Deploy to Supabase as /public/[app-name]
4. **Use safe-update-wrapper.js to add icon to desktop**
5. Update the desktop with new icon
6. Submit PR with changes

⚠️ **CRITICAL RULES:**
- **ALWAYS use safe-update-wrapper.js for HTML changes**
- **NEVER edit directly in Supabase without backup**
- **ALWAYS test locally first**
- **Keep backups/ folder (it's git-ignored)**

Remember: **Preserve the magic of V1 while building the future in V2!**