#!/bin/bash
# Test script to verify the toggle-sms.sh functionality

# Find the .env.local file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env.local"

# Load environment variables from .env.local if exists
if [ -f "$ENV_FILE" ]; then
  echo "Loading environment variables from $ENV_FILE"
  export $(grep -v '^#' "$ENV_FILE" | xargs)
else
  echo "⚠️ Warning: .env.local file not found at $ENV_FILE"
fi

PHONE_SID=$TWILIO_PHONE_SID

echo ""
echo "📞 Testing with Phone SID: $PHONE_SID"
echo ""

# Test 1: Get phone details with the SID directly
echo "Test 1: Fetching phone details with direct API call..."
echo "URL: https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$PHONE_SID.json"
echo ""

RESPONSE=$(curl -s -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$PHONE_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

# Check if we got JSON back
if echo "$RESPONSE" | python3 -c "import sys, json; json.load(sys.stdin)" 2>/dev/null; then
    echo "✅ Got valid JSON response"
    
    # Extract SMS URL
    SMS_URL=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('sms_url', 'N/A'))")
    echo "📱 Current SMS URL: $SMS_URL"
else
    echo "❌ Invalid response. Raw output:"
    echo "$RESPONSE"
fi

echo ""
echo "Test 2: Testing URL update..."
echo "Attempting to set to production URL..."

TEST_URL="https://smsbot-production.up.railway.app/sms/webhook"

UPDATE_RESPONSE=$(curl -s -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$PHONE_SID.json" \
  --data-urlencode "SmsUrl=$TEST_URL" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

if echo "$UPDATE_RESPONSE" | python3 -c "import sys, json; json.load(sys.stdin)" 2>/dev/null; then
    echo "✅ Update request successful"
    
    # Check if it actually updated
    NEW_SMS_URL=$(echo "$UPDATE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('sms_url', 'N/A'))")
    echo "📱 New SMS URL: $NEW_SMS_URL"
    
    if [ "$NEW_SMS_URL" = "$TEST_URL" ]; then
        echo "✅ URL successfully updated!"
    else
        echo "⚠️ URL was set but doesn't match expected value"
    fi
else
    echo "❌ Update failed. Raw response:"
    echo "$UPDATE_RESPONSE"
fi