#!/bin/bash
cd /Users/harjyot/Desktop/code/vibeceo/vibeceo/web
PORT=3002 npm run dev >> /tmp/vibeceo-web-3002.log 2>&1 &
echo "Web server starting on port 3002..."
sleep 6
echo "Checking server status..."
lsof -i :3002 | grep LISTEN && echo "✅ Web server is running on port 3002!" || echo "❌ Server not started, check logs at /tmp/vibeceo-web-3002.log"
