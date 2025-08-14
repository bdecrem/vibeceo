#!/bin/bash

# Local Test Environment for Issue Tracker
# This script sets up everything you need to test locally

echo "🚀 Starting Local Issue Tracker Test Environment"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start the web server
echo -e "${YELLOW}Step 1: Starting local web server...${NC}"
cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web
echo "Starting web server on http://localhost:3000"
echo "You can submit issues at: http://localhost:3000/bart/issue-tracker"
echo ""
echo -e "${GREEN}Web server starting in background...${NC}"
npm run dev &
WEB_PID=$!
echo "Web server PID: $WEB_PID"
echo ""

# Wait for server to start
sleep 5

# Step 2: Open the issue tracker in browser
echo -e "${YELLOW}Step 2: Opening issue tracker in your browser...${NC}"
open "http://localhost:3000/bart/issue-tracker"
echo ""

# Step 3: Start the agent watcher
echo -e "${YELLOW}Step 3: Starting agent watcher...${NC}"
echo "The agent will check for new issues every 30 seconds"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop everything${NC}"
echo ""
echo "==========================================="
echo "WATCHING FOR NEW ISSUES..."
echo "==========================================="
echo ""

# Function to run agent
run_agent() {
    cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/agent-issue-tracker
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] Checking for new issues...${NC}"
    
    # Run reformulation
    ENABLE_AUTO_FIX=true PROJECT_ROOT=/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot node reformulate-issues.js
    
    # Uncomment this to also run auto-fix:
    # echo -e "${YELLOW}[$(date '+%H:%M:%S')] Running auto-fix...${NC}"
    # ENABLE_AUTO_FIX=true PROJECT_ROOT=/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot node fix-issues.js
    
    echo ""
}

# Cleanup function
cleanup() {
    echo ""
    echo -e "${RED}Shutting down...${NC}"
    kill $WEB_PID 2>/dev/null
    echo "✅ Test environment stopped"
    exit 0
}

# Set up cleanup on Ctrl+C
trap cleanup INT

# Run agent every 30 seconds
while true; do
    run_agent
    echo "Waiting 30 seconds before next check..."
    echo "---"
    sleep 30
done