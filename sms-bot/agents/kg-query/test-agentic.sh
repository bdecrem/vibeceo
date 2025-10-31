#!/bin/bash
# Test script for agentic KG agent with SDK MCP tools

cd "$(dirname "$0")"

# Activate venv with SDK v0.1.6
source .venv/bin/activate

# Enable debug mode to see tool calls
export KG_AGENT_DEBUG=1

# Test query: authors (to verify NO fake URLs)
TEST_INPUT='{
  "query": "Give me 2 up and coming authors from the last week",
  "conversation_history": [],
  "todays_report_context": "Testing agentic Neo4j query agent - verifying author formatting",
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
echo "Query: Give me 2 up and coming authors from the last week"
echo ""
echo "Expected behavior:"
echo "- Claude should make MULTIPLE tool calls"
echo "- Should query for name, affiliation, h_index, citations, last_seen"
echo "- Format: **Author Name** (Affiliation) - h-index: X, Y citations. Active [date]"
echo "- NO URLs for authors (only papers get arxiv links)"
echo ""
echo "================================"
echo ""

python3 agent.py --input "$TEST_INPUT"

echo ""
echo "================================"
echo "Test complete!"
echo "Check above for [KG Agent Debug] messages showing tool calls"
echo "================================"
