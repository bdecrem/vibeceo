#!/usr/bin/env python3
"""
KG Query Agent - Claude Agent SDK with In-Process Neo4j Tools

Uses create_sdk_mcp_server to provide Claude with Neo4j query capabilities.
This enables true agentic behavior - Claude iteratively queries until it finds the answer.

Works on Railway (in-process, no external MCP server needed).
"""

import argparse
import asyncio
import json
import os
import sys
from typing import Dict, List, Any

# Import Claude Agent SDK
try:
    from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
except ImportError as e:
    print(f"Error importing claude-agent-sdk: {e}", file=sys.stderr)
    sys.exit(1)

# Import Neo4j SDK tools (in-process MCP server)
try:
    from neo4j_sdk_tools import neo4j_server
except ImportError as e:
    print(f"Error importing neo4j_sdk_tools: {e}", file=sys.stderr)
    sys.exit(1)


async def run_kg_query(
    user_query: str,
    conversation_history: List[Dict[str, str]],
    todays_report_context: str,
    clean_data_boundary: Dict[str, Any]
) -> str:
    """
    Run KG query using Claude Agent SDK with Neo4j tools.

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

    # Build prompt - no pre-queried data, Claude uses tools to query
    prompt = f"""You are a Neo4j graph database expert helping users explore arXiv AI research papers.

TODAY'S CONTEXT:
{todays_report_context}

CONVERSATION HISTORY:
{conv_text if conv_text else "(No previous conversation)"}

DATA QUALITY STATUS:
- Full paper dataset: All papers from Feb 2024 to present (~160K papers)
- Clean author data: {clean_start} to {clean_end} ({clean_pct:.1f}% of papers)
- Clean = authors with verified identity (migrated + fuzzy matched)

NEO4J GRAPH SCHEMA:
- Nodes: Paper (arxiv_id, title, abstract, published_date, featured_in_report, arxiv_url)
         Author (kochi_author_id, name, canonical_kid, affiliation, h_index, citation_count, last_seen)
         Category (name: cs.AI, cs.LG, cs.CV, cs.CL, stat.ML)
- Relationships: AUTHORED (Author → Paper, has position property)
                 IN_CATEGORY (Paper → Category)

IMPORTANT FORMATTING RULES:

