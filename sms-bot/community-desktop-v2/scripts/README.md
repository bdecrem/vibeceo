# ToyBox OS Scripts

This directory contains all the utility scripts for managing ToyBox OS.

## Main Scripts

### `update-toybox.js` - Primary Update Script
**Use this for most changes going forward!**

```bash
# HTML changes
node update-toybox.js html "description" --change="type"

# CSS changes  
node update-toybox.js css "description" --change="type"
```

**Available change types:**
- HTML: `menu-item`, `icon-removal`, `padding-adjustment`
- CSS: `font-size`, `colors`, `layout`

### `safe-update-wrapper.js` - Core Safety System
Provides backup functionality for all HTML updates. Always use this for ToyBox OS HTML changes.

### Core Utility Scripts
- `check-theme-css.js` - Debug theme CSS content
- `debug-apple-css.js` - Debug Apple logo CSS specifically

## Legacy Scripts (Individual Changes)

These were created for specific one-off changes. Future changes should use `update-toybox.js`:

### Menu & UI Changes
- `add-cleanup-menu.js` - Added Clean Up menu item
- `add-dropdown-menu-css.js` - Added dropdown menu styling
- `remove-about-icon.js` - Removed About icon from desktop

### Apple Logo Changes
- `fix-apple-logo.js` → `fix-apple-logo-final.js` - Apple logo evolution
- `make-apple-logo-larger.js` - Increased Apple logo size

### Layout & Styling
- `fix-menu-bar-size.js` - Increased menu bar height and fonts
- `increase-top-padding.js` - Added more top padding for Clean Up

### Theme System
- `add-system7-theme.js` → `apply-system7-theme.js` - System 7 theme setup

## Best Practices Going Forward

1. **Use `update-toybox.js`** for new changes
2. **Edit the script** with specific modifications rather than creating new files
3. **Keep scripts organized** in this directory
4. **Use descriptive commit messages** when making changes
5. **Always test locally** before pushing to production

## Quick Commands

```bash
# Navigate to scripts directory
cd scripts/

# Make a script executable
chmod +x script-name.js

# Run with Node
node script-name.js
```