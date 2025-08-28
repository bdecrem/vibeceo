#!/bin/bash

# Enhanced cron setup with environment variables for WebtoysOS Edit Agent
# This ensures the agent has all needed environment variables

echo "🤖 WebtoysOS Edit Agent Cron Setup (With Environment)"
echo "======================================================"
echo ""

# Get the full path to the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NODE_PATH="/usr/local/bin/node"
PROJECT_ROOT="/Users/bartdecrem/Documents/code/vibeceo8/sms-bot"

# Build the cron environment variables
# These ensure the agent can access Supabase and run Claude
CRON_ENV="HOME=/Users/bartdecrem PROJECT_ROOT=$PROJECT_ROOT ISSUE_TRACKER_APP_ID=toybox-direct-updates"

# Create the crontab line (runs every 2 minutes)
CRON_LINE="*/2 * * * * $CRON_ENV cd $SCRIPT_DIR && $NODE_PATH execute-open-issue.js >> edit-agent.log 2>&1"

echo "📋 This will add the following cron job:"
echo "$CRON_LINE"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "execute-open-issue.js"; then
    echo "⚠️  A cron job for execute-open-issue.js already exists!"
    echo "Remove it first with: crontab -e"
    exit 1
fi

echo "⚠️  IMPORTANT: This cron job will:"
echo "  • Run every 2 minutes"
echo "  • Process WebtoysOS issues automatically"
echo "  • Create/modify apps in the database"
echo "  • Use Claude Code with --dangerously-skip-permissions"
echo ""
read -p "Are you sure you want to enable this? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Setup cancelled"
    exit 0
fi

echo ""
echo "📝 Adding to crontab..."

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo "✅ Cron job added successfully!"
echo ""
echo "📊 Commands:"
echo "  Control:       ./start-edit-agent.sh {start|stop|status|test}"
echo "  View logs:     tail -f $SCRIPT_DIR/edit-agent.log"
echo "  List crons:    crontab -l"
echo "  Remove cron:   crontab -e (delete the line)"
echo ""
echo "🛑 Safety:"
echo "  The agent checks for STOP-EDIT-AGENT.txt on each run"
echo "  Create this file to pause: touch STOP-EDIT-AGENT.txt"
echo ""
echo "✨ The edit agent will run every 2 minutes starting now!"