#!/bin/bash
# Check for Twilio configurations that might override the phone number webhook

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

echo ""
echo "🔍 Checking for webhook overrides..."
echo ""

# 1. Check if there's a Messaging Service
echo "1️⃣ Checking Messaging Services..."
echo "================================"
MS_RESPONSE=$(curl -s -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Services.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

python3 << EOF
import json
response = '''$MS_RESPONSE'''
try:
    data = json.loads(response)
    services = data.get('services', [])
    if services:
        print(f"⚠️ Found {len(services)} Messaging Service(s):")
        for service in services:
            print(f"  - SID: {service.get('sid')}")
            print(f"    Name: {service.get('friendly_name')}")
            print(f"    Webhook: {service.get('inbound_request_url', 'N/A')}")
            print("")
    else:
        print("✅ No Messaging Services found")
except:
    print("✅ No Messaging Services API available")
EOF

echo ""

# 2. Check TwiML Apps
echo "2️⃣ Checking TwiML Applications..."
echo "================================"
APP_RESPONSE=$(curl -s -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Applications.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

python3 << EOF
import json
response = '''$APP_RESPONSE'''
try:
    data = json.loads(response)
    apps = data.get('applications', [])
    if apps:
        print(f"⚠️ Found {len(apps)} TwiML Application(s):")
        for app in apps:
            print(f"  - SID: {app.get('sid')}")
            print(f"    Name: {app.get('friendly_name')}")
            print(f"    SMS URL: {app.get('sms_url', 'N/A')}")
            print(f"    Voice URL: {app.get('voice_url', 'N/A')}")
            print("")
    else:
        print("✅ No TwiML Applications found")
except Exception as e:
    print(f"Error: {e}")
EOF

echo ""

# 3. Check Studio Flows
echo "3️⃣ Checking Studio Flows..."
echo "================================"
FLOW_RESPONSE=$(curl -s -X GET "https://studio.twilio.com/v2/Flows" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

python3 << EOF
import json
response = '''$FLOW_RESPONSE'''
try:
    data = json.loads(response)
    flows = data.get('flows', [])
    if flows:
        print(f"⚠️ Found {len(flows)} Studio Flow(s):")
        for flow in flows:
            print(f"  - SID: {flow.get('sid')}")
            print(f"    Name: {flow.get('friendly_name')}")
            print(f"    Status: {flow.get('status')}")
            print("")
    else:
        print("✅ No Studio Flows found")
except:
    print("✅ No Studio Flows found or API not available")
EOF

echo ""

# 4. Check if phone is in a Messaging Service pool
echo "4️⃣ Checking if phone number is in a Messaging Service..."
echo "========================================================="

# Get the phone number details again to check messaging_service_sid
PHONE_RESPONSE=$(curl -s -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$TWILIO_PHONE_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN")

python3 << EOF
import json
response = '''$PHONE_RESPONSE'''
try:
    data = json.loads(response)
    ms_sid = data.get('messaging_service_sid')
    app_sid = data.get('sms_application_sid')
    
    if ms_sid and ms_sid != 'null' and ms_sid != 'N/A':
        print(f"⚠️ FOUND THE ISSUE: Phone is assigned to Messaging Service: {ms_sid}")
        print("This overrides the phone number's webhook settings!")
        print("")
        print("To fix: Either:")
        print("1. Remove the phone from the Messaging Service in Twilio Console")
        print("2. Update the Messaging Service webhook instead of the phone webhook")
    elif app_sid and app_sid != '':
        print(f"⚠️ Phone is using TwiML App: {app_sid}")
        print("This might override the webhook settings!")
    else:
        print("✅ Phone is not in a Messaging Service or TwiML App")
        print(f"Current SMS URL: {data.get('sms_url')}")
        
    # Check for Studio Flow webhook
    if 'studio.twilio.com' in str(data.get('sms_url', '')):
        print("⚠️ Phone is configured to use a Studio Flow!")
except Exception as e:
    print(f"Error: {e}")
EOF

echo ""
echo "================================"
echo "📋 Summary:"
echo "If SMS is still going to Railway despite the webhook being set to ngrok,"
echo "check the issues above, especially Messaging Services and Studio Flows."
echo ""
echo "The most common issue is the phone being in a Messaging Service pool,"
echo "which overrides individual phone number webhooks."