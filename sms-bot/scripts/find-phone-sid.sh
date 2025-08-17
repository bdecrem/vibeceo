#!/bin/bash
# Script to find the correct Phone SID for your Twilio phone number

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
if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
  echo "❌ Error: Missing required Twilio environment variables"
  echo "Please ensure TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are set"
  exit 1
fi

echo ""
echo "🔍 Fetching all phone numbers in your Twilio account..."
echo "Account SID: $TWILIO_ACCOUNT_SID"
echo ""

# Get all phone numbers
RESPONSE=$(curl -s -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

# Check if the request was successful
if [ $? -ne 0 ]; then
  echo "❌ Failed to fetch phone numbers"
  exit 1
fi

# Check for error in response
if echo "$RESPONSE" | grep -q '"code"'; then
  echo "❌ Twilio API Error:"
  echo "$RESPONSE" | python3 -m json.tool
  exit 1
fi

echo "📱 Phone Numbers in Account:"
echo "================================"

# Parse and display phone numbers
python3 << EOF
import json
import sys

response = '''$RESPONSE'''
try:
    data = json.loads(response)
    numbers = data.get('incoming_phone_numbers', [])
    
    if not numbers:
        print("No phone numbers found in this account")
        sys.exit(1)
    
    print(f"Found {len(numbers)} phone number(s):\n")
    
    for i, number in enumerate(numbers, 1):
        print(f"Phone #{i}")
        print("-" * 50)
        print(f"Phone Number: {number.get('phone_number', 'N/A')}")
        print(f"Friendly Name: {number.get('friendly_name', 'N/A')}")
        print(f"SID: {number.get('sid', 'N/A')}")
        print(f"SMS URL: {number.get('sms_url', 'N/A')}")
        print(f"SMS Method: {number.get('sms_method', 'N/A')}")
        print(f"Voice URL: {number.get('voice_url', 'N/A')}")
        print(f"Messaging Service SID: {number.get('messaging_service_sid', 'N/A')}")
        print(f"SMS Application SID: {number.get('sms_application_sid', 'N/A')}")
        print(f"Status: {number.get('status', 'N/A')}")
        print(f"Created: {number.get('date_created', 'N/A')}")
        print("")
    
    print("=" * 50)
    print("\n🔧 TO FIX YOUR SCRIPT:")
    print("1. Copy the correct SID from above")
    print("2. Update TWILIO_PHONE_SID in your .env.local file")
    print("3. The toggle-sms.sh script should work again")
    
    # Try to identify the WEBTOYS number
    print("\n🎯 Looking for WEBTOYS number...")
    for number in numbers:
        sms_url = number.get('sms_url', '')
        if 'railway' in sms_url.lower() or 'ngrok' in sms_url.lower() or 'webhook' in sms_url.lower():
            print(f"This looks like your WEBTOYS number: {number.get('phone_number')}")
            print(f"SID to use: {number.get('sid')}")
            break
    
except json.JSONDecodeError as e:
    print(f"Failed to parse JSON response: {e}")
    print("Raw response:")
    print(response)
    sys.exit(1)
EOF