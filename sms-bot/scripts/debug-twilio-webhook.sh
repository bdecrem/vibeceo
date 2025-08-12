#!/bin/bash
# Debug script to check current Twilio webhook configuration
# This will help diagnose issues with toggle-sms.sh

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

# Check if required environment variables are set
if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ] || [ -z "$TWILIO_PHONE_SID" ]; then
  echo "❌ Error: Missing required Twilio environment variables"
  echo "Please ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_SID are set"
  exit 1
fi

echo ""
echo "🔍 Fetching complete Twilio phone number configuration..."
echo "Account SID: $TWILIO_ACCOUNT_SID"
echo "Phone SID: $TWILIO_PHONE_SID"
echo ""

# Get complete phone number configuration
RESPONSE=$(curl -s -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$PHONE_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

# Check if the request was successful
if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch phone number configuration"
  exit 1
fi

# Check for error in response
if echo "$RESPONSE" | grep -q '"code"'; then
  echo "❌ Twilio API Error:"
  echo "$RESPONSE" | python3 -m json.tool
  exit 1
fi

echo "📱 Phone Number Configuration:"
echo "================================"

# Extract key fields using Python for better JSON parsing
python3 << EOF
import json
import sys

response = '''$RESPONSE'''
try:
    data = json.loads(response)
    
    print(f"Phone Number: {data.get('phone_number', 'N/A')}")
    print(f"Friendly Name: {data.get('friendly_name', 'N/A')}")
    print(f"Status: {data.get('status', 'N/A')}")
    print("")
    
    print("SMS Configuration:")
    print("-----------------")
    print(f"SMS URL: {data.get('sms_url', 'N/A')}")
    print(f"SMS Method: {data.get('sms_method', 'N/A')}")
    print(f"SMS Fallback URL: {data.get('sms_fallback_url', 'N/A')}")
    print(f"SMS Fallback Method: {data.get('sms_fallback_method', 'N/A')}")
    print("")
    
    print("Voice Configuration:")
    print("-------------------")
    print(f"Voice URL: {data.get('voice_url', 'N/A')}")
    print(f"Voice Method: {data.get('voice_method', 'N/A')}")
    print("")
    
    print("Status Callback:")
    print("---------------")
    print(f"Status Callback: {data.get('status_callback', 'N/A')}")
    print(f"Status Callback Method: {data.get('status_callback_method', 'N/A')}")
    print("")
    
    print("Other Settings:")
    print("--------------")
    print(f"SMS Application SID: {data.get('sms_application_sid', 'N/A')}")
    print(f"Voice Application SID: {data.get('voice_application_sid', 'N/A')}")
    print(f"Messaging Service SID: {data.get('messaging_service_sid', 'N/A')}")
    print(f"Bundle SID: {data.get('bundle_sid', 'N/A')}")
    
except json.JSONDecodeError as e:
    print(f"Failed to parse JSON response: {e}")
    print("Raw response:")
    print(response)
    sys.exit(1)
EOF

echo ""
echo "================================"
echo "Expected URLs:"
echo "Local Dev: https://theaf-sms.ngrok.io/sms/webhook"
echo "Production: https://smsbot-production.up.railway.app/sms/webhook"
echo ""

# Try to extract just the SMS URL for comparison
SMS_URL=$(echo "$RESPONSE" | sed -n 's/.*"sms_url": *"\([^"]*\)".*/\1/p')
echo "Current SMS URL extracted: $SMS_URL"