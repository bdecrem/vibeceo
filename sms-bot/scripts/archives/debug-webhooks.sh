#!/bin/bash
# Script to debug webhook names and IDs

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

# Check for Supabase credentials
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
  echo "❌ Error: Missing Supabase credentials"
  echo "Please set SUPABASE_URL and SUPABASE_SERVICE_KEY"
  exit 1
fi

# Extract the project reference from the URL
PROJECT_REF=$(echo $SUPABASE_URL | grep -o '[^\.]*' | head -1)
echo "Project ref: $PROJECT_REF"

# Get all webhooks
echo "Fetching webhooks list..."
HOOKS_RESPONSE=$(curl -s "https://api.supabase.com/v1/projects/$PROJECT_REF/hooks" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json")

# Check if we got a valid response
if [[ $HOOKS_RESPONSE == *"id"* ]]; then
  echo "Found webhooks! Here's the full response:"
  echo "$HOOKS_RESPONSE" | jq .
  
  echo -e "\nExtracted webhook IDs and names:"
  echo "$HOOKS_RESPONSE" | jq -r '.[] | "ID: \(.id), Name: \(.name), URL: \(.url)"'
else
  echo "❌ Could not fetch webhooks. API response:"
  echo "$HOOKS_RESPONSE"
fi
