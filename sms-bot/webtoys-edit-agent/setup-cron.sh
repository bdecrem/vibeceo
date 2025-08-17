#!/bin/bash

# Webtoys Edit Agent Cron Setup
# Sets up fallback cron job for edit processing (only on agent machines)

echo "🎨 Webtoys Edit Agent - Cron Setup"
echo "================================="

# Check if edit agent is enabled
if [ "$EDIT_AGENT_ENABLED" != "true" ]; then
    echo "⛔ Edit Agent is DISABLED (EDIT_AGENT_ENABLED != true)"
    echo "Set EDIT_AGENT_ENABLED=true in your .env.local to enable"
    exit 0
fi

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Script directory: $SCRIPT_DIR"

# Create the cron job entry
CRON_ENTRY="*/10 * * * * cd $SCRIPT_DIR && /opt/homebrew/bin/node monitor.js >> /tmp/webtoys-edit-agent.log 2>&1"

echo "📋 Cron entry to be added:"
echo "   $CRON_ENTRY"
echo ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "webtoys-edit-agent"; then
    echo "⚠️  Webtoys Edit Agent cron job already exists"
    echo "Current cron jobs related to edit agent:"
    crontab -l | grep "webtoys-edit-agent"
    echo ""
    read -p "Replace existing cron job? (y/N): " replace
    if [ "$replace" != "y" ] && [ "$replace" != "Y" ]; then
        echo "❌ Cron setup cancelled"
        exit 0
    fi
    
    # Remove existing edit agent cron jobs
    echo "🗑️  Removing existing edit agent cron jobs..."
    crontab -l | grep -v "webtoys-edit-agent" | crontab -
fi

# Add the new cron job
echo "➕ Adding new cron job..."
(crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -

if [ $? -eq 0 ]; then
    echo "✅ Cron job added successfully!"
    echo ""
    echo "📊 Current crontab:"
    crontab -l
    echo ""
    echo "📝 The edit agent will now run every 10 minutes as a fallback"
    echo "💡 Primary processing happens via webhook for immediate response"
    echo "🗂️  Logs will be written to: /tmp/webtoys-edit-agent.log"
    echo ""
    echo "🔧 To remove the cron job later:"
    echo "   crontab -e"
    echo "   (then delete the webtoys-edit-agent line)"
else
    echo "❌ Failed to add cron job"
    exit 1
fi