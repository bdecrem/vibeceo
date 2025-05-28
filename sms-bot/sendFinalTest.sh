#!/bin/bash

# Load environment variables
source .env.local

# Send SMS using cURL with the most basic parameters
curl -X POST "https://api.sms.to/sms/send" \
  -H "Authorization: Bearer $SMS_TO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "6508989508",
    "message": "Final test message - please work!"
  }'
