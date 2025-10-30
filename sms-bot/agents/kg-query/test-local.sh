#!/bin/bash
# Test script for KG Query Agent (local development)

# CRITICAL: Remove Claude Code OAuth token to force API key usage
unset CLAUDE_CODE_OAUTH_TOKEN
unset CLAUDECODE
unset CLAUDE_CODE_ENTRYPOINT

echo "=== KG Agent Local Test ==="
echo ""

# Check Python version
echo "1. Python version:"
python3 --version
echo ""

# Check required packages
echo "2. Checking required packages:"
pip3 show claude-agent-sdk | grep "Version:"
pip3 show neo4j | grep "Version:"
echo ""

# Check environment variables
echo "3. Checking environment variables:"
echo "   NEO4J_URI: ${NEO4J_URI:0:30}..."
echo "   NEO4J_USERNAME: ${NEO4J_USERNAME:+SET}"
echo "   NEO4J_PASSWORD: ${NEO4J_PASSWORD:+SET}"
echo "   NEO4J_DATABASE: ${NEO4J_DATABASE:-neo4j}"
echo ""

# Check for API keys (one of these is required)
if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "   ANTHROPIC_API_KEY: SET ✓"
elif [ -n "$CLAUDE_AGENT_SDK_TOKEN" ]; then
    echo "   CLAUDE_AGENT_SDK_TOKEN: SET ✓"
else
    echo "   ❌ ERROR: Neither ANTHROPIC_API_KEY nor CLAUDE_AGENT_SDK_TOKEN is set!"
    echo ""
    echo "Please set one of these environment variables:"
    echo "  export ANTHROPIC_API_KEY='your-key-here'"
    echo "  or"
    echo "  export CLAUDE_AGENT_SDK_TOKEN='your-token-here'"
    echo ""
    exit 1
fi
echo ""

# Test MCP server directly
echo "4. Testing MCP server (neo4j_mcp_server.py):"
echo "   Sending ping request..."
echo '{"jsonrpc":"2.0","id":1,"method":"ping"}' | python3 neo4j_mcp_server.py 2>&1 | head -10
echo ""

# Run agent with sample query
echo "5. Running agent with sample query:"
echo ""

INPUT_JSON='{
  "query": "What papers were published about transformers in the last 7 days?",
  "conversation_history": [],
  "todays_report_context": "Today we have 3 new AI papers focused on multimodal learning.",
  "clean_data_boundary": {
    "startDate": "2024-02-01",
    "endDate": "2025-10-30",
    "cleanPercentage": 85.5
  }
}'

echo "Input:"
echo "$INPUT_JSON" | jq .
echo ""
echo "Running agent..."
echo ""

export KG_AGENT_DEBUG=1

python3 agent.py --input "$INPUT_JSON"

echo ""
echo "=== Test Complete ==="
