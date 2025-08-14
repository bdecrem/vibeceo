#!/bin/bash

# Script to add new user check to crontab

echo "Adding WEBTOYS new user check to crontab..."

# The cron job to add (runs every hour at :00)
CRON_JOB="0 * * * * cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/scripts && /opt/homebrew/bin/node check-new-users.js >> /tmp/new-users-check.log 2>&1"

# Check if this job already exists
if crontab -l 2>/dev/null | grep -q "check-new-users.js"; then
    echo "❌ Job already exists in crontab!"
    echo "Current entry:"
    crontab -l | grep "check-new-users.js"
else
    # Add the job to crontab
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Added to crontab successfully!"
    echo ""
    echo "The job will run:"
    echo "  - Every hour at :00 (e.g., 1:00, 2:00, 3:00...)"
    echo "  - Logs will be at: /tmp/new-users-check.log"
    echo ""
    echo "To verify, run: crontab -l"
    echo "To watch logs: tail -f /tmp/new-users-check.log"
fi