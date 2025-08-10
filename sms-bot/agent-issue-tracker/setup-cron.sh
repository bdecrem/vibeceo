#!/bin/bash

echo "🕐 Setting up automated issue tracker cron job..."

# Get current crontab
crontab -l > /tmp/current_cron 2>/dev/null || touch /tmp/current_cron

# Check if our job already exists
if grep -q "agent-issue-tracker.*monitor.js" /tmp/current_cron; then
    echo "⚠️  Issue tracker cron job already exists!"
    echo "Current schedule:"
    grep "agent-issue-tracker.*monitor.js" /tmp/current_cron
else
    # Add our new cron jobs
    echo "" >> /tmp/current_cron
    echo "# WEBTOYS Issue Tracker Agent - Reformulation every 2 hours" >> /tmp/current_cron
    echo "*/5 * * * * cd /Users/bartbart/Documents/VibeCEO8/sms-bot/agent-issue-tracker && ENABLE_AUTO_FIX=true PROJECT_ROOT=/Users/bartbart/Documents/VibeCEO8/sms-bot /opt/homebrew/bin/node monitor.js >> /tmp/issue-tracker.log 2>&1" >> /tmp/current_cron
    
    # Install the new crontab
    crontab /tmp/current_cron
    
    echo "✅ Cron job added successfully!"
    echo ""
    echo "📅 Schedule:"
    echo "   - Reformulation: Every 2 hours (at minute 0)"
    echo "   - Auto-fix: Disabled (uncomment in crontab to enable)"
    echo ""
    echo "📝 Logs will be saved to:"
    echo "   - agent-issue-tracker/logs/monitor.log"
fi

# Clean up
rm -f /tmp/current_cron

echo ""
echo "To view your crontab: crontab -l"
echo "To edit manually: crontab -e"
echo "To check logs: tail -f logs/monitor.log"