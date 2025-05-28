#!/bin/bash

# Load environment variables from .env.local
source .env.local

# Current timestamp for the message
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Send SMS using cURL
MESSAGE="Test message from VibeCEO - ${TIMESTAMP}"

curl -X POST "https://api.sms.to/sms/send" \
  -H "Authorization: Bearer $SMS_TO_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"to\":\"6508989508\",\"message\":\"$MESSAGE\",\"bypass_optout\":true,\"sender_id\":\"VibeCEO\"}"
