#!/bin/bash

# Start-all script for Webtoys Edit Agent and related services
# This script starts all necessary services for the edit agent system

echo "==================================================================="
echo "🚀 STARTING ALL WEBTOYS SERVICES"
echo "==================================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Function to check if a process is running
check_process() {
    if pgrep -f "$1" > /dev/null; then
        echo -e "${GREEN}✓${NC} $2 is already running"
        return 0
    else
        echo -e "${YELLOW}○${NC} $2 is not running"
        return 1
    fi
}

# Function to start a service in a new terminal window
start_service() {
    local service_name=$1
    local service_cmd=$2
    local service_dir=$3
    
    echo -e "${YELLOW}Starting $service_name...${NC}"
    
    # For macOS, use osascript to open new Terminal windows
    osascript -e "
    tell application \"Terminal\"
        do script \"cd $service_dir && $service_cmd\"
        set custom title of front window to \"$service_name\"
    end tell
    " > /dev/null 2>&1
    
    echo -e "${GREEN}✓${NC} $service_name started in new terminal window"
}

echo "Checking existing services..."
echo "-------------------------------------------------------------------"

# Check if services are already running
check_process "ngrok http 3031" "ngrok tunnel"
NGROK_RUNNING=$?

check_process "webhook-server.js" "Webhook server"
WEBHOOK_RUNNING=$?

# No workers.js - removed this check

echo ""
echo "Starting services..."
echo "-------------------------------------------------------------------"

# 1. Start ngrok tunnel (port 3031)
if [ $NGROK_RUNNING -ne 0 ]; then
    start_service "ngrok tunnel" "ngrok http 3031" "$SCRIPT_DIR"
    echo "   → Exposes localhost:3031 to the internet"
    echo "   → Check http://localhost:4040 for tunnel URL"
    sleep 3
else
    echo -e "${GREEN}✓${NC} ngrok already running"
fi

# 2. Start webhook server (port 3031)
if [ $WEBHOOK_RUNNING -ne 0 ]; then
    start_service "Webhook Server" "node webtoys-edit-agent/webhook-server.js" "$SCRIPT_DIR"
    echo "   → Receives webhook calls for edit processing"
    echo "   → Handles Community Desktop requests too"
    sleep 2
else
    echo -e "${GREEN}✓${NC} Webhook server already running"
fi

# No worker pool - edit agent processes sequentially

# 4. Run monitor once to process any pending requests
echo ""
echo "Running initial checks..."
echo "-------------------------------------------------------------------"

# Check for pending edit requests
echo -e "${YELLOW}Checking for pending edit requests...${NC}"
cd "$SCRIPT_DIR/webtoys-edit-agent"
node monitor.js --check-only 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No pending edit requests"
else
    echo -e "${YELLOW}!${NC} Found pending requests - run 'node webtoys-edit-agent/monitor.js' to process"
fi

# Check for pending Community Desktop submissions
echo -e "${YELLOW}Checking for pending Community Desktop submissions...${NC}"
cd "$SCRIPT_DIR/community-desktop"
node monitor.js --check-only 2>/dev/null
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} No pending desktop submissions"
else
    echo -e "${YELLOW}!${NC} Found pending submissions - run 'node community-desktop/monitor.js' to process"
fi

echo ""
echo "==================================================================="
echo -e "${GREEN}✅ ALL SERVICES STARTED${NC}"
echo "==================================================================="
echo ""
echo "📝 Quick Reference:"
echo "-------------------------------------------------------------------"
echo "• ngrok dashboard:      http://localhost:4040"
echo "• Webhook health:       http://localhost:3031/health"
echo "• Community Desktop:    http://localhost:3000/community-desktop.html"
echo "• Submit apps:          http://localhost:3000/community-desktop-submit.html"
echo ""
echo "📋 Manual Commands:"
echo "-------------------------------------------------------------------"
echo "• Process edits:        node webtoys-edit-agent/monitor.js"
echo "• Process desktop:      node community-desktop/monitor.js"
echo "• Check ngrok URL:      curl http://localhost:4040/api/tunnels"
echo ""
echo "⚠️  IMPORTANT:"
echo "-------------------------------------------------------------------"
echo "1. Update Railway's EDIT_AGENT_WEBHOOK_URL with the ngrok URL"
echo "2. Set EDIT_AGENT_ENABLED=true in Railway environment"
echo "3. Keep terminal windows open for services to run"
echo ""
echo "Press Ctrl+C in each terminal window to stop services"
echo "==================================================================="