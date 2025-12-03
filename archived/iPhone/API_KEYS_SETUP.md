# API Keys Setup for iOS App

## Secure API Key Configuration

The app now uses a secure configuration system that prevents API keys from being committed to git.

### Setup Process:

1. **Copy the template file:**
   ```bash
   cp iPhone/Webtoys/Webtoys/APIKeys.plist.template iPhone/Webtoys/Webtoys/APIKeys.plist
   ```

2. **Edit APIKeys.plist with your actual API key:**
   - Replace `your_api_key_here` with your real Anthropic API key
   - The APIKeys.plist file is gitignored and will never be committed

3. **Add the file to Xcode:**
   - Open Webtoys.xcodeproj
   - Right-click on the Webtoys folder in the navigator
   - Choose "Add Files to Webtoys"
   - Select APIKeys.plist
   - Make sure it's added to the Webtoys target

### How It Works:

1. **Environment Variables (Xcode)**: When running from Xcode, uses scheme environment variables
2. **Local Plist File (Device)**: When running on device, reads from APIKeys.plist bundle resource
3. **Security**: APIKeys.plist is gitignored and never committed to version control

### File Structure:
```
APIKeys.plist
├── ANTHROPIC_API_KEY: your_actual_key_here
```

This system ensures your API key is secure and works both in development and on device builds.