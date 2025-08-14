#!/bin/bash

# Test Issue Tracker from Dev Directory
# This runs the agent pipeline using YOUR code changes

echo "🧪 Testing Issue Tracker from Dev Directory"
echo "==========================================="
echo ""

# Set up environment
export ENABLE_AUTO_FIX=true
export PROJECT_ROOT="/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot"

# Change to the right directory
cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/agent-issue-tracker

echo "📍 Running from: $(pwd)"
echo "🌿 Git branch: $(git branch --show-current)"
echo ""

# Option 1: Just reformulate issues (safe, no code changes)
echo "1️⃣  REFORMULATING ISSUES (safe mode - no code changes)"
echo "--------------------------------------------------------"
node reformulate-issues.js
echo ""

# Uncomment this to also run auto-fix:
# echo "2️⃣  AUTO-FIXING SIMPLE/MEDIUM ISSUES"
# echo "------------------------------------"
# node fix-issues.js
# echo ""

echo "✅ Test complete!"
echo ""
echo "Check the results above to see:"
echo "- How issues were reformulated"
echo "- What complexity levels were assigned"
echo "- Which issues would be auto-fixed vs skipped"