#!/bin/bash

# Webtoys Edit Agent - Complete System Startup
# Starts ngrok, webhook server, and worker pool all in one command

echo "🎨 Starting Webtoys Edit Agent System"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to script directory
cd "$(dirname "$0")"

# Check for required environment variables
if [ ! -f "../.env.local" ] && [ ! -f "../.env" ]; then
    echo -e "${RED}❌ No .env.local or .env file found${NC}"
    echo "   Please create .env.local with SUPABASE_URL and SUPABASE_SERVICE_KEY"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down Edit Agent System...${NC}"
    
    # Kill all child processes
    if [ ! -z "$NGROK_PID" ]; then
        echo "   Stopping ngrok (PID: $NGROK_PID)..."
        kill $NGROK_PID 2>/dev/null
    fi
    
    if [ ! -z "$WEBHOOK_PID" ]; then
        echo "   Stopping webhook server (PID: $WEBHOOK_PID)..."
        kill $WEBHOOK_PID 2>/dev/null
    fi
    
    if [ ! -z "$WORKERS_PID" ]; then
        echo "   Stopping worker manager (PID: $WORKERS_PID)..."
        kill $WORKERS_PID 2>/dev/null
    fi
    
    # Give processes time to shut down gracefully
    sleep 2
    
    # Force kill if still running
    kill -9 $NGROK_PID 2>/dev/null
    kill -9 $WEBHOOK_PID 2>/dev/null
    kill -9 $WORKERS_PID 2>/dev/null
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Set up trap for clean shutdown
trap cleanup EXIT INT TERM

# Check if services are already running and offer to stop them
if pgrep -f "ngrok http 3031" > /dev/null; then
    echo -e "${YELLOW}⚠️  ngrok is already running${NC}"
    echo -n "   Stop it and continue? (y/n): "
    read answer
    if [ "$answer" = "y" ]; then
        pkill -f "ngrok http 3031"
        sleep 1
    else
        exit 1
    fi
fi

if pgrep -f "webhook-server.js" > /dev/null; then
    echo -e "${YELLOW}⚠️  Webhook server is already running${NC}"
    echo -n "   Stop it and continue? (y/n): "
    read answer
    if [ "$answer" = "y" ]; then
        pkill -f "webhook-server.js"
        sleep 1
    else
        exit 1
    fi
fi

if pgrep -f "worker-manager.js" > /dev/null; then
    echo -e "${YELLOW}⚠️  Worker manager is already running${NC}"
    echo -n "   Stop it and continue? (y/n): "
    read answer
    if [ "$answer" = "y" ]; then
        pkill -f "worker-manager.js"
        # Also kill individual workers
        pkill -f "worker.js"
        sleep 2
        echo -e "${GREEN}   ✓ Stopped existing workers${NC}"
    else
        exit 1
    fi
fi

# Start ngrok in background with permanent subdomain
echo -e "${BLUE}🌐 Starting ngrok tunnel...${NC}"
ngrok http 3031 --subdomain=webtoys-agents > /tmp/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start and get URL
sleep 3
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$NGROK_URL" ]; then
    echo -e "${RED}❌ Failed to start ngrok or get tunnel URL${NC}"
    echo "   Check if ngrok is installed and configured"
    exit 1
fi

echo -e "${GREEN}✅ Ngrok tunnel established:${NC} $NGROK_URL"
echo ""
echo "======================================"
echo -e "${YELLOW}📋 ACTION REQUIRED:${NC}"
echo ""
echo "Update Railway environment variable:"
echo -e "${BLUE}EDIT_AGENT_WEBHOOK_URL=${NC}${GREEN}$NGROK_URL${NC}"
echo ""
echo "======================================"
echo ""

# Start webhook server
echo -e "${BLUE}🔔 Starting webhook server...${NC}"
EDIT_AGENT_ENABLED=true node webhook-server.js > /tmp/webhook.log 2>&1 &
WEBHOOK_PID=$!
sleep 2

if ! kill -0 $WEBHOOK_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start webhook server${NC}"
    cat /tmp/webhook.log
    exit 1
fi

echo -e "${GREEN}✅ Webhook server running on port 3031${NC}"

# Start worker manager
echo -e "${BLUE}👷 Starting worker pool...${NC}"
node worker-manager.js &
WORKERS_PID=$!
sleep 2

if ! kill -0 $WORKERS_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start worker manager${NC}"
    exit 1
fi

echo ""
echo "======================================"
echo -e "${GREEN}🎉 Edit Agent System Running!${NC}"
echo "======================================"
echo ""
echo "Services:"
echo -e "  ${GREEN}✓${NC} Ngrok tunnel: $NGROK_URL"
echo -e "  ${GREEN}✓${NC} Webhook server: http://localhost:3031"
echo -e "  ${GREEN}✓${NC} Worker pool: 2 workers active"
echo ""
echo "Commands:"
echo -e "  ${BLUE}View logs:${NC} tail -f /tmp/webhook.log"
echo -e "  ${BLUE}Ngrok dashboard:${NC} http://localhost:4040"
echo -e "  ${BLUE}Stop everything:${NC} ./stop-all.sh"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo "======================================"
echo ""

# Keep script running and show worker output
wait $WORKERS_PID