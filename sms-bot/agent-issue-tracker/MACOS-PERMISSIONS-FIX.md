# macOS Cron Permissions Fix

## Why You're Getting Permission Prompts

When modifying crontab, macOS asks for Terminal permissions because cron jobs run as scheduled tasks that can access your entire system.

## To Fix the Permission Prompts

### Option 1: Grant Full Disk Access to Terminal (Recommended)
1. Open System Settings
2. Go to Privacy & Security → Full Disk Access
3. Click the lock to make changes
4. Add Terminal.app (or your terminal app like iTerm2)
5. Restart your terminal

### Option 2: Use LaunchAgents Instead of Cron
Create a LaunchAgent plist file instead of using crontab. This is the more "macOS way" but requires more setup.

### Option 3: Accept the Prompts
Simply click "Allow" when prompted. macOS will remember your choice for that terminal session.

## Current Cron Job

The issue tracker runs every 5 minutes with this command:
```bash
*/5 * * * * cd /Users/bartbart/Documents/VibeCEO8/sms-bot/agent-issue-tracker && ENABLE_AUTO_FIX=true PROJECT_ROOT=/Users/bartbart/Documents/VibeCEO8/sms-bot /opt/homebrew/bin/node monitor.js >> /tmp/issue-tracker.log 2>&1
```

## Checking if Cron is Working

```bash
# View the log
tail -f /tmp/issue-tracker.log

# Check crontab
crontab -l

# Verify node path
which node
```