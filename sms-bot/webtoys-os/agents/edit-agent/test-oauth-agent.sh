#!/bin/bash

echo "🎯 Creating test issue..."
node create-test-issue-simple.js "OAuth Test - Create a simple celebration app that displays 'OAuth is Fixed!' with confetti animation"

echo ""
echo "⏳ Waiting 2 seconds for database..."
sleep 2

echo ""
echo "🚀 Running edit agent with OAuth token..."
ISSUE_TRACKER_APP_ID=toybox-issue-tracker-v3 node execute-open-issue-v2.js

echo ""
echo "✅ Test complete! Check the output above."