#!/bin/bash
# Script to toggle between development (WhatsApp) and production (SMS) environments
# This updates both Twilio webhook and Supabase webhook
# Usage: ./switch-env.sh dev   (WhatsApp sandbox for development)
#        ./switch-env.sh prod  (SMS for production users)

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
NGROK_URL="https://theaf-sms.ngrok.io"               # Your permanent ngrok URL
PRODUCTION_URL="https://smsbot-production.up.railway.app" # Your Railway URL

# Check if environment argument is provided
if [ "$1" != "dev" ] && [ "$1" != "prod" ]; then
  echo "Error: Please specify environment: dev or prod"
  echo "Usage: ./switch-env.sh dev   (WhatsApp sandbox for development)"
  echo "       ./switch-env.sh prod  (SMS for production users)"
  exit 1
fi

# Function to check if ngrok is running
check_ngrok_running() {
  if pgrep -f "ngrok" > /dev/null; then
    return 0  # ngrok is running
  else
    return 1  # ngrok is not running
  fi
}

# Function to start ngrok and wait for it to be ready
start_ngrok() {
  echo "🚀 Starting ngrok tunnels..."
  
  # Start ngrok in the background
  cd "$ROOT_DIR/.." && ngrok start --all > /dev/null 2>&1 &
  
  # Wait for ngrok to be ready (check every 2 seconds, max 30 seconds)
  local max_attempts=15
  local attempt=0
  
  while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
      echo "✅ ngrok tunnels are ready!"
      return 0
    fi
    echo "⏳ Waiting for ngrok to start... (attempt $((attempt + 1))/$max_attempts)"
    sleep 2
    attempt=$((attempt + 1))
  done
  
  echo "❌ Failed to start ngrok after 30 seconds"
  return 1
}

# Determine which URLs to use
if [ "$1" = "dev" ]; then
  # Development environment URLs (WhatsApp sandbox)
  TWILIO_TARGET_URL="$NGROK_URL/whatsapp/webhook"
  SUPABASE_TARGET_URL="$NGROK_URL/api/webhooks/new-subscriber"
  ENV_NAME="development (WhatsApp sandbox via ngrok)"
  
  # Check if ngrok is running, start it if not
  if ! check_ngrok_running; then
    echo "📡 ngrok is not running. Starting ngrok..."
    if ! start_ngrok; then
      echo "❌ Failed to start ngrok. Please start it manually with: ngrok start --all"
      exit 1
    fi
  else
    echo "✅ ngrok is already running"
  fi
else
  # Production environment URLs
  TWILIO_TARGET_URL="$PRODUCTION_URL/sms/webhook"
  SUPABASE_TARGET_URL="$PRODUCTION_URL/api/webhooks/new-subscriber"
  ENV_NAME="production (Railway)"
  
  # Optionally stop ngrok when switching to production
  if check_ngrok_running; then
    echo "🛑 Stopping ngrok (switching to production)..."
    pkill -f "ngrok"
    sleep 2
  fi
fi

echo "Switching to $ENV_NAME environment..."

# Update the Twilio webhook URL
echo "Updating Twilio webhook to: $TWILIO_TARGET_URL"

if [ "$1" = "dev" ]; then
  # For development, configure WhatsApp sandbox webhook
  echo "🔧 Configuring WhatsApp sandbox webhook..."
  curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Sandbox/WhatsApp.json" \
    --data-urlencode "WhatsAppUrl=$TWILIO_TARGET_URL" \
    -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
  
  if [ $? -eq 0 ]; then
    echo "✅ Success! WhatsApp sandbox webhook updated to $ENV_NAME"
    echo "📱 To test: Send 'join' + your sandbox code to +1 (415) 523-8886 on WhatsApp"
  else
    echo "❌ Failed to update WhatsApp sandbox webhook. Check your credentials and try again."
  fi
else
  # For production, configure regular SMS webhook
  curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/IncomingPhoneNumbers/$PHONE_SID.json" \
    --data-urlencode "SmsUrl=$TWILIO_TARGET_URL" \
    -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN"
  
  if [ $? -eq 0 ]; then
    echo "✅ Success! SMS webhook updated to $ENV_NAME"
  else
    echo "❌ Failed to update SMS webhook. Check your credentials and try again."
  fi
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
    # Look for webhooks with the new-subscriber endpoint in their URL
    HOOK_ID=$(echo $HOOKS_RESPONSE | grep -o '"id":[0-9]*.*"url":"[^"]*webhooks/new-subscriber[^"]*"' | grep -o '"id":[0-9]*' | grep -o '[0-9]*' | head -1)
    
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
