#!/bin/bash

# Start WEBTOYS SMS Bot with Alerts Monitor
# This script starts both the SMS bot and the alerts monitoring service

echo "🚀 Starting WEBTOYS SMS Bot with Alerts Monitor..."

# Start the alert monitor in the background
echo "📡 Starting alerts monitor..."
node alert-monitor.js &
ALERT_PID=$!

# Start the main SMS bot
echo "📱 Starting SMS bot..."
node dist/src/index.js &
SMS_PID=$!

# Function to handle shutdown
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $ALERT_PID 2>/dev/null
    kill $SMS_PID 2>/dev/null
    echo "✅ Services stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "✅ Both services are running"
echo "   - SMS Bot PID: $SMS_PID"
echo "   - Alerts Monitor PID: $ALERT_PID"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for either process to exit
wait