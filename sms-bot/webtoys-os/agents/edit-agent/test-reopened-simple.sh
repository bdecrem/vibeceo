#!/bin/bash

echo "📝 Creating a reopened issue scenario..."

# Create the issue using the existing script
node create-test-issue-simple.js "Create a timer app that counts down from 60 seconds"

echo ""
echo "⏳ Waiting for issue to be created..."
sleep 2

echo ""
echo "📋 Now manually:"
echo "1. Go to https://webtoys.ai/public/toybox-issue-tracker-v3"
echo "2. Find the issue 'Create a timer app that counts down from 60 seconds'"
echo "3. Wait for it to be processed (2 minutes)"
echo "4. Reopen it and add comment: 'Good start, but please add pause/resume buttons and a sound when it reaches zero'"
echo "5. Wait for agent to process again"
echo ""
echo "The agent should now respond to your COMMENT, not repeat the original implementation."