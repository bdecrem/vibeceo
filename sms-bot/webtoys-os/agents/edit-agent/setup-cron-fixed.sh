#!/bin/bash

# Agent Issue Tracker - Cron Setup Script
# This script sets up the cron job with all required environment variables

echo "🤖 Agent Issue Tracker - Cron Setup"
echo "=================================="

# Get GitHub token
echo "Getting GitHub token..."
GH_TOKEN=$(/opt/homebrew/bin/gh auth token 2>/dev/null)
if [ -z "$GH_TOKEN" ]; then
    echo "❌ Error: GitHub CLI not authenticated"
    echo "Run: gh auth login"
    exit 1
fi
echo "✅ GitHub token retrieved"

# Set paths
NODE_PATH="/usr/local/bin/node"
SCRIPT_PATH="/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/agent-issue-tracker/monitor.js"
LOG_PATH="/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/agent-issue-tracker/monitor.log"
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

# Create the cron job
CRON_JOB="*/2 * * * * HOME=/Users/bartdecrem GH_TOKEN=$GH_TOKEN GITHUB_TOKEN=$GH_TOKEN ENABLE_AUTO_FIX=true PROJECT_ROOT=$PROJECT_ROOT $NODE_PATH $SCRIPT_PATH >> $LOG_PATH 2>&1"

# Backup existing crontab
crontab -l > /tmp/crontab-backup-$(date +%Y%m%d-%H%M%S).txt 2>/dev/null

# Remove any existing agent-issue-tracker jobs
(crontab -l 2>/dev/null | grep -v "agent-issue-tracker/monitor.js") | crontab -

# Add the new job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo ""
echo "✅ Cron job installed successfully!"
echo ""
echo "📋 Configuration:"
echo "   - Runs every: 2 minutes"
echo "   - Auto-fix: ENABLED"
echo "   - Log file: $LOG_PATH"
echo "   - Project root: $PROJECT_ROOT"
echo ""
echo "🔍 To check status:"
echo "   crontab -l                    # View cron jobs"
echo "   tail -f $LOG_PATH             # Watch logs"
echo ""
echo "🛑 To disable:"
echo "   crontab -r                    # Remove all cron jobs"
echo ""
echo "⚠️  IMPORTANT:"
echo "   - This machine should be dedicated to running the agent"
echo "   - Don't edit code on this machine while agent is running"
echo "   - Agent will pull latest changes from GitHub automatically"
echo ""