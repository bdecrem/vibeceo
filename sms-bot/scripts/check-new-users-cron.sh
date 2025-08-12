#!/bin/bash

# Wrapper script for cron that loads environment variables

# Change to the script directory
cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/scripts

# Source the .env.local file properly
set -a  # automatically export all variables
source ../.env.local
set +a  # turn off automatic export

# Debug: Log that we're running with env vars
echo "Running with SENDGRID_API_KEY: ${SENDGRID_API_KEY:0:10}..."

# Run the Node.js script
/opt/homebrew/bin/node check-new-users.js