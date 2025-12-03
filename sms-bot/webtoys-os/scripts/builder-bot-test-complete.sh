#!/bin/bash

# Builder Bot Complete Test - Proper Flow
# This follows the correct flow: 1) Get lock, 2) Send message

WEBHOOK_URL="http://localhost:3041/builderbot/webhook"

echo "🧪 Testing Builder Bot Complete Flow..."
echo ""

# Step 1: Request lock
echo "📋 Step 1: Requesting lock..."
LOCK_RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "lock_request",
    "user": {
      "handle": "TESTUSER",
      "participantId": "TESTUSER_1234"
    }
  }')

echo "Lock response: $LOCK_RESPONSE"

# Check if lock was successful
if echo "$LOCK_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Lock acquired successfully!"
else
  echo "❌ Failed to acquire lock"
  echo "Response: $LOCK_RESPONSE"
  exit 1
fi

echo ""

# Step 2: Send chat message
echo "💬 Step 2: Sending chat message..."
MESSAGE_RESPONSE=$(curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "chat_message",
    "user": {
      "handle": "TESTUSER",
      "participantId": "TESTUSER_1234"
    },
    "text": "Create a simple calculator app with buttons for numbers and basic operations"
  }')

echo "Message response: $MESSAGE_RESPONSE"

# Check if message was successful
if echo "$MESSAGE_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Message sent successfully!"
  echo ""
  echo "🔍 The Builder Bot should now:"
  echo "1. Create a synthetic issue in the database"
  echo "2. Trigger the edit agent to process it"
  echo "3. Build and deploy the calculator app"
  echo ""
  echo "⏳ This process takes about 30-60 seconds..."
else
  echo "❌ Failed to send message"
  echo "Response: $MESSAGE_RESPONSE"
fi

echo ""
echo "📋 Next: Check if a synthetic issue was created and processed..."