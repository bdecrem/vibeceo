#!/bin/bash

# Builder Bot Test - Step 3: Manual Trigger
# If the automatic trigger didn't work, manually run the edit agent

echo "🔧 Manually triggering Edit Agent for Builder Bot..."
echo ""

# Set required environment variables
export ISSUE_TRACKER_APP_ID="toybox-issue-tracker-v3"
export BUILDER_BOT_MODE="true"
export BUILDER_BOT_FORCE="true"

echo "Environment set:"
echo "  ISSUE_TRACKER_APP_ID=$ISSUE_TRACKER_APP_ID"
echo "  BUILDER_BOT_MODE=$BUILDER_BOT_MODE"
echo "  BUILDER_BOT_FORCE=$BUILDER_BOT_FORCE"
echo ""

# Change to the edit agent directory
cd sms-bot/webtoys-os/agents/edit-agent

echo "📁 Working directory: $(pwd)"
echo ""

# Run the edit agent
echo "🚀 Running edit agent..."
echo "This will process any pending Builder Bot issues..."
echo ""

node execute-open-issue-v2.js

echo ""
echo "✅ Edit agent execution complete!"
echo ""
echo "Check the output above for:"
echo "- Whether it found any Builder Bot issues"
echo "- If Claude Code was executed"
echo "- Any error messages"
echo "- Git commit hashes (indicates successful app creation)"