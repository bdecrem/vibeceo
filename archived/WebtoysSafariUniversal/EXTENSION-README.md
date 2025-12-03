# Webtoys Safari Extension - Simple Version

## Current Setup (August 2025)

We are using the **SIMPLE (non-Xcode) version** of the Safari extension for development.

### Why Simple Version?
- No Xcode required for changes
- Direct editing of HTML/JS/CSS files
- Faster development iteration
- Simpler debugging

### Extension Location
The working extension files are in:
```
WebtoysSafariExtension-Simple/
```

This folder contains the pure web extension files without any Xcode/Swift wrapper.

### How to Install

1. **Enable Developer Mode in Safari:**
   - Safari → Settings → Advanced → "Show features for web developers" ✓
   - Safari → Settings → Developer → "Allow Unsigned Extensions" ✓

2. **Convert & Install:**
   - Safari → Develop menu → "Web Extension Converter"
   - Click "Run"
   - Select the `WebtoysSafariExtension-Simple` folder
   - Click "Open"

3. **Activate:**
   - Safari → Settings → Extensions
   - Enable "Webtoys Manager"

### Making Changes

1. Edit files directly in `WebtoysSafariExtension-Simple/`
2. Key files:
   - `popup.html` - Extension popup UI
   - `scripts/popup.js` - Popup functionality
   - `scripts/content.js` - Content script for web pages
   - `scripts/background.js` - Background service worker
   - `manifest.json` - Extension configuration

3. After making changes:
   - Disable extension in Safari settings
   - Re-enable extension (this reloads your changes)
   - OR: Use Safari's extension reload button in developer tools

### Testing

The extension works on:
- https://webtoys.ai
- https://wtaf.me
- http://localhost (for local development)
- Any configured ngrok URLs

### Important Notes

- This is an **unsigned extension** - it will be disabled after Safari updates
- You'll need to re-enable "Allow Unsigned Extensions" after Safari updates
- Changes are loaded immediately when you disable/re-enable the extension
- For production/App Store distribution, use the Xcode version instead

### Xcode Version (Not Currently Used)

The Xcode project still exists in `WebtoysManager/` but we're not using it for development. It would be needed for:
- App Store distribution
- iOS/iPadOS support
- Code signing
- Native Swift features

For now, stick with the simple version for all development work.