#!/bin/bash

echo "🚀 Starting SMS Bot Production Services..."
echo "📁 Current directory: $(pwd)"
echo "📁 Directory contents: $(ls -la)"

# Start the SMS bot in the background
echo "📱 Starting SMS bot..."
npm run start:prod &
SMS_PID=$!

# Start monitor.py from the current directory
echo "👁️ Starting monitor.py..."
echo "📁 Looking for monitor.py at: $(pwd)/scripts/monitor.py"
if [ -f "scripts/monitor.py" ]; then
    python scripts/monitor.py &
    MONITOR_PID=$!
    echo "✅ Monitor.py started with PID: $MONITOR_PID"
else
    echo "❌ monitor.py not found at $(pwd)/scripts/monitor.py"
    echo "📁 Contents of scripts directory: $(ls -la scripts/ 2>/dev/null || echo 'scripts directory not found')"
fi

echo "✅ Services started:"
echo "   SMS Bot PID: $SMS_PID"
echo "   Monitor PID: ${MONITOR_PID:-'FAILED'}"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $SMS_PID ${MONITOR_PID:-} 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Wait for both processes (only wait for monitor if it started)
if [ -n "$MONITOR_PID" ]; then
    wait $SMS_PID $MONITOR_PID
else
    echo "⚠️ Only waiting for SMS bot since monitor failed to start"
    wait $SMS_PID
fi 