#!/bin/bash

# Start the SMS bot in background
node dist/src/index.js > /tmp/sms-bot-startup.log 2>&1 &
PID=$!

# Wait for it to start
sleep 5

# Test health endpoint
echo "Testing health endpoint..."
curl -s http://localhost:3030/health
echo ""

# Test dev webhook endpoint
echo ""
echo "Testing routes..."
curl -s http://localhost:3030/routes | python3 -m json.tool 2>/dev/null || curl -s http://localhost:3030/routes

# Kill the bot
echo ""
echo ""
kill $PID 2>/dev/null || true

# Show the log
echo "Startup log:"
cat /tmp/sms-bot-startup.log
