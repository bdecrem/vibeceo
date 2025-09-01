#!/bin/bash

echo "🛑 Stopping WebtoysOS Edit Agent CLI..."

# Kill webhook server
pkill -f "node webhook-server.js" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Webhook server stopped"
else
    echo "   ℹ️  Webhook server was not running"
fi

# Kill worker processes
pkill -f "node worker.js" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ Worker processes stopped"
else
    echo "   ℹ️  No workers were running"
fi

# Kill ngrok
pkill -f "ngrok http 3032" 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✅ ngrok tunnel stopped"
else
    echo "   ℹ️  ngrok was not running"
fi

echo "✅ All services stopped"