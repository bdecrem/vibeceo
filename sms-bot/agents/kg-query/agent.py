#!/usr/bin/env python3
"""
KG Query Agent - Claude Agent SDK Implementation

Uses claude_agent_sdk.query() for Neo4j graph queries.
"""

import argparse
import asyncio
import json
import os
import sys
from typing import Dict, List, Any

# Import Claude Agent SDK
try:
    from claude_agent_sdk import ClaudeAgentOptions, query
except ImportError as e:
    print(f"Error importing claude-agent-sdk: {e}", file=sys.stderr)
    sys.exit(1)

# Import Neo4j tools
from neo4j_tools import Neo4jTools


async def run_kg_query(
    user_query: str,
    conversation_history: List[Dict[str, str]],
    todays_report_context: str,
    clean_data_boundary: Dict[str, Any]
) -> str:
    """
    Run KG query using Claude Agent SDK.

    Args:
        user_query: User's natural language question
        conversation_history: Previous messages (for follow-ups)
        todays_report_context: Summary of today's arXiv report
        clean_data_boundary: Dict with startDate, endDate, cleanPercentage

    Returns:
        Natural language response (SMS-friendly)
    """
    # Get clean data info
    clean_start = clean_data_boundary.get("startDate", "Unknown")
    clean_end = clean_data_boundary.get("endDate", "Unknown")
    clean_pct = clean_data_boundary.get("cleanPercentage", 0)

    # Format conversation history
    conv_text = ""
    if conversation_history:
        conv_text = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in conversation_history[-5:]  # Last 5 exchanges
        ])

    # Build prompt
    prompt = f"""You are a Neo4j graph database expert helping users explore arXiv AI research papers.

TODAY'S CONTEXT:
{todays_report_context}

CONVERSATION HISTORY:
{conv_text if conv_text else "(No previous conversation)"}

DATA QUALITY STATUS:
- Full paper dataset: All papers from Feb 2024 to present (~160K papers)
- Clean author data: {clean_start} to {clean_end} ({clean_pct:.1f}% of papers)
- Clean = authors with verified identity (migrated + fuzzy matched)

IMPORTANT QUERY RULES:

1. For PAPER queries → Query all papers, full dataset available
   - Papers exist for all dates, no restrictions

2. For AUTHOR queries → ONLY query authors with clean data
   - Authors MUST have: canonical_kid IS NOT NULL
   - Papers MUST be dated >= '{clean_start}'
   - This ensures verified author identities only

3. For MIXED queries → Explain limitation naturally
   - "Found papers across all dates, but can verify authorship for {clean_start} onwards"

4. RESPONSE FORMAT:
   - Be conversational and concise (~400-500 chars for SMS)
   - Include specific names, numbers, arxiv IDs when relevant
   - Prioritize last 24 hours when user asks about "today/recent"

NEO4J GRAPH SCHEMA:
- Nodes: Paper (arxiv_id, title, abstract, published_date, featured_in_report)
         Author (kochi_author_id, name, canonical_kid, affiliation)
         Category (name: cs.AI, cs.LG, cs.CV, cs.CL, stat.ML)
- Relationships: AUTHORED (Author → Paper, has position property)
                 IN_CATEGORY (Paper → Category)

TOOLS AVAILABLE:
You have MCP Neo4j tools available. Use them to query the graph.

EXAMPLE QUERIES:

Papers (no restrictions):
```cypher
MATCH (p:Paper)
WHERE p.title CONTAINS 'transformer'
RETURN p.title, p.published_date
ORDER BY p.published_date DESC
LIMIT 10
```

Authors (clean data only):
```cypher
MATCH (a:Author)-[:AUTHORED]->(p:Paper)
WHERE a.canonical_kid IS NOT NULL
  AND p.published_date >= date('{clean_start}')
WITH a.canonical_kid as canonical, collect(DISTINCT a.name)[0] as name, count(DISTINCT p) as papers
RETURN name, papers
ORDER BY papers DESC
LIMIT 10
```

USER QUERY: {user_query}

Task: Answer the user's question by querying Neo4j. Keep response concise for SMS (~500 chars).
"""

    # Configure Claude Agent SDK
    # Uses CLAUDE_CODE_OAUTH_TOKEN from environment
    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",  # Claude Sonnet 4.5
    )

    # Run query - it returns an async iterator of messages
    try:
        response_text = ""

        async for message in query(prompt=prompt, options=options):
            # Collect assistant messages (the agent's responses)
            if hasattr(message, 'role') and message.role == 'assistant':
                # Extract text content from assistant messages
                if hasattr(message, 'content'):
                    for block in message.content:
                        if hasattr(block, 'text'):
                            response_text += block.text

        if not response_text:
            return "Sorry, I couldn't generate a response. Please try again."

        response_text = response_text.strip()

        # Truncate if too long for SMS
        if len(response_text) > 600:
            response_text = response_text[:597] + "..."

        return response_text
    except Exception as e:
        print(f"Agent error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return f"Sorry, I encountered an error: {str(e)[:100]}"


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="KG Query Agent")
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="JSON input with query, conversation_history, todays_report_context, clean_data_boundary"
    )

    args = parser.parse_args()

    try:
        # Parse input
        input_data = json.loads(args.input)
        query_text = input_data.get("query", "")
        conversation_history = input_data.get("conversation_history", [])
        todays_report_context = input_data.get("todays_report_context", "")
        clean_data_boundary = input_data.get("clean_data_boundary", {})

        if not query_text:
            print("Error: No query provided", file=sys.stderr)
            sys.exit(1)

        # Run async query
        response = asyncio.run(run_kg_query(
            query_text,
            conversation_history,
            todays_report_context,
            clean_data_boundary
        ))

        print(response)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
