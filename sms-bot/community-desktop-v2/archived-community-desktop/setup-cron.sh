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
    echo "0 */2 * * * cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8-agenttest/sms-bot/agent-issue-tracker && /usr/local/bin/node monitor.js --reformulate >> logs/monitor.log 2>&1" >> /tmp/current_cron
    
    # Optional: Add full pipeline with auto-fix (commented out by default)
    echo "# Uncomment below to enable auto-fix pipeline every 4 hours:" >> /tmp/current_cron
    echo "# 0 */4 * * * cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8-agenttest/sms-bot/agent-issue-tracker && ENABLE_AUTO_FIX=true /usr/local/bin/node monitor.js >> logs/auto-fix.log 2>&1" >> /tmp/current_cron
    
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