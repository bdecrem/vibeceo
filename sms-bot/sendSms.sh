#!/bin/bash

# Load environment variables
source .env.local

# Send SMS using cURL
curl -X POST "https://api.sms.to/sms/send" \
  -H "Authorization: Bearer $SMS_TO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+16508989508",
    "message": "Test message from cURL via SMS.TO",
    "bypass_optout": true
  }'
