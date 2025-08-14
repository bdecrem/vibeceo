#!/bin/bash

# Simple watcher that runs the agent every 20 seconds
echo "🔍 Agent Watcher - Runs every 20 seconds"
echo "Press Ctrl+C to stop"
echo ""

while true; do
    echo "⏰ [$(date '+%H:%M:%S')] Running agent..."
    cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/agent-issue-tracker
    ENABLE_AUTO_FIX=true node reformulate-issues.js
    echo "---"
    sleep 20
done