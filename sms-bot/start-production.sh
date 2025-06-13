#!/bin/bash

echo "🚀 Starting SMS Bot Production Services..."

# Start the SMS bot in the background
echo "📱 Starting SMS bot..."
npm run start:prod &
SMS_PID=$!

# Start monitor.py from the root directory in the background
echo "👁️ Starting monitor.py..."
cd ..
python sms-bot/scripts/monitor.py &
MONITOR_PID=$!

# Return to sms-bot directory
cd sms-bot

echo "✅ Both services started:"
echo "   SMS Bot PID: $SMS_PID"
echo "   Monitor PID: $MONITOR_PID"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $SMS_PID $MONITOR_PID 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Wait for both processes
wait $SMS_PID $MONITOR_PID 