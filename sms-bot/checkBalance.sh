#!/bin/bash

# Load environment variables
source .env.local

# Check account balance
curl -X GET "https://api.sms.to/balance" \
  -H "Authorization: Bearer $SMS_TO_API_KEY"