**When mentioning specific papers:**
- ALWAYS query for arxiv_id and arxiv_url
- Format as clickable links: [Paper Title](https://arxiv.org/abs/ARXIV_ID)
- Example: "Recent work includes [Attention Is All You Need](https://arxiv.org/abs/1706.03762)"

**When mentioning authors:**
- Query for: name, affiliation, h_index, citation_count, last_seen
- Format with bold name and details: **Author Name** (Affiliation) - h-index: X, Y citations. Active [date]. [Brief note]
- Example: "**Geoffrey Hinton** (University of Toronto) - h-index: 150, 200K citations. Active Oct 2025. Pioneering AI researcher."
- DO NOT create URLs for authors - just format their names in bold

**Critical:** Papers get clickable arXiv links. Authors get bold names with stats, NO URLs.

TOOLS AVAILABLE:
You have Neo4j tools - USE THEM to answer queries:

1. **mcp__neo4j__execute_cypher** - Execute Cypher queries
   - For PAPER queries: All papers available, no restrictions
   - For AUTHOR queries: Filter to clean data using:
     WHERE a.canonical_kid IS NOT NULL
       AND a.last_seen >= date('{clean_start}')
   - You can run MULTIPLE queries to refine your search

2. **mcp__neo4j__get_schema** - Get detailed database schema

3. **mcp__neo4j__get_data_quality_status** - Get exact clean data boundaries

IMPORTANT QUERY GUIDELINES:

**For "up and coming" / "emerging" authors:**
- Look for h_index between 5-25 (established but not senior)
- Filter by last_seen >= recent date (active recently)
- Consider citation_count for impact
- Check affiliation for location filters

**For location-based queries:**
- Use affiliation CONTAINS 'California', 'Berkeley', 'Stanford', 'UCLA', etc.
- Combine with other criteria (h_index, recent activity)

**Query Strategy:**
1. Start with get_schema to understand available properties
2. Run exploratory query to see data distribution
3. Refine query based on results
4. Iterate until you have the best answer

USER QUERY: {user_query}

Task: Answer the user's question by querying Neo4j iteratively.

**CRITICAL SMS LENGTH LIMIT:**
- Your response MUST stay under 670 UCS-2 code units (10 SMS segments)
- Count using UTF-16 code units, NOT characters (emojis and special chars = 2+ units)
- If content would exceed 670 units, automatically shorten or omit sections
- Prioritize key information over complete details
- Target ~400-500 chars for optimal SMS delivery

Include specific names, numbers, and details within the length constraint.
"""

    # Configure Claude Agent SDK with in-process MCP server
    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",  # Auto-approve tool use (Railway + local)
        mcp_servers={"neo4j": neo4j_server},  # In-process SDK MCP server
        allowed_tools=[
            "mcp__neo4j__execute_cypher",
            "mcp__neo4j__get_schema",
            "mcp__neo4j__get_data_quality_status"
        ],
    )

    debug_enabled = bool(os.getenv("KG_AGENT_DEBUG"))

    def _extract_text_segments(message: Any) -> List[str]:
        """Extract text-like segments from SDK messages."""
        raw_segments: List[str] = []

        # Common direct attributes
        for attr in ("text", "result_text", "result"):
            value = getattr(message, attr, None)
            if isinstance(value, str):
                raw_segments.append(value)

        # Message content can be a string or list of blocks
        content = getattr(message, "content", None)
        if isinstance(content, str):
            raw_segments.append(content)
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict):
                    for key in ("text", "result_text", "result"):
                        text_value = block.get(key)
                        if isinstance(text_value, str):
                            raw_segments.append(text_value)
                else:
                    for attr in ("text", "result_text", "result"):
                        text_value = getattr(block, attr, None)
                        if isinstance(text_value, str):
                            raw_segments.append(text_value)

        # Some messages provide delta payloads
        delta = getattr(message, "delta", None)
        if isinstance(delta, dict):
            for key in ("text", "result_text", "result"):
                delta_value = delta.get(key)
                if isinstance(delta_value, str):
                    raw_segments.append(delta_value)

        # Deduplicate while preserving order
        segments: List[str] = []
        seen: set[str] = set()
        for segment in raw_segments:
            cleaned = segment.strip()
            if not cleaned or cleaned in seen:
                continue
            seen.add(cleaned)
            segments.append(cleaned)
        return segments

    # Run query using ClaudeSDKClient (required for MCP tools)
    try:
        response_text = ""
        last_text_segment = ""
        collected_segments: List[str] = []
        tool_call_count = 0

        async with ClaudeSDKClient(options=options) as client:
            # Send the query
            await client.query(prompt)

            # Receive and process responses
            async for message in client.receive_response():
                message_type = type(message).__name__
                text_segments = _extract_text_segments(message)

                # Count tool calls by checking for ToolUseBlock in content
                content = getattr(message, "content", None)
                if isinstance(content, list):
                    for block in content:
                        block_type = type(block).__name__
                        if block_type == "ToolUseBlock":
                            tool_call_count += 1
                            if debug_enabled:
                                tool_name = getattr(block, "name", "unknown")
                                print(f"[KG Agent Debug] Tool called: {tool_name}", file=sys.stderr)

                if debug_enabled:
                    print(
                        f"[KG Agent Debug] message_type={message_type} segments={len(text_segments)} total_tools={tool_call_count}",
                        file=sys.stderr
                    )

                if not text_segments:
                    continue

                collected_segments.extend(text_segments)
                last_text_segment = text_segments[-1]

        if debug_enabled:
            print(f"[KG Agent Debug] Total tool calls: {tool_call_count}", file=sys.stderr)

        if collected_segments:
            # Prefer the last segment (final response), fallback to joined text
            response_text = last_text_segment or "\n".join(collected_segments)

        if not response_text:
            return "Sorry, I couldn't generate a response. Please try again."

        response_text = response_text.strip()

        # Truncate if too long for SMS
        if len(response_text) > 600:
            response_text = response_text[:597] + "..."

        print(f"[KG Agent] Response generated successfully ({tool_call_count} tool calls)", file=sys.stderr)
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
