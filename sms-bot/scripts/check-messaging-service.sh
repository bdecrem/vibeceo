#!/bin/bash
# Check if phone is in a Messaging Service (the RIGHT way)

# Find the .env.local file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env.local"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
  export $(grep -v '^#' "$ENV_FILE" | xargs)
fi

echo "🔍 Checking Messaging Service Configuration"
echo "==========================================="
echo ""

# 1. Check the CORRECT endpoint for Messaging Services
echo "1️⃣ Checking all Messaging Services in your account..."
MS_RESPONSE=$(curl -s -X GET "https://messaging.twilio.com/v1/Services" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

echo "$MS_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    services = data.get('services', [])
    if services:
        print(f'⚠️  Found {len(services)} Messaging Service(s):\n')
        for service in services:
            print(f\"SID: {service.get('sid')}\")
            print(f\"Name: {service.get('friendly_name')}\")
            print(f\"Inbound URL: {service.get('inbound_request_url', 'Not set')}\")
            print(f\"Fallback URL: {service.get('fallback_url', 'Not set')}\")
            print(f\"Status Callback: {service.get('status_callback', 'Not set')}\")
            print('-' * 50)
            
            # Store the SID for checking phone numbers
            service_sid = service.get('sid')
            if service_sid:
                print(f'Checking phone numbers in service {service_sid}...')
    else:
        print('No Messaging Services found')
except Exception as e:
    print(f'Error: {e}')
    print('Raw response:', data if 'data' in locals() else sys.stdin.read())
"

# 2. For each Messaging Service, check its phone numbers
echo ""
echo "2️⃣ Checking which phone numbers are in Messaging Services..."

# Get the first messaging service SID (if any)
MS_SID=$(echo "$MS_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    services = data.get('services', [])
    if services:
        print(services[0].get('sid', ''))
except: pass
")

if [ ! -z "$MS_SID" ]; then
    echo "Checking phones in Messaging Service: $MS_SID"
    
    PHONES_RESPONSE=$(curl -s -X GET "https://messaging.twilio.com/v1/Services/$MS_SID/PhoneNumbers" \
      -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")
    
    echo "$PHONES_RESPONSE" | python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    phone_numbers = data.get('phone_numbers', [])
    if phone_numbers:
        print(f'\\n⚠️  FOUND THE ISSUE!')
        print(f'The following phone numbers are in this Messaging Service:')
        for phone in phone_numbers:
            print(f\"  - {phone.get('phone_number')} (SID: {phone.get('sid')})\")
        print(f'\\nThe Messaging Service webhook OVERRIDES individual phone webhooks!')
    else:
        print('No phone numbers in this Messaging Service')
except Exception as e:
    print(f'Error checking phones: {e}')
"
fi

echo ""
echo "3️⃣ Solution:"
echo "==========="
echo "If your phone IS in a Messaging Service, you have two options:"
echo ""
echo "Option A: Remove the phone from the Messaging Service"
echo "  1. Go to https://console.twilio.com"
echo "  2. Navigate to Messaging > Services"
echo "  3. Click on the service"
echo "  4. Go to 'Sender Pool'"
echo "  5. Remove your phone number"
echo ""
echo "Option B: Update the Messaging Service webhook instead"
echo "  1. Go to the Messaging Service settings"
echo "  2. Update the 'Inbound Request URL' to your ngrok URL"
echo "  3. This will affect ALL numbers in the service"