#!/bin/bash
# Verify where webhooks are actually being routed

# Find the .env.local file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env.local"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

echo "🔍 Webhook Routing Verification"
echo "================================"
echo ""

# 1. Get current setting from Twilio
echo "1️⃣ Fetching current Twilio configuration..."
RESPONSE=$(curl -s -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$TWILIO_PHONE_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

CURRENT_URL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('sms_url', 'N/A'))")
echo "   Twilio says webhook is: $CURRENT_URL"
echo ""

# 2. Force a cache refresh by updating with the SAME URL
echo "2️⃣ Force-refreshing Twilio's configuration..."
echo "   (Sometimes Twilio caches the old route)"
echo ""

if [[ "$CURRENT_URL" == *"ngrok"* ]]; then
    echo "   Re-setting to same ngrok URL to force refresh..."
    curl -s -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$TWILIO_PHONE_SID.json" \
      --data-urlencode "SmsUrl=$CURRENT_URL" \
      --data-urlencode "SmsMethod=POST" \
      -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" > /dev/null
    echo "   ✅ Force refresh complete"
fi

echo ""
echo "3️⃣ Debug steps:"
echo "   a) Open http://localhost:4040 in your browser"
echo "   b) Send a test SMS to your Twilio number"
echo "   c) Check if the request appears in ngrok inspector"
echo ""
echo "   If it doesn't appear in ngrok:"
echo "   - The issue is with Twilio routing"
echo "   - Try the Console: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
echo ""
echo "   If it DOES appear in ngrok but you don't see it processed:"
echo "   - Check if your local sms-bot server is running on port 3030"
echo "   - Run: lsof -i :3030"
echo ""

# 4. Check recent message logs from Twilio
echo "4️⃣ Checking recent message logs..."
echo "   (Last 5 messages received)"
echo ""

MESSAGES=$(curl -s -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json?PageSize=5&Direction=inbound" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

python3 << EOF
import json
from datetime import datetime

messages_json = '''$MESSAGES'''
try:
    data = json.loads(messages_json)
    messages = data.get('messages', [])
    
    if messages:
        for msg in messages:
            date_sent = msg.get('date_sent', 'Unknown')
            from_num = msg.get('from', 'Unknown')
            body = msg.get('body', '')[:50]  # First 50 chars
            status = msg.get('status', 'Unknown')
            
            print(f"   📱 {date_sent}")
            print(f"      From: {from_num}")
            print(f"      Body: {body}...")
            print(f"      Status: {status}")
            print("")
    else:
        print("   No recent inbound messages found")
except Exception as e:
    print(f"   Error parsing messages: {e}")
EOF