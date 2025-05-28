#!/bin/bash

# Load environment variables
source .env.local

# Send SMS using cURL with different phone number formats
curl -X POST "https://api.sms.to/sms/send" \
  -H "Authorization: Bearer $SMS_TO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "6508989508",
    "message": "Test message with local number format (6508989508)",
    "bypass_optout": true
  }'
