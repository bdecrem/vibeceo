#!/bin/bash

echo "Starting hourly new user check loop..."
echo "Press Ctrl+C to stop"

while true; do
    echo ""
    echo "[$(date)] Running check..."
    cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/scripts
    ./check-new-users-cron.sh
    echo "[$(date)] Sleeping for 1 hour..."
    sleep 3600
done