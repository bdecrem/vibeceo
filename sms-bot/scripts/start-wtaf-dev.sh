#!/bin/bash

# WTAF Development Environment - Your Preferred Layout
PROJECT_PATH="/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8"

echo "🚀 Starting WTAF Development Environment..."

# Kill existing processes
lsof -ti:3030 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Open Terminal windows with your preferred layout
osascript -e '
tell application "Terminal"
    activate
    
    # Window 1: SMS Bot (Top Left - Short)
    do script "cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot && echo \"🤖 SMS Bot Listener (port 3030)\" && npm run build && npm run dev"
    set bounds of front window to {40, 40, 600, 300}
    set custom title of front window to "SMS Bot"
    
    # Window 2: WTAF Engine (Middle Left - Taller)
    do script "cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot && echo \"⚡ WTAF Engine (concurrent)\" && npm run build && node dist/scripts/start-engine.js"
    set bounds of front window to {40, 320, 600, 960}
    set custom title of front window to "WTAF Engine"
    
    # Window 3: Web Server (Bottom Left - Short)
    do script "cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web && echo \"🌐 Web Server (port 3000)\" && npm run build && npm run dev"
    set bounds of front window to {40, 1000, 600, 1190}
    set custom title of front window to "Web Server"
    
    # Window 4: Testing Terminal (Right Side - Standard Height)
    do script "cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot && echo \"🧪 Testing Terminal Ready!\""
    set bounds of front window to {640, 800, 1240, 1190}
    set custom title of front window to "Testing"
end tell'

echo "✅ Development environment started!"
