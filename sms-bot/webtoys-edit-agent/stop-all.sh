#!/bin/bash

# Webtoys Edit Agent - Stop All Services
# Stops ngrok, webhook server, and all workers

echo "🛑 Stopping Webtoys Edit Agent System"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to stop a service
stop_service() {
    local service_name=$1
    local process_pattern=$2
    
    if pgrep -f "$process_pattern" > /dev/null; then
        echo -e "${YELLOW}Stopping $service_name...${NC}"
        pkill -f "$process_pattern"
        sleep 1
        
        # Check if still running and force kill if needed
        if pgrep -f "$process_pattern" > /dev/null; then
            echo -e "${RED}  Force killing $service_name...${NC}"
            pkill -9 -f "$process_pattern"
        fi
        
        echo -e "${GREEN}  ✓ $service_name stopped${NC}"
    else
        echo -e "  $service_name not running"
    fi
}

# Stop all services
stop_service "Worker Manager" "worker-manager.js"
stop_service "Individual Workers" "worker.js"
stop_service "Webhook Server" "webhook-server.js"
stop_service "Ngrok Tunnel" "ngrok http 3031"

echo ""
echo -e "${GREEN}✅ All Edit Agent services stopped${NC}"
echo ""

# Clean up log files
if [ -f /tmp/webhook.log ]; then
    rm /tmp/webhook.log
    echo "  Cleaned up webhook logs"
fi

if [ -f /tmp/ngrok.log ]; then
    rm /tmp/ngrok.log
    echo "  Cleaned up ngrok logs"
fi

echo ""