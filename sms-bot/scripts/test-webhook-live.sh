#!/bin/bash
# Test if webhooks are actually reaching the correct destination

# Find the .env.local file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env.local"

# Load environment variables from .env.local if exists
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

echo "🔍 Webhook Configuration Test"
echo "=============================="
echo ""

# 1. Check current webhook setting
echo "1️⃣ Current Twilio webhook configuration:"
PHONE_RESPONSE=$(curl -s -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$TWILIO_PHONE_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

CURRENT_URL=$(echo "$PHONE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('sms_url', 'N/A'))")
echo "   SMS Webhook URL: $CURRENT_URL"
echo ""

# 2. Check if ngrok is running and accessible
echo "2️⃣ Checking ngrok status:"
if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "   ✅ ngrok is running locally"
    
    # Get the actual ngrok URL
    NGROK_INFO=$(curl -s http://localhost:4040/api/tunnels)
    echo "$NGROK_INFO" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data.get('tunnels', []):
        if 'https' in tunnel.get('proto', ''):
            print(f'   Actual ngrok URL: {tunnel.get(\"public_url\")}')
            break
except: pass
"
else
    echo "   ❌ ngrok is NOT running on localhost:4040"
fi
echo ""

# 3. Test if the webhook URL is accessible
echo "3️⃣ Testing webhook accessibility:"
if [[ "$CURRENT_URL" == *"ngrok"* ]]; then
    echo "   Testing ngrok webhook: $CURRENT_URL"
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$CURRENT_URL" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "Body=Test&From=%2B1234567890")
    
    if [ "$RESPONSE" = "200" ] || [ "$RESPONSE" = "201" ] || [ "$RESPONSE" = "204" ]; then
        echo "   ✅ Webhook is accessible (HTTP $RESPONSE)"
    else
        echo "   ⚠️ Webhook returned HTTP $RESPONSE"
        echo "   This might indicate the URL is not reachable"
    fi
elif [[ "$CURRENT_URL" == *"railway"* ]]; then
    echo "   Currently set to Railway: $CURRENT_URL"
fi
echo ""

# 4. Check if there might be caching issues
echo "4️⃣ Checking for potential issues:"
echo "   - Make sure ngrok is running with the correct subdomain:"
echo "     ngrok http 3001 --subdomain=theaf-sms"
echo ""
echo "   - Check if your local server is running on port 3001"
echo ""
echo "   - Try sending a test SMS and check both locations:"
echo "     • Railway logs: railway logs"
echo "     • Local ngrok inspector: http://localhost:4040"
echo ""

# 5. Force refresh by setting to a dummy URL then back
echo "5️⃣ Try force-refreshing the webhook (optional):"
echo "   Run these commands to force Twilio to update:"
echo "   1. Set to dummy: curl -X POST ... --data-urlencode \"SmsUrl=https://example.com/webhook\""
echo "   2. Set back to ngrok: ./toggle-sms.sh dev"
echo ""

echo "6️⃣ Alternative test - Use Twilio CLI:"
echo "   If you have Twilio CLI installed, try:"
echo "   twilio phone-numbers:update $TWILIO_PHONE_SID --sms-url=https://theaf-sms.ngrok.io/sms/webhook"