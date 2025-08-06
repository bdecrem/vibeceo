# How to Install Webtoys Extension in Safari

## Prerequisites
- macOS with Safari 14 or later
- Xcode installed (free from App Store)

## Installation Steps

1. **Enable Developer Mode in Safari**
   - Open Safari
   - Go to Safari → Preferences → Advanced
   - Check "Show Develop menu in menu bar"

2. **Allow Unsigned Extensions**
   - Go to Develop menu → Allow Unsigned Extensions
   - You may need to quit and restart Safari

3. **Convert to Safari Extension**
   - Open Terminal
   - Navigate to the webtoys-extension folder
   - Run: `xcrun safari-web-extension-converter .`
   - This will open Xcode with your extension project

4. **Build in Xcode**
   - In Xcode, select your Mac as the target device
   - Click the Play button (or press Cmd+R) to build and run
   - Safari will open with your extension installed

5. **Enable the Extension**
   - Go to Safari → Preferences → Extensions
   - Find "Webtoys Manager" and check the box to enable it
   - You should see the purple "W" icon in your toolbar!

## Testing
- Click the toolbar icon to see "Hello World!" popup
- Visit webtoys.ai to see console logs from the content script
- Check Safari's Web Inspector console for debug messages