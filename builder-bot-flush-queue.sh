#!/bin/bash

# Builder Bot - Flush Queue
# Run this before testing to clear locks and pending issues

echo "🧹 Flushing Builder Bot queue..."

WEBHOOK_URL="http://localhost:3041/builderbot/webhook"

# Send flush command
RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"type": "flush"}')

echo "Response: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ Queue flushed successfully!"
  echo "🎯 Builder Bot is now ready for new requests"
else
  echo "❌ Failed to flush queue"
  echo "Make sure Builder Bot server is running on port 3041"
fi

echo ""
echo "📋 The flush command:"
echo "- Releases all locks"
echo "- Closes pending Builder Bot issues"
echo "- Resets the system for new testing"