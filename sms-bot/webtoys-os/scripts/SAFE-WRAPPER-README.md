# WebtoysOS Safe Wrapper System

## 🔒 Overview

The Safe Wrapper system ensures that ANY update to the WebtoysOS desktop:
1. **Backs up** the current version before changes
2. **Validates** the HTML for required components
3. **Updates** the database safely
4. **Maintains** backup history for easy rollback

## 🚀 Quick Start

### Basic Usage in Scripts

```javascript
import { fetchCurrentDesktop, safeUpdateDesktop } from './safe-wrapper.js';

// Get current desktop HTML from database
const current = await fetchCurrentDesktop(true); // true = test, false = production
let html = current.html_content;

// Make your changes
html = html.replace('old content', 'new content');

// Safe update with automatic backup
await safeUpdateDesktop(html, 'Description of changes', true);
```

### Restore from Backup

```bash
# Restore from latest backup
node scripts/restore-backup.js

# Restore from specific backup
node scripts/restore-backup.js toybox-os-v3-test_2025-08-29_14-30-00.html

# List all backups and choose
node scripts/restore-backup.js list

# Restore production (requires confirmation)
node scripts/restore-backup.js latest --prod
```

## 📁 File Structure

```
webtoys-os/
├── scripts/
│   ├── safe-wrapper.js           # Core safe wrapper functionality
│   ├── restore-backup.js         # Easy restore utility
│   └── example-safe-update.js    # Example usage
└── backups/                       # Automatic backups (git-ignored)
    ├── toybox-os-v3-test_2025-08-29_14-30-00.html
    ├── toybox-os-v3-test_2025-08-29_14-30-00.json
    └── toybox-os-v3-test_latest-backup.html
```

## 🎯 Key Functions

### `fetchCurrentDesktop(isTest)`
Fetches the current desktop HTML from the database.
- `isTest: true` - Fetch test version (toybox-os-v3-test)
- `isTest: false` - Fetch production version (toybox-os-v3)

### `safeUpdateDesktop(html, description, isTest)`
Updates the desktop with automatic backup and validation.
- `html` - The modified HTML content
- `description` - Description of what changed
- `isTest` - Whether to update test or production

### `restoreFromBackup(backupFile, isTest)`
Restores desktop from a backup file.
- `backupFile` - Filename or path to backup
- `isTest` - Whether to restore to test or production

### `listBackups(appSlug)`
Lists all available backups with metadata.
- `appSlug` - Optional filter by app slug

## ⚠️ Important Rules

### ALWAYS Use Safe Wrapper
```javascript
// ❌ NEVER do this - direct database update
await supabase.from('wtaf_content').update({ html_content: newHtml });

// ✅ ALWAYS do this - safe wrapper with backup
await safeUpdateDesktop(newHtml, 'Description');
```

### Test Before Production
```javascript
// Update test version first
await safeUpdateDesktop(html, 'Testing new feature', true);

// After testing, update production
await safeUpdateDesktop(html, 'Deploy new feature', false);
```

### Include Meaningful Descriptions
```javascript
// ❌ Bad - vague description
await safeUpdateDesktop(html, 'Update');

// ✅ Good - clear description
await safeUpdateDesktop(html, 'Added Words app icon and made it resizable');
```

## 🛡️ Validation Checks

The safe wrapper validates HTML before updating:
- ✅ Has desktop container
- ✅ Has window container
- ✅ Has menu bar
- ✅ Valid HTML structure
- ⚠️ Warns about eval() or Function()
- ❌ Blocks dangerous code

## 💾 Backup Management

### Automatic Backups
Every update creates:
- **HTML backup**: `toybox-os-v3-test_[timestamp].html`
- **Metadata file**: `toybox-os-v3-test_[timestamp].json`
- **Latest backup**: `toybox-os-v3-test_latest-backup.html`

### Backup Metadata
```json
{
  "backed_up_at": "2025-08-29T14:30:00Z",
  "description": "Added Words app icon",
  "file_size": 67890,
  "backup_file": "backups/toybox-os-v3-test_2025-08-29_14-30-00.html",
  "app_slug": "toybox-os-v3-test"
}
```

## 📝 Examples

### Add New App Icon
```javascript
import { fetchCurrentDesktop, safeUpdateDesktop } from './safe-wrapper.js';

const current = await fetchCurrentDesktop(true);
let html = current.html_content;

// Add new icon
const newIcon = `
<div class="desktop-icon" onclick="openWindow(windowedApps['my-app'])">
    <span class="icon-image">🎯</span>
    <span class="icon-label">My App</span>
</div>`;

html = html.replace('<!-- Desktop icons -->', `<!-- Desktop icons -->\n${newIcon}`);

await safeUpdateDesktop(html, 'Added My App icon to desktop', true);
```

### Remove App Icon
```javascript
const current = await fetchCurrentDesktop(true);
let html = current.html_content;

// Remove specific icon
const iconPattern = /<div class="desktop-icon"[^>]*>[\s\S]*?My App[\s\S]*?<\/div>/;
html = html.replace(iconPattern, '');

await safeUpdateDesktop(html, 'Removed My App icon', true);
```

### Update Window Registry
```javascript
const current = await fetchCurrentDesktop(true);
let html = current.html_content;

// Add app to windowedApps
const registryAddition = `
windowedApps['my-app'] = {
    name: 'My App',
    url: '/public/my-app',
    icon: '🎯',
    width: 800,
    height: 600,
    resizable: true
};`;

html = html.replace('// End of app registry', `${registryAddition}\n// End of app registry`);

await safeUpdateDesktop(html, 'Added My App to window registry', true);
```

## 🔄 Recovery Procedures

### If Update Goes Wrong
1. **Don't panic** - backups are automatic
2. **Check backups**: `node scripts/safe-wrapper.js list`
3. **Restore latest**: `node scripts/restore-backup.js`
4. **Or restore specific**: `node scripts/restore-backup.js [filename]`

### Emergency Production Restore
```bash
# This requires typing "yes" to confirm
node scripts/restore-backup.js latest --prod
```

## 🎨 Best Practices

1. **Test First**: Always update test version before production
2. **Small Changes**: Make incremental updates, not massive rewrites
3. **Clear Descriptions**: Future you will thank present you
4. **Check Backups**: Regularly verify backups are being created
5. **Git Commit**: Commit your update scripts (not the backups folder)

## 🚫 Common Mistakes

### Forgetting to Import
```javascript
// ❌ Wrong - undefined function
await safeUpdateDesktop(html, 'Update');

// ✅ Right - import first
import { safeUpdateDesktop } from './safe-wrapper.js';
await safeUpdateDesktop(html, 'Update');
```

### Wrong Environment
```javascript
// ❌ Updating production by accident
await safeUpdateDesktop(html, 'Test feature', false); // false = PRODUCTION!

// ✅ Update test first
await safeUpdateDesktop(html, 'Test feature', true); // true = test
```

### Not Checking Current Content
```javascript
// ❌ Overwriting without checking
const html = '<html>...</html>';
await safeUpdateDesktop(html, 'Complete rewrite');

// ✅ Modify existing content
const current = await fetchCurrentDesktop(true);
let html = current.html_content;
// ... make changes to existing HTML
await safeUpdateDesktop(html, 'Updated specific feature');
```

## 🔗 Related Documentation

- Main WebtoysOS docs: `/webtoys-os/CLAUDE.md`
- Desktop deployment: `/webtoys-os/scripts/deploy.js`
- App deployment: `/webtoys-os/scripts/auto-deploy-app.js`

## 💡 Tips

- The `backups/` folder is git-ignored but essential - don't delete it
- Latest backup is always available as `*_latest-backup.html`
- You can manually edit backups before restoring if needed
- Production updates should be rare and well-tested
- Use meaningful descriptions - they're saved in metadata

Remember: **The safe wrapper is your safety net. Always use it!**