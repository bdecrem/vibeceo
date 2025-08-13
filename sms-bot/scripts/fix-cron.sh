#!/bin/bash

echo "Fixing cron job to include environment variables..."

# Remove old entry
crontab -l | grep -v "check-new-users" | crontab -

# Add new entry with wrapper script
(crontab -l 2>/dev/null; echo "0 * * * * /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/scripts/check-new-users-cron.sh >> /tmp/new-users-check.log 2>&1") | crontab -

echo "✅ Updated cron job to use wrapper script with environment variables"
echo ""
echo "New cron entry:"
crontab -l | grep check-new-users
echo ""
echo "This will run at the top of every hour (e.g., 3:00, 4:00, 5:00...)"