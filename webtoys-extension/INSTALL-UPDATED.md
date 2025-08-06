# How to Install Webtoys Extension in Safari (Updated Method)

## Method 1: Direct Safari Developer Mode (Easiest)

1. **Enable Developer Mode in Safari**
   - Open Safari
   - Go to Safari → Settings → Advanced
   - Check "Show features for web developers"

2. **Enable Unsigned Extensions**
   - In Safari menu bar: Develop → Allow Unsigned Extensions
   - You'll need to do this each time you restart Safari

3. **Load the Extension**
   - In Safari: Develop → Show Extension Builder
   - Click the "+" button and choose "Add Extension..."
   - Navigate to and select the `webtoys-extension` folder
   - Click "Run" to load the extension

## Method 2: Create Xcode Project (Permanent)

If the above doesn't work, we need to create a proper Xcode project:

1. **Open Xcode**
2. **Create New Project**
   - File → New → Project
   - Choose "Safari Extension App" template
   - Name it "WebtoysExtension"
3. **Replace the Extension Files**
   - In Xcode, find the extension folder (usually under "WebtoysExtension Extension")
   - Replace the generated files with our files from `webtoys-extension/`
   - Copy over: manifest.json, popup.html, scripts/, styles/, images/

## Quick Test Alternative

For quick testing without Xcode, you can also:
1. Rename the folder to have `.safariextension` suffix
2. Double-click to install (though this is deprecated)

## Troubleshooting

If you're still having issues, try:
- Make sure Xcode is fully installed (not just Command Line Tools)
- Check Xcode → Settings → Locations → Command Line Tools is set
- Try `sudo xcode-select --install` to ensure tools are installed