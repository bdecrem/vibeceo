#!/bin/bash
# Test script for agentic KG agent with SDK MCP tools

cd "$(dirname "$0")"

# Activate venv with SDK v0.1.6
source .venv/bin/activate

# Enable debug mode to see tool calls
export KG_AGENT_DEBUG=1

# Test query: recent papers (to verify links)
TEST_INPUT='{
  "query": "What are the latest papers on transformers?",
  "conversation_history": [],
  "todays_report_context": "Testing agentic Neo4j query agent - verifying clickable links",
  "clean_data_boundary": {
    "startDate": "2024-02-14",
    "endDate": "2025-10-23",
    "cleanPercentage": 72.5
  }
}'

echo "================================"
echo "Testing KG Agent (Agentic Mode)"
echo "================================"
echo ""
echo "Query: What are the latest papers on transformers?"
echo ""
echo "Expected behavior:"
echo "- Claude should make MULTIPLE tool calls"
echo "- Should query for arxiv_id, title, arxiv_url"
echo "- Should return clickable links in format [Title](https://arxiv.org/abs/ID)"
echo ""
echo "================================"
echo ""

python3 agent.py --input "$TEST_INPUT"

echo ""
echo "================================"
echo "Test complete!"
echo "Check above for [KG Agent Debug] messages showing tool calls"
echo "================================"
