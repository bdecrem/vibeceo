# ToyBox OS / Community Desktop V2

## Project Overview

**ToyBox OS** is an evolution of the Community Desktop that transforms it from a collection of simple JavaScript alerts into a full **windowed operating system** running in the browser. Users can open real applications in draggable, resizable windows while still enjoying the simple one-click toys from V1.

### Live URL
- Production: https://webtoys.ai/public/toybox-os
- Community Notepad: https://webtoys.ai/public/community-notepad

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

## Contributing

To add a new app to ToyBox OS:

1. Create the app following the ZAD template
2. Test locally in test-desktop.html
3. Deploy to Supabase as /public/[app-name]
4. Add to windowedApps registry in toybox-os.html
5. Update the desktop with new icon
6. Submit PR with changes

Remember: **Preserve the magic of V1 while building the future in V2!**