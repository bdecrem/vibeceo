#!/bin/bash

# Webtoys Edit Agent Startup Script
# Only runs on machines with EDIT_AGENT_ENABLED=true

echo "🎨 Webtoys Edit Agent - Startup"
echo "==============================="

# Load environment variables
if [ -f "../.env.local" ]; then
    echo "📄 Loading .env.local..."
    export $(grep -v '^#' ../.env.local | xargs)
elif [ -f "../.env" ]; then
    echo "📄 Loading .env..."
    export $(grep -v '^#' ../.env | xargs)
fi

# Check if edit agent is enabled
if [ "$EDIT_AGENT_ENABLED" != "true" ]; then
    echo "⛔ Edit Agent is DISABLED"
    echo "Set EDIT_AGENT_ENABLED=true in your .env.local to enable"
    echo ""
    echo "Example .env.local entry:"
    echo "EDIT_AGENT_ENABLED=true"
    echo "EDIT_AGENT_WEBHOOK_PORT=3031"
    exit 0
fi

echo "✅ Edit Agent is ENABLED"
echo "📡 Webhook Port: ${EDIT_AGENT_WEBHOOK_PORT:-3031}"
echo ""

# Get the current directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check for Claude CLI
CLAUDE_PATH="/Users/bartdecrem/.local/bin/claude"
if [ ! -f "$CLAUDE_PATH" ]; then
    # Try alternate location
    CLAUDE_PATH="/opt/homebrew/bin/claude"
    if [ ! -f "$CLAUDE_PATH" ]; then
        echo "❌ Claude CLI not found"
        echo "The edit agent requires Claude CLI to be installed"
        echo "Checked: /Users/bartdecrem/.local/bin/claude and /opt/homebrew/bin/claude"
        exit 1
    fi
fi

echo "✅ Claude CLI found"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install express
fi

# Start the webhook server
echo "🚀 Starting Edit Agent Webhook Server..."
echo "📊 Logs will appear below:"
echo "=" && printf '=%.0s' {1..50} && echo ""

exec node webhook-server.js