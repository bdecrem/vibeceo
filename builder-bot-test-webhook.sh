#!/bin/bash

# Builder Bot Test - Step 1: Test Webhook
# This simulates the chatbot sending a message to the builder bot webhook

echo "🧪 Testing Builder Bot Webhook..."
echo "This will:"
echo "1. Send a test message to the builder bot webhook"
echo "2. Check if a synthetic issue gets created"
echo "3. Verify the edit agent processes it"

# Test webhook URL (replace with your actual ngrok URL if different)
WEBHOOK_URL="http://localhost:3041/builderbot/webhook"

echo ""
echo "📡 Sending test message to: $WEBHOOK_URL"

curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "chat_message",
    "user": {
      "handle": "TESTUSER",
      "participantId": "TESTUSER_1234"
    },
    "text": "Create a simple calculator app"
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -v

echo ""
echo "✅ Test complete!"
echo ""
echo "Next steps:"
echo "1. Check if synthetic issue was created in database"
echo "2. Check if edit agent processed it"
echo "3. Look for any error logs"