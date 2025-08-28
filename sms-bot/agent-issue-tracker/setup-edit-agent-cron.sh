#!/bin/bash

# Simple cron setup for WebtoysOS Edit Agent
# This runs execute-open-issue.js every 2 minutes

echo "🤖 WebtoysOS Edit Agent Cron Setup"
echo "===================================="
echo ""

# Get the full path to the script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
NODE_PATH="/usr/local/bin/node"

# Create the crontab line (runs every 2 minutes)
CRON_LINE="*/2 * * * * cd $SCRIPT_DIR && ISSUE_TRACKER_APP_ID=toybox-direct-updates $NODE_PATH execute-open-issue.js >> edit-agent.log 2>&1"

echo "📋 This will add the following cron job:"
echo "$CRON_LINE"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "execute-open-issue.js"; then
    echo "⚠️  A cron job for execute-open-issue.js already exists!"
    echo "Remove it first with: crontab -e"
    exit 1
fi

echo "📝 Adding to crontab..."

# Add to crontab
(crontab -l 2>/dev/null; echo "$CRON_LINE") | crontab -

echo "✅ Cron job added successfully!"
echo ""
echo "📊 Status commands:"
echo "  View logs:     tail -f $SCRIPT_DIR/edit-agent.log"
echo "  List crons:    crontab -l"
echo "  Edit crons:    crontab -e"
echo "  Remove crons:  crontab -r"
echo ""
echo "🛑 To temporarily disable the agent:"
echo "  touch $SCRIPT_DIR/STOP-EDIT-AGENT.txt"
echo ""
echo "▶️  To re-enable the agent:"
echo "  rm $SCRIPT_DIR/STOP-EDIT-AGENT.txt"
echo ""
echo "✨ The edit agent will run every 2 minutes starting now!"