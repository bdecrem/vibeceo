# Lightweight Safari Extension Install (No Xcode Required)

## For macOS Sequoia (15.0) Beta

### Method 1: Developer Settings

1. In Safari, go to **Develop → Developer Settings...**
2. Look for an option to enable/load unsigned extensions
3. If there's an "Add Extension" or similar option, use it to load the `webtoys-extension` folder

### Method 2: Direct Load via Terminal

Try this command to see if Safari has a built-in extension loader:

```bash
# In the webtoys-extension directory
open -a Safari .
```

### Method 3: Convert to Simple User Script

If the above don't work, we can convert this to a userscript that doesn't need installation:

1. Create a bookmark with JavaScript
2. Use Safari's built-in userscript support
3. Or use the Web Extension Background Content menu option you have

### Check Safari Settings

Also check:
- Safari → Settings → Extensions
- Safari → Settings → Advanced → Show features for web developers
- Safari → Settings → Websites (might have extension options)

Let me know what you see in Developer Settings!