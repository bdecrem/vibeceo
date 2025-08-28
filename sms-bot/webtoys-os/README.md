# WebtoysOS v3 - Modern Desktop Environment

## Overview

WebtoysOS v3 is a complete modernization of the ToyBox OS desktop environment, built with mobile-first responsive design and improved maintainability.

## Project Status

🚧 **Currently in Development** - Building parallel to existing system
- Production system remains at `/public/toybox-os` 
- Test system deploys to `/public/toybox-os-v3-test`
- Original v2 system continues working unchanged

## Directory Structure

```
webtoys-os/
├── core/                    # Core desktop & window management
│   ├── desktop.html        # Main desktop HTML (mobile-first)
│   ├── window-manager.js   # Modern window system
│   └── auth-manager.js     # Centralized authentication
│
├── apps/                    # WebtoysOS applications
│   ├── issue-tracker/      # Rebuilt issue tracker with UPDATE logic
│   ├── notepad/           # Text editor app
│   └── [other apps]/      # Future apps
│
├── lib/                     # Shared libraries
│   ├── zad-client.js       # ZAD API wrapper
│   ├── desktop-api.js      # Desktop integration API
│   └── theme-engine.js     # Theme system
│
├── scripts/                 # Management scripts
│   ├── deploy.js           # Deploy to test/production
│   ├── backup.js           # Backup utilities
│   └── update.js           # Update helpers
│
├── agent/                   # Edit agent integration
│   ├── monitor.js          # Issue monitoring
│   ├── executor.js         # Task execution
│   └── claude-interface.js # Claude Code integration
│
├── docs/                    # Documentation
│   └── architecture.md     # System architecture
│
└── backups-v3-start/       # Pre-development backups
    ├── webtoys-os-v2_*.html
    ├── system7-wos-v2_*.css
    └── toybox-issue-tracker_*.html
```

## Key Improvements in v3

### 1. Mobile-First Design
- Responsive grid layout for icons
- Touch-friendly interactions
- Windows adapt to viewport size
- Works on all devices from day one

### 2. Better Data Management
- New `wtaf_desktop_config` table for settings
- UPDATE operations instead of INSERT-only
- Proper state management
- Icon positions persist correctly

### 3. Maintainable Architecture
- Clean separation of concerns
- Modular component structure
- No more embedded logic in HTML
- Easy to add new features

### 4. Preserved Core Features
- **Same authentication system** (handle + PIN)
- **Same ZAD API** for apps
- **Same database tables** for app data
- **Same app structure** - no changes needed to existing apps

## Development Approach

### Non-Destructive Development
1. All v3 work happens in parallel
2. Original system remains untouched
3. Test at different URLs first
4. Switch only when fully ready

### Testing URLs
- **Current Production**: `https://webtoys.ai/public/toybox-os`
- **v3 Testing**: `https://webtoys.ai/public/toybox-os-v3-test`
- **Issue Tracker Test**: `https://webtoys.ai/public/issue-tracker-test`

## Quick Start

### Deploy test version:
```bash
cd scripts
node deploy.js --test
```

### Run locally:
```bash
cd /Users/bartdecrem/Documents/code/vibeceo8/web
npm run dev
# Visit http://localhost:3000/public/toybox-os-v3-test
```

### Rollback if needed:
```bash
# Just delete test apps from Supabase
# Original system unchanged
```

## Architecture Decisions

### Option 1 Selected (Simple & Powerful)
- Desktop HTML remains in `wtaf_content` 
- New `wtaf_desktop_config` table for dynamic data
- Icon positions, settings stored separately
- Much easier maintenance

### Why Not Option 2?
- Option 2 (full component system) is overkill
- Option 1 gives us everything we need
- Can migrate to Option 2 later if needed

## Migration Path

1. **Phase 1** (Current): Build v3 in parallel
2. **Phase 2**: Test thoroughly at test URLs
3. **Phase 3**: Get user feedback
4. **Phase 4**: Deploy to production when ready
5. **Rollback**: Can revert anytime if issues

## Contributing

### Adding New Apps
1. Create app in `apps/[app-name]/`
2. Follow ZAD app template
3. Register in desktop config
4. Test on mobile first

### Modifying Desktop
1. Edit `core/desktop.html`
2. Test locally first
3. Deploy to test URL
4. Never touch production until approved

## Important Notes

⚠️ **Apps Don't Change**: All existing WebtoysOS apps work without modification
⚠️ **Database Compatible**: Uses same tables, just better
⚠️ **Rollback Safe**: Can abandon v3 anytime without breaking v2

## Support

For questions about v3 development:
1. Check this README
2. Look at example implementations in `core/`
3. Test at test URLs first
4. Original system docs still apply for apps

---
*WebtoysOS v3 - Making the desktop work everywhere, for everyone*