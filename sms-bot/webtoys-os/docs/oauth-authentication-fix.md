# WebtoysOS Edit Agent OAuth Authentication Fix

**Date**: September 9, 2025  
**Issue**: Edit Agent failing with authentication errors  
**Resolution**: Successfully fixed by implementing OAuth token authentication

## The Problem

The WebtoysOS edit agent (`execute-open-issue-v2.js`) was failing to process issues from the Issue Tracker with misleading error messages:
- **"Credit balance is too low"** - This was actually an authentication failure, not a billing issue
- **"Invalid API key · Please run /login"** - The real underlying error

The agent had been broken since approximately September 4, 2025, preventing automated processing of community-submitted issues.

## Root Cause

The Claude CLI requires specific authentication that was conflicting with environment variables:
1. **Environment variable conflicts**: `ANTHROPIC_API_KEY` from `.env.local` was interfering with Claude CLI's built-in auth
2. **Missing OAuth token**: The agent wasn't providing the OAuth token needed for headless/cron execution
3. **Clean environment incomplete**: While we removed conflicting variables, we weren't providing the actual credential

## The Solution

### 1. Obtained Fresh OAuth Token
```bash
/Users/bartdecrem/.local/bin/claude setup-token
```
This generated a new OAuth token: `sk-ant-oat01-...`

### 2. Updated Edit Agent
Modified `execute-open-issue-v2.js` to include the OAuth token in the clean environment:
```javascript
const cleanEnv = {
    PATH: process.env.PATH,
    HOME: process.env.HOME,
    USER: process.env.USER,
    SHELL: process.env.SHELL,
    // CRITICAL: Add OAuth token for authentication
    CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN || 
        "sk-ant-oat01-..."
};
```

### 3. Secured Token Storage
Created secure storage for the OAuth token:
```bash
mkdir -p ~/.claude && chmod 700 ~/.claude
echo "sk-ant-oat01-..." > ~/.claude/oauth_token
chmod 600 ~/.claude/oauth_token
```

### 4. Updated Cron Configuration
Modified crontab to load OAuth token on each run:
```bash
*/2 * * * * CLAUDE_CODE_OAUTH_TOKEN=$(cat /Users/bartdecrem/.claude/oauth_token) \
  HOME=/Users/bartdecrem USER=bartdecrem SHELL=/bin/bash \
  ISSUE_TRACKER_APP_ID=toybox-issue-tracker-v3 \
  /usr/local/bin/node /path/to/execute-open-issue-v2.js >> edit-agent-v3.log 2>&1
```

## Key Learnings

1. **Claude CLI uses its own authentication system** - Not ANTHROPIC_API_KEY
2. **OAuth tokens are required for headless operation** - File-based auth doesn't work in cron
3. **Environment must be carefully managed** - Remove conflicting vars, add required ones
4. **The error messages were misleading** - "Credit balance" error was actually auth failure

## Testing Confirmation

Successfully tested by:
1. Creating test issue: "OAuth Test - Create a simple celebration app"
2. Agent processed it successfully
3. App was created and deployed to WebtoysOS
4. Cron now runs reliably every 2 minutes

## Files Modified

- `/sms-bot/webtoys-os/agents/edit-agent/execute-open-issue-v2.js` - Added OAuth token to environment
- `~/.claude/oauth_token` - Secure token storage (not in git)
- Crontab - Updated to include OAuth token

## Status

✅ **FIXED** - The edit agent is now fully operational and processing issues automatically.