#!/bin/bash
# Script to set SMS webhook to either local dev or production
# Usage: ./toggle-sms.sh dev   (sets to local development - Mac Mini)
#        ./toggle-sms.sh mba   (sets to local development - MacBook Air)
#        ./toggle-sms.sh prod  (sets to production)

# Check if environment argument is provided
if [ "$1" != "dev" ] && [ "$1" != "mba" ] && [ "$1" != "prod" ]; then
  echo "Error: Please specify environment: dev, mba, or prod"
  echo "Usage: ./toggle-sms.sh dev   (sets to local development - Mac Mini)"
  echo "       ./toggle-sms.sh mba   (sets to local development - MacBook Air)"
  echo "       ./toggle-sms.sh prod  (sets to production)"
  exit 1
fi

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

PHONE_SID=$TWILIO_PHONE_SID
LOCAL_URL_MINI="https://theaf-sms.ngrok.io/sms/webhook"
LOCAL_URL_MBA="https://kochi-sms.ngrok.app/sms/webhook"
PRODUCTION_URL="https://smsbot-production.up.railway.app/sms/webhook"

echo "🔍 Checking current SMS webhook configuration..."

# Get current webhook URL
CURRENT_URL=$(curl -s -X GET "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$PHONE_SID.json" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" | \
  sed -n 's/.*"sms_url": *"\([^"]*\)".*/\1/p')

echo "📍 Current SMS webhook: $CURRENT_URL"

# Determine target URL and environment name based on argument
if [ "$1" = "dev" ]; then
  TARGET_URL="$LOCAL_URL_MINI"
  TARGET_ENV="local development - Mac Mini (ngrok)"

  # Check if ngrok is running when switching to dev
  if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "❌ Error: ngrok is not running!"
    echo "Please start ngrok first with: ngrok start --all"
    exit 1
  fi
elif [ "$1" = "mba" ]; then
  TARGET_URL="$LOCAL_URL_MBA"
  TARGET_ENV="local development - MacBook Air (ngrok)"

  # Check if ngrok is running when switching to mba
  if ! curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
    echo "❌ Error: ngrok is not running!"
    echo "Please start ngrok first with: ngrok start --all"
    exit 1
  fi
else
  TARGET_URL="$PRODUCTION_URL"
  TARGET_ENV="production (Railway)"
fi

# Check if already pointing to target
if [ "$CURRENT_URL" = "$TARGET_URL" ]; then
  echo "✅ SMS webhook is already set to $TARGET_ENV"
  echo "📱 Current URL: $TARGET_URL"
  exit 0
fi

echo "🔄 Setting SMS webhook to $TARGET_ENV..."
echo "📡 Target URL: $TARGET_URL"

# Update the SMS webhook URL
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$PHONE_SID.json" \
  --data-urlencode "SmsUrl=$TARGET_URL" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Success! SMS webhook set to $TARGET_ENV"
  echo "📱 SMS messages will now be delivered to: $TARGET_URL"
else
  echo "❌ Failed to update SMS webhook. Check your credentials and try again."
  exit 1
fi 