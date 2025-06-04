#!/bin/bash
# Script to toggle between local development and production environments
# This updates both Twilio webhook and Supabase webhook
# Usage: ./switch-env.sh dev   (to use local ngrok URLs)
#        ./switch-env.sh prod  (to use Railway production URLs)

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
if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ] || [ -z "$TWILIO_PHONE_NUMBER" ]; then
  echo "❌ Error: Missing required Twilio environment variables"
  echo "Please ensure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER are set"
  exit 1
fi

# Check for Supabase credentials
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "⚠️ Warning: Missing Supabase credentials - will only update Twilio webhook"
  echo "To update Supabase webhook automatically, please set:"
  echo "SUPABASE_URL and SUPABASE_SERVICE_KEY"
  UPDATE_SUPABASE=false
else
  UPDATE_SUPABASE=true
fi

# Use the phone SID from environment variable
if [ -z "$TWILIO_PHONE_SID" ]; then
  echo "❌ Error: TWILIO_PHONE_SID environment variable is not set"
  echo "Please export your phone SID with: export TWILIO_PHONE_SID=PN..."
  echo "You can find your phone SID in the Twilio console under Phone Numbers > Active Numbers"
  exit 1
fi

PHONE_SID=$TWILIO_PHONE_SID
echo "✅ Using phone SID: $PHONE_SID"
NGROK_URL="https://f38433ab7cd7.ngrok.app"               # Your current ngrok URL
PRODUCTION_URL="https://smsbot-production.up.railway.app" # Your Railway URL

# Check if environment argument is provided
if [ "$1" != "dev" ] && [ "$1" != "prod" ]; then
  echo "Error: Please specify environment: dev or prod"
  echo "Usage: ./switch-env.sh dev   (to use local ngrok URL)"
  echo "       ./switch-env.sh prod  (to use Railway production URL)"
  exit 1
fi

# Determine which URLs to use
if [ "$1" = "dev" ]; then
  # Development environment URLs
  TWILIO_TARGET_URL="$NGROK_URL/sms/webhook"
  SUPABASE_TARGET_URL="$NGROK_URL/api/webhooks/new-subscriber"
  ENV_NAME="development (ngrok)"
else
  # Production environment URLs
  TWILIO_TARGET_URL="$PRODUCTION_URL/sms/webhook"
  SUPABASE_TARGET_URL="$PRODUCTION_URL/api/webhooks/new-subscriber"
  ENV_NAME="production (Railway)"
fi

echo "Switching to $ENV_NAME environment..."

# Update the Twilio webhook URL
echo "Updating Twilio webhook to: $TWILIO_TARGET_URL"
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$PHONE_SID.json" \
  --data-urlencode "SmsUrl=$TWILIO_TARGET_URL" \
  -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"

if [ $? -eq 0 ]; then
  echo "✅ Success! Twilio webhook updated to $ENV_NAME"
else
  echo "❌ Failed to update Twilio webhook. Check your credentials and try again."
fi

# Provide instructions for updating Supabase webhook
echo "\nℹ️ SUPABASE WEBHOOK INFO:"
echo "Remember to manually update your Supabase webhook URL to:"
echo "$SUPABASE_TARGET_URL"
echo "\nYou can do this in the Supabase Dashboard:"
echo "1. Go to Database → Database Webhooks"
echo "2. Edit your webhook for new subscribers"
echo "3. Change the URL to the one above"
echo "4. Click Save"

# Only attempt automatic update if credentials are available
if [ "$UPDATE_SUPABASE" = true ]; then
  echo "\n🔍 Attempting to find and update Supabase webhooks automatically..."
  
  # Extract the project reference from the URL
  PROJECT_REF=$(echo $SUPABASE_URL | grep -o '[^\.]*' | head -1)
  
  # Get all webhooks first
  echo "Fetching webhooks list..."
  HOOKS_RESPONSE=$(curl -s "https://api.supabase.com/v1/projects/$PROJECT_REF/hooks" \
    -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
    -H "Content-Type: application/json")
  
  # Check if we got a valid response
  if [[ $HOOKS_RESPONSE == *"id"* ]]; then
    echo "Found webhooks! Looking for subscriber webhook..."
    # This is a simplistic approach - it will attempt to update any webhook with 'subscriber' in the name
    HOOK_ID=$(echo $HOOKS_RESPONSE | grep -o '"id":[0-9]*.*"name":"[^"]*subscriber[^"]*"' | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
    
    if [ ! -z "$HOOK_ID" ]; then
      echo "Found subscriber webhook with ID: $HOOK_ID"
      # Update the webhook
      UPDATE_RESPONSE=$(curl -s -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/hooks/$HOOK_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
        --data-raw '{"url":"'"$SUPABASE_TARGET_URL"'"}' | grep -o '"url":"[^"]*"')
      
      if [[ $UPDATE_RESPONSE == *"$SUPABASE_TARGET_URL"* ]]; then
        echo "✅ Success! Supabase webhook updated automatically to $ENV_NAME"
      else
        echo "❌ Could not automatically update webhook. Please update it manually."
      fi
    else
      echo "❌ Could not find a subscriber webhook. Please update it manually."
    fi
  else
    echo "❌ Could not fetch webhooks. Please update manually with the URL above."
  fi
fi

echo "\n🔄 Environment switch completed!"
