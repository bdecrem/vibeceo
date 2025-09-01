#!/bin/bash

# Setup script for Edit Agent V2 with cron
# 
# This script configures cron to use the improved V2 edit agent
# To switch back to V1, use the original setup-edit-agent-cron.sh

echo "🚀 Setting up Edit Agent V2 cron job..."

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if required files exist
if [ ! -f "$SCRIPT_DIR/execute-open-issue-v2.js" ]; then
    echo "❌ Error: execute-open-issue-v2.js not found!"
    echo "   Please ensure you're running this from the edit-agent directory"
    exit 1
fi

# Check for environment file
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "⚠️  Warning: .env file not found"
    echo "   Creating from template..."
    echo "ISSUE_TRACKER_APP_ID=toybox-issue-tracker-v3" > "$SCRIPT_DIR/.env"
fi

# Create a temporary cron file
TEMP_CRON="/tmp/edit-agent-v2-cron-$$"

# Get current crontab (if exists)
crontab -l 2>/dev/null > "$TEMP_CRON" || true

# Remove any existing edit-agent entries (both v1 and v2)
grep -v "execute-open-issue" "$TEMP_CRON" > "${TEMP_CRON}.new" || true
mv "${TEMP_CRON}.new" "$TEMP_CRON"

# Add new V2 cron entry (runs every 2 minutes)
echo "# Edit Agent V2 - Improved performance version" >> "$TEMP_CRON"
echo "*/2 * * * * cd $SCRIPT_DIR && ISSUE_TRACKER_APP_ID=toybox-issue-tracker-v3 /usr/local/bin/node $SCRIPT_DIR/execute-open-issue-v2.js >> $SCRIPT_DIR/edit-agent-v2.log 2>&1" >> "$TEMP_CRON"

# Install the new crontab
crontab "$TEMP_CRON"

# Clean up
rm "$TEMP_CRON"

echo "✅ Edit Agent V2 cron job installed!"
echo ""
echo "📋 Configuration:"
echo "   - Runs every 2 minutes"
echo "   - Log file: $SCRIPT_DIR/edit-agent-v2.log"
echo "   - Issue tracker: toybox-issue-tracker-v3"
echo ""
echo "🔍 To monitor:"
echo "   tail -f $SCRIPT_DIR/edit-agent-v2.log"
echo ""
echo "↩️  To switch back to V1:"
echo "   ./setup-edit-agent-cron.sh"
echo ""
echo "📊 To test V2 improvements:"
echo "   node test/test-v2.js"
echo ""
echo "✅ Setup complete! The agent will start processing issues within 2 minutes."