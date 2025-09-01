#!/bin/bash

# WebtoysOS Edit Agent CLI - Unified Startup Script
# Starts ngrok tunnel and webhook server

echo "╔════════════════════════════════════════════════╗"
echo "║   WebtoysOS Edit Agent CLI - Starting...      ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Configuration
WEBHOOK_PORT=3032
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install it first:"
    echo "   brew install ngrok"
    exit 1
fi

# Check if webhook server is already running
if lsof -i:$WEBHOOK_PORT > /dev/null 2>&1; then
    echo "⚠️  Port $WEBHOOK_PORT is already in use!"
    echo "   Another instance may be running."
    read -p "   Kill the existing process? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "   Stopping existing process..."
        lsof -ti:$WEBHOOK_PORT | xargs kill -9
        sleep 2
    else
        echo "❌ Exiting. Please stop the existing process first."
        exit 1
    fi
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down..."
    
    # Kill webhook server
    if [ ! -z "$WEBHOOK_PID" ]; then
        kill $WEBHOOK_PID 2>/dev/null
        echo "   ✅ Webhook server stopped"
    fi
    
    # Kill ngrok
    if [ ! -z "$NGROK_PID" ]; then
        kill $NGROK_PID 2>/dev/null
        echo "   ✅ ngrok tunnel stopped"
    fi
    
    echo "👋 Goodbye!"
    exit 0
}

# Set up trap for cleanup
trap cleanup INT TERM

# Start ngrok in background
echo "🌐 Starting ngrok tunnel on port $WEBHOOK_PORT..."
ngrok http $WEBHOOK_PORT > /tmp/ngrok-webtoys-edit.log 2>&1 &
NGROK_PID=$!

# Wait for ngrok to start
sleep 3

# Get ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | cut -d'"' -f4 | head -1)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Failed to get ngrok URL. Check if ngrok is running properly."
    kill $NGROK_PID 2>/dev/null
    exit 1
fi

echo "   ✅ ngrok tunnel established: $NGROK_URL"
echo ""
echo "📋 IMPORTANT: Configure your Issue Tracker to use this webhook:"
echo "   Edit Agent URL: $NGROK_URL"
echo ""

# Start webhook server
echo "🚀 Starting webhook server..."
cd "$SCRIPT_DIR"
WEBTOYS_EDIT_PORT=$WEBHOOK_PORT node webhook-server.js &
WEBHOOK_PID=$!

echo ""
echo "✅ All services started successfully!"
echo ""
echo "📍 Service URLs:"
echo "   Local webhook: http://localhost:$WEBHOOK_PORT"
echo "   Public webhook: $NGROK_URL"
echo "   Health check: $NGROK_URL/health"
echo ""
echo "🔧 Manual trigger: $NGROK_URL/trigger"
echo ""
echo "💡 Tips:"
echo "   - The webhook URL changes each time ngrok restarts"
echo "   - Update the Issue Tracker with the new URL when needed"
echo "   - Press Ctrl+C to stop all services"
echo ""
echo "📊 Monitoring:"
echo "   Webhook logs will appear here..."
echo "   ngrok dashboard: http://localhost:4040"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Wait for processes
wait $WEBHOOK_PID