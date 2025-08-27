#!/bin/bash

# WebtoysOS Fixit Board Agent - Cron Setup Script
# This script sets up the cron job with all required environment variables

echo "🤖 WebtoysOS Fixit Board Agent - Cron Setup"
echo "=========================================="

# Get GitHub token
echo "Getting GitHub token..."
GH_TOKEN=$(/opt/homebrew/bin/gh auth token 2>/dev/null)
if [ -z "$GH_TOKEN" ]; then
    echo "❌ Error: GitHub CLI not authenticated"
    echo "Run: gh auth login"
    exit 1
fi
echo "✅ GitHub token retrieved"

# Set paths for WebtoysOS agent
NODE_PATH="/usr/local/bin/node"
SCRIPT_PATH="/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoysos-agent/monitor.js"
LOG_PATH="/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoysos-agent/monitor.log"
PROJECT_ROOT="/Users/bartdecrem/Documents/code/vibeceo8/sms-bot"

# Check if paths exist
if [ ! -f "$NODE_PATH" ]; then
    echo "⚠️  Node not found at $NODE_PATH, checking alternatives..."
    NODE_PATH=$(which node)
    echo "Using node at: $NODE_PATH"
fi

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "❌ Error: monitor.js not found at $SCRIPT_PATH"
    exit 1
fi

# Create the cron job - runs every 3 minutes (offset from main agent)
CRON_JOB="*/3 * * * * HOME=/Users/bartdecrem GH_TOKEN=$GH_TOKEN GITHUB_TOKEN=$GH_TOKEN ENABLE_AUTO_FIX=true PROJECT_ROOT=$PROJECT_ROOT ISSUE_TRACKER_APP_ID=5b98f08a-60c7-48cd-bd1c-fb4bad3615ae $NODE_PATH $SCRIPT_PATH >> $LOG_PATH 2>&1"

# Backup existing crontab
crontab -l > /tmp/crontab-backup-webtoysos-$(date +%Y%m%d-%H%M%S).txt 2>/dev/null

# Remove any existing webtoysos-agent jobs
(crontab -l 2>/dev/null | grep -v "webtoysos-agent/monitor.js") | crontab -

# Add the new job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "✅ WebtoysOS Fixit Board cron job installed successfully!"
echo ""
echo "📋 Configuration:"
echo "   - Runs every: 3 minutes (offset from main agent)"
echo "   - App ID: 5b98f08a-60c7-48cd-bd1c-fb4bad3615ae"
echo "   - URL: https://webtoys.ai/public/webtoysos-issue-tracker"
echo "   - Auto-fix: ENABLED"
echo "   - Log file: $LOG_PATH"
echo "   - Project root: $PROJECT_ROOT"
echo ""
echo "🔍 To check status:"
echo "   crontab -l                    # View cron jobs"
echo "   tail -f $LOG_PATH             # Watch logs"
echo ""
echo "🛑 To disable:"
echo "   crontab -e                    # Edit and remove webtoysos line"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - This runs alongside the main WEBTOYS Issue Tracker agent"
echo "   - Uses same GitHub tokens but different app_id"
echo "   - Offset timing prevents conflicts between agents"
echo ""