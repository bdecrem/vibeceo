#!/bin/bash

# Change this to your actual project path
PROJECT_PATH="$HOME/path/to/your/advisors-foundry"

osascript <<EOF
tell application "Terminal"
    # First, activate Terminal
    activate
    
    # Tab 1: SMS Bot Listener (port 3030)
    do script "cd $PROJECT_PATH && echo 'Starting SMS Bot Listener...' && npm run sms-bot"
    
    # Tab 2: WTAF Engine
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "cd $PROJECT_PATH && echo 'Starting WTAF Engine...' && npm run wtaf-engine" in front window
    
    # Tab 3: Web Server (port 3000)
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "cd $PROJECT_PATH && echo 'Starting Web Server...' && npm run web-server" in front window
    
    # Tab 4: Dev Routing Script
    tell application "System Events" to keystroke "t" using command down
    delay 0.5
    do script "cd $PROJECT_PATH && echo 'Starting Dev Routing Script...' && npm run dev-routing" in front window
end tell
EOF