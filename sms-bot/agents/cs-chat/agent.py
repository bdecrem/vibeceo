#!/usr/bin/env python3
"""
CS Chat Agent - Agentic Search for Shared Links

Uses Claude Agent SDK with Supabase MCP tools to answer questions
about the CS (Content Sharing) link repository.

True agentic behavior - Claude decides what queries to run and
iterates until it has enough information to answer.
"""

import argparse
import asyncio
import json
import os
import sys
from typing import Any, Dict, List

# Load environment
from dotenv import load_dotenv
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))

# Import Claude Agent SDK
try:
    from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
except ImportError as e:
    print(f"Error importing claude-agent-sdk: {e}", file=sys.stderr)
    sys.exit(1)

# Import Supabase SDK tools (in-process MCP server)
try:
    from supabase_tools import supabase_server
except ImportError as e:
    print(f"Error importing supabase_tools: {e}", file=sys.stderr)
    sys.exit(1)


async def run_cs_chat(user_question: str) -> str:
    """
    Run CS chat query using Claude Agent SDK with Supabase tools.

    Args:
        user_question: User's natural language question

    Returns:
        Natural language response
    """
    prompt = f"""You are a helpful assistant answering questions about a collection of shared links stored in a database.

DATABASE SCHEMA:
The cs_content table contains shared links with:
- url: The shared URL
- domain: Extracted domain (e.g., 'github.com')
- posted_by_name: Who shared it
- notes: Optional comment from the sharer
- posted_at: When it was shared
- content_text: Extracted page content (up to 5000 chars)
- content_summary: AI-generated 2-sentence summary
- comments: JSON array of user comments

TOOLS AVAILABLE:
1. **mcp__supabase__get_all_links** - Get all links with summaries (best for broad questions)
2. **mcp__supabase__search_links** - Search by keyword in content
3. **mcp__supabase__get_schema** - See full schema details
4. **mcp__supabase__execute_sql** - Run custom SQL queries (SELECT only)

STRATEGY:
- For broad questions ("any themes?", "summarize everything") → use get_all_links
- For specific questions ("articles about AI") → use search_links with keywords
- For complex queries → use execute_sql with custom SQL

USER QUESTION: {user_question}

Instructions:
1. Use the tools to find relevant information
2. You can make multiple queries if needed
3. Answer concisely (2-4 sentences)
4. Cite sources by their domain or URL
5. If nothing relevant is found, say so honestly

Answer the question:"""

    # Configure Claude Agent SDK with in-process MCP server
    options = ClaudeAgentOptions(
        model="claude-sonnet-4-20250514",
        permission_mode="acceptEdits",  # Auto-approve tool use
        mcp_servers={"supabase": supabase_server},
        allowed_tools=[
            "mcp__supabase__execute_sql",
            "mcp__supabase__get_schema",
            "mcp__supabase__get_all_links",
            "mcp__supabase__search_links"
        ],
    )

    debug_enabled = bool(os.getenv("CS_CHAT_DEBUG"))

    def _extract_text_segments(message: Any) -> List[str]:
        """Extract text-like segments from SDK messages."""
        raw_segments: List[str] = []

        for attr in ("text", "result_text", "result"):
            value = getattr(message, attr, None)
            if isinstance(value, str):
                raw_segments.append(value)

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

        delta = getattr(message, "delta", None)
        if isinstance(delta, dict):
            for key in ("text", "result_text", "result"):
                delta_value = delta.get(key)
                if isinstance(delta_value, str):
                    raw_segments.append(delta_value)

        # Deduplicate while preserving order
        segments: List[str] = []
        seen: set = set()
        for segment in raw_segments:
            cleaned = segment.strip()
            if not cleaned or cleaned in seen:
                continue
            seen.add(cleaned)
            segments.append(cleaned)
        return segments

    try:
        response_text = ""
        last_text_segment = ""
        collected_segments: List[str] = []
        tool_call_count = 0

        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)

            async for message in client.receive_response():
                message_type = type(message).__name__
                text_segments = _extract_text_segments(message)

                # Count tool calls
                content = getattr(message, "content", None)
                if isinstance(content, list):
                    for block in content:
                        block_type = type(block).__name__
                        if block_type == "ToolUseBlock":
                            tool_call_count += 1
                            if debug_enabled:
                                tool_name = getattr(block, "name", "unknown")
                                print(f"[CS Chat Debug] Tool called: {tool_name}", file=sys.stderr)

                if debug_enabled:
                    print(
                        f"[CS Chat Debug] message_type={message_type} segments={len(text_segments)} total_tools={tool_call_count}",
                        file=sys.stderr
                    )

                if not text_segments:
                    continue

                collected_segments.extend(text_segments)
                last_text_segment = text_segments[-1]

        if debug_enabled:
            print(f"[CS Chat Debug] Total tool calls: {tool_call_count}", file=sys.stderr)

        if collected_segments:
            response_text = last_text_segment or "\n".join(collected_segments)

        if not response_text:
            return "Sorry, I couldn't generate a response. Please try again."

        response_text = response_text.strip()

        print(f"[CS Chat] Response generated ({tool_call_count} tool calls)", file=sys.stderr)
        return response_text

    except Exception as e:
        print(f"[CS Chat] Agent error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return f"Sorry, I encountered an error: {str(e)[:100]}"


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="CS Chat Agent")
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="JSON input with 'question' field"
    )

    args = parser.parse_args()

    try:
        input_data = json.loads(args.input)
        question = input_data.get("question", "")

        if not question:
            print("Error: No question provided", file=sys.stderr)
            sys.exit(1)

        response = asyncio.run(run_cs_chat(question))
        print(response)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
