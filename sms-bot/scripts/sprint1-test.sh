#!/bin/bash

# Sprint 1 Test Script
# This script helps you test the complete agent runtime end-to-end

echo ""
echo "=========================================="
echo "Sprint 1: Agent Runtime Test"
echo "=========================================="
echo ""

# Check if SMS bot is running
if ! curl -s http://localhost:3030/health > /dev/null 2>&1; then
    echo "❌ SMS bot is not running on port 3030"
    echo ""
    echo "Start it with:"
    echo "  cd sms-bot && npm run dev"
    exit 1
fi

echo "✅ SMS bot is running"
echo ""

# Step 1: Create test agent
echo "Step 1: Creating test agent..."
echo "----------------------------------------"

cd "$(dirname "$0")/.."

# Run the create test agent script
node dist/scripts/create_test_agent.js

echo ""
echo "=========================================="
echo "Next Steps:"
echo "=========================================="
echo ""
echo "1. Copy the Agent Version ID from above"
echo ""
echo "2. Run this command (replace VERSION_ID):"
echo ""
echo "   curl -X POST http://localhost:3030/admin/run-agent/VERSION_ID \\"
echo "     -H \"Authorization: Bearer test-admin-token\""
echo ""
echo "3. Watch the output in the SMS bot terminal"
echo ""
echo "4. Check the report URL in the response"
echo ""
