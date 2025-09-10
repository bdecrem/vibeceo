# Auto-Deploy Scripts Documentation

## Overview

The auto-deploy system is the core mechanism for deploying HTML applications to WebtoysOS. It handles the complete workflow from local development files to live applications running on the desktop.

## Primary Script: `auto-deploy-app.js`

**Location:** `/sms-bot/webtoys-os/scripts/auto-deploy-app.js`

### Usage

```bash
cd /sms-bot/webtoys-os
node scripts/auto-deploy-app.js apps/[filename].html [optional-icon]
```

**Examples:**
```bash
# Deploy with auto-detected icon
node scripts/auto-deploy-app.js apps/calculator.html

# Deploy with custom icon
node scripts/auto-deploy-app.js apps/pixel-art.html 🎨
```

## Deployment Process

The auto-deploy script follows this workflow:

### 1. **File Reading & Validation**
- Reads HTML file from `/apps/` directory
- Validates file exists and is readable
- Calculates file size and content hash

### 2. **Metadata Extraction**
- **App Name**: Extracted from `<title>` tag
- **Canvas Detection**: Scans for canvas elements and dimensions
- **App Slug**: Generated as `toybox-[app-name]`
- **Icon**: Uses provided icon or detects from content
- **Dimensions**: Detects canvas size or uses default window size

### 3. **Backup Creation**
- Creates timestamped backup of existing app (if exists)
- Backup location: `/backups/apps/toybox-[app-name]_YYYY-MM-DD_HH-MM-SS_before_update.html`
- Ensures rollback capability

### 4. **Database Deployment**
Deploys to Supabase `wtaf_content` table:
```sql
{
  user_slug: 'public',
  app_slug: 'toybox-[app-name]',
  html_content: [complete HTML],
  og_image_url: [optional],
  og_image_override: [boolean]
}
```

### 5. **Desktop Registration**
Updates `wtaf_desktop_config` table:
- Adds entry to `app_registry` array
- Sets icon position on desktop
- Configures window properties (width, height, resizable)

### 6. **URL Generation**
Makes app accessible at:
- **Public URL**: `https://webtoys.ai/public/toybox-[app-name]`
- **Desktop**: Appears as windowed app on WebtoysOS

## Architecture Principles

### Database-Centric Design
- **Source of Truth**: Live apps exist in Supabase tables
- **Local files are templates**: Used only for development and deployment
- **No direct file serving**: Apps are retrieved from database

### Deployment vs Development
```
Development Flow:
Local HTML File → Edit → Auto-Deploy → Database → Live App

NOT:
Local HTML File → Direct Access (this doesn't work)
```

### Key Tables

#### `wtaf_content`
Stores all app HTML content:
- `user_slug`: Always 'public' for WebtoysOS apps
- `app_slug`: Unique identifier (e.g., 'toybox-calculator')
- `html_content`: Complete HTML including CSS and JavaScript

#### `wtaf_desktop_config`
Desktop configuration and app registry:
- `desktop_version`: 'webtoys-os-v3'
- `app_registry`: JSON array of all registered apps
- `icon_positions`: JSON object with desktop icon coordinates

## Directory Structure

```
/sms-bot/webtoys-os/
├── apps/                    # App source files (templates)
│   ├── calculator.html
│   ├── pixel-art.html
│   └── [other apps].html
├── scripts/                 # Deployment scripts
│   ├── auto-deploy-app.js   # Main deployment script
│   └── [other scripts]
├── backups/                 # Automatic backups
│   └── apps/               # App-specific backups
├── docs/                   # Documentation
└── core/                   # Desktop environment files
```

## Critical Rules

### For Developers
1. **Always use auto-deploy**: Never manually edit Supabase database
2. **Local changes need deployment**: Modifying local HTML files doesn't affect live apps
3. **Test after deployment**: Always verify app works on actual desktop
4. **Commit source files**: Keep local templates in git for version control

### For Apps
1. **Self-contained HTML**: All CSS and JavaScript must be embedded
2. **WebtoysOS integration**: Use desktop auth patterns for user data
3. **ZAD API compliance**: Use `/api/zad/save` and `/api/zad/load` for data storage
4. **Responsive design**: Must work in desktop windows and mobile contexts

## Common Workflows

### Creating New App
```bash
# 1. Create HTML file
touch apps/my-new-app.html

# 2. Develop app content
# (edit apps/my-new-app.html)

# 3. Deploy to desktop
node scripts/auto-deploy-app.js apps/my-new-app.html 🎯

# 4. Test on desktop
# Visit: https://webtoys.ai/public/toybox-os-v3-test
```

### Updating Existing App
```bash
# 1. Modify local file
# (edit apps/existing-app.html)

# 2. Redeploy
node scripts/auto-deploy-app.js apps/existing-app.html

# 3. Verify changes live
# Check: https://webtoys.ai/public/toybox-existing-app
```

### Emergency Rollback
```bash
# 1. Find backup file
ls backups/apps/toybox-[app-name]_*

# 2. Copy backup to apps/ directory
cp backups/apps/toybox-[app-name]_[timestamp]_before_update.html apps/[app-name].html

# 3. Redeploy backup
node scripts/auto-deploy-app.js apps/[app-name].html
```

## Troubleshooting

### App Not Appearing on Desktop
- Check deployment succeeded without errors
- Verify app appears in database: `wtaf_content` table
- Check desktop config: `wtaf_desktop_config.app_registry`
- Try refreshing desktop page

### App Shows Outdated Content
- Deployment may have failed - check console output
- Browser cache - hard refresh desktop page
- Database not updated - re-run deployment script

### Deployment Script Errors
- **File not found**: Verify path to HTML file
- **Database connection**: Check Supabase credentials in `.env.local`
- **Permissions**: Ensure script has read/write access to files

## Advanced Features

### Custom Window Sizing
The script auto-detects canvas elements and sets window dimensions accordingly:
```html
<!-- This will create a 500x400 window -->
<canvas width="500" height="400"></canvas>
```

### Icon Detection
Icons can be:
- Provided as second parameter: `node scripts/auto-deploy-app.js app.html 🎮`
- Auto-detected from app content patterns
- Default to 📱 if none specified

### Backup System
- Automatic backup before every update
- Timestamped for easy identification
- Preserves previous version for rollback
- Stored outside git to avoid repository bloat

## Integration with Edit Agent

The auto-deploy system integrates with the WebtoysOS Edit Agent:
- Agent uses same deployment scripts for automated app creation
- Follows identical workflow for consistency
- Ensures all apps (manual and automated) use same deployment process

## Security Considerations

- **Environment variables**: All credentials stored in `.env.local`
- **No hardcoded secrets**: Script relies on environment configuration
- **Backup protection**: Backups stored locally, not exposed publicly
- **Database validation**: Script validates data before deployment

## Performance Notes

- **Deployment speed**: Typically completes in 2-3 seconds
- **Backup efficiency**: Only backs up when content changes
- **Database optimization**: Uses upsert operations for efficiency
- **File size limits**: Large apps may need optimization

## Future Enhancements

Potential improvements to the auto-deploy system:
- Batch deployment for multiple apps
- Staging environment deployment
- Automated testing integration
- Version tagging and release management
- Rollback automation with UI