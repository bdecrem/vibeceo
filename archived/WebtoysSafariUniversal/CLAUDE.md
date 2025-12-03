# Webtoys Safari Extension - Authentication System Documentation

## Overview

The Webtoys Safari Extension allows administrators to manage app metadata (featured, trending, hotness, hidden status) directly from any Webtoys page. The extension requires authentication to communicate with the Webtoys API.

## Authentication Flow

### 1. Extension Configuration
The Safari extension needs two pieces of information:
- **API URL**: The Webtoys server endpoint (e.g., `http://localhost:3000` or `https://webtoys.ai`)
- **Auth Token**: A Bearer token for API authentication

### 2. How Authentication Works

#### Step 1: Web Login
1. Navigate to the extension login page:
   - Local: `http://localhost:3000/extension-login.html`
   - Production: `https://webtoys.ai/extension-login.html`

2. Sign in using one of two methods:
   - **Quick Setup**: Click "Sign In with Supabase" (uses pre-configured service token)
   - **Manual Setup**: Enter a custom token if you have one

3. The login page sets two localStorage values:
   ```javascript
   localStorage.setItem('webtoysAuthToken', 'Bearer M2a/gemOStrxNhh4fygtZuEBdTbDmO68s35IrFO5ay0=');
   localStorage.setItem('webtoysApiUrl', 'http://localhost:3000');
   ```

#### Step 2: Extension Setup
1. Open the Safari extension popup
2. In the Settings section (click to expand):
   - Enter the **API URL** shown on the login page
   - Enter the **Auth Token** (including "Bearer " prefix)
3. Click "Save Configuration"
4. Click "Test Connection" to verify

#### Step 3: Using Superpower Mode
For admin features on special pages like the Issue Tracker:
1. Add `?superpower=true` to the URL
2. The page checks localStorage for authentication
3. If authenticated, shows "⚡ SUPERPOWER MODE - AUTHENTICATED"
4. Admin controls become available

## Authentication Architecture

### Extension Side (popup.js)
- Stores credentials in `chrome.storage.local`:
  ```javascript
  chrome.storage.local.set({
      apiUrl: 'http://localhost:3000',
      authToken: 'Bearer YOUR_TOKEN'
  });
  ```
- Sends authenticated requests to `/api/wtaf/extension`

### API Side (route.ts)
- Validates Bearer token in Authorization header
- Uses Supabase service key for database operations
- Supports CORS for cross-origin requests from extension

### Issue Tracker Integration
The Issue Tracker has special superpower mode support:

1. **URL Parameter Detection**:
   - Checks for `?superpower=true` in URL
   - Activates enhanced admin interface

2. **Authentication Check**:
   ```javascript
   // The issue tracker checks for auth in this order:
   1. window.SUPERPOWER_AUTH (postMessage bridge for iframes)
   2. localStorage.getItem('webtoysAuthToken') (direct page access)
   3. chrome.storage API (Safari extension context)
   ```

3. **Bridge System**:
   - When in an iframe, uses postMessage to request auth from parent
   - Parent window can provide auth via postMessage response
   - Fallback to localStorage for standalone pages

## Important URLs

### Local Development
- Extension Login: `http://localhost:3000/extension-login.html`
- Issue Tracker (Admin): `http://localhost:3000/bart/issue-tracker?superpower=true`
- Test Extension API: `http://localhost:3000/test-extension.html`

### Production
- Extension Login: `https://webtoys.ai/extension-login.html`
- Issue Tracker (Admin): `https://webtoys.ai/bart/issue-tracker?superpower=true`

## Troubleshooting

### "Not Authenticated" in Extension
1. Make sure you've logged in via `/extension-login.html`
2. Check that the API URL includes protocol (`http://` or `https://`)
3. Verify the token includes "Bearer " prefix
4. Try "Test Connection" button

### Superpower Mode Not Working
1. Ensure `?superpower=true` is in the URL
2. Check browser console for auth errors:
   ```javascript
   // Run in console to debug
   console.log('Auth Token:', localStorage.getItem('webtoysAuthToken'));
   console.log('API URL:', localStorage.getItem('webtoysApiUrl'));
   ```
3. Re-run the login process if needed

### CORS Errors
- The API includes CORS headers for `*` origin
- Safari extensions require proper manifest permissions
- Check that `manifest.json` includes localhost in host_permissions

## Security Notes

1. **Service Token**: The current implementation uses a shared service token. In production, this should be replaced with user-specific tokens.

2. **localStorage**: Auth tokens in localStorage are accessible to any script on the domain. This is acceptable for admin tools but not for sensitive user data.

3. **CORS**: The wildcard CORS policy (`*`) is convenient for development but should be restricted in production.

## Quick Setup Guide

### For New Users
1. Go to `http://localhost:3000/extension-login.html`
2. Click "Sign In with Supabase"
3. Copy the displayed token and URL
4. Open Safari Extension popup
5. Paste credentials and save
6. Visit `http://localhost:3000/bart/issue-tracker?superpower=true`
7. You should see "⚡ SUPERPOWER MODE - AUTHENTICATED"

### For Developers
To manually enable superpower mode without the extension:
```javascript
// Run in browser console
localStorage.setItem('webtoysAuthToken', 'Bearer M2a/gemOStrxNhh4fygtZuEBdTbDmO68s35IrFO5ay0=');
localStorage.setItem('webtoysApiUrl', 'http://localhost:3000');
// Refresh the page with ?superpower=true
```

## Files Involved

### Extension Files
- `/WebtoysSafariUniversal/WebtoysSafariExtension-Simple/popup.js` - Extension UI and auth storage
- `/WebtoysSafariUniversal/WebtoysSafariExtension-Simple/content.js` - Page detection and state management
- `/WebtoysSafariUniversal/WebtoysSafariExtension-Simple/manifest.json` - Extension permissions

### Web Files  
- `/web/public/extension-login.html` - Login bridge page
- `/web/app/api/wtaf/extension/route.ts` - API endpoint for extension
- `/sms-bot/agent-issue-tracker/issue-tracker-zad-app.html` - Issue tracker with superpower support

### Debug Files
- `/web/public/test-extension.html` - Test page for API connection
- `/sms-bot/agent-issue-tracker/debug-auth.js` - Console commands for debugging auth

## Future Improvements

1. **User-Specific Tokens**: Generate unique tokens per user instead of shared service token
2. **Token Refresh**: Implement token expiration and refresh mechanism  
3. **Role-Based Access**: Different permission levels for different admin roles
4. **Audit Logging**: Track all admin actions for accountability
5. **2FA Support**: Add two-factor authentication for admin access