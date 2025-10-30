#!/usr/bin/env python3
"""
KG Query Agent - Claude Agent SDK Implementation

Uses claude_agent_sdk.query() with custom MCP server for Neo4j graph queries.
Works on Railway and local environments - no external MCP infrastructure needed.
"""

import argparse
import asyncio
import json
import os
import subprocess
import sys
import textwrap
from pathlib import Path
from typing import Dict, List, Any, Tuple

# Import Claude Agent SDK
try:
    from claude_agent_sdk import ClaudeAgentOptions, query
    from claude_agent_sdk.types import McpStdioServerConfig
except ImportError as e:
    print(f"Error importing claude-agent-sdk: {e}", file=sys.stderr)
    sys.exit(1)


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
You have Neo4j MCP tools - USE THEM to answer the query:
- neo4j__get_neo4j_schema: Get database schema
- neo4j__read_neo4j_cypher: Execute Cypher queries

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

    # Configure Claude Agent SDK with custom MCP server
    # This approach works on Railway and local - no external MCP infrastructure needed
    #
    # We define a custom MCP server that exposes Neo4j tools via stdio protocol
    # The SDK launches this server and communicates with it automatically
    current_dir = Path(__file__).parent
    mcp_server_script = current_dir / "neo4j_mcp_server.py"

    # Configure MCP server
    python_bin = os.getenv("PYTHON_BIN", "python3")

    server_env = dict(os.environ)
    server_env.update({
        "NEO4J_URI": os.getenv("NEO4J_URI", ""),
        "NEO4J_USERNAME": os.getenv("NEO4J_USERNAME", ""),
        "NEO4J_PASSWORD": os.getenv("NEO4J_PASSWORD", ""),
        "NEO4J_DATABASE": os.getenv("NEO4J_DATABASE", "neo4j"),
    })

    mcp_servers = {
        "neo4j": McpStdioServerConfig(
            command=python_bin,
            args=[str(mcp_server_script)],
            env=server_env,
        )
    }

    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",  # Works in non-interactive mode (Railway + local)
        mcp_servers=mcp_servers,
        allowed_tools=[
            "neo4j__read_neo4j_cypher",
            "neo4j__get_neo4j_schema",
        ],
    )

    debug_enabled = bool(os.getenv("KG_AGENT_DEBUG"))

    def _debug(msg: str) -> None:
        if debug_enabled:
            print(f"[KG Agent Debug] {msg}", file=sys.stderr)

    def _read_mcp_message(stream) -> Dict[str, Any]:
        headers: Dict[str, str] = {}
        while True:
            line = stream.readline()
            if not line:
                return {}
            if line in (b"\n", b"\r\n"):
                break
            decoded = line.decode("utf-8").strip()
            if not decoded or ":" not in decoded:
                continue
            key, value = decoded.split(":", 1)
            headers[key.strip().lower()] = value.strip()
        length = int(headers.get("content-length", "0"))
        if length <= 0:
            return {}
        payload = stream.read(length)
        if not payload:
            return {}
        return json.loads(payload.decode("utf-8"))

    def _write_mcp_message(stream, message: Dict[str, Any]) -> None:
        body = json.dumps(message).encode("utf-8")
        header = f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8")
        stream.write(header)
        stream.write(body)
        stream.flush()

    def _verify_mcp_server() -> Tuple[bool, str]:
        """
        Launch MCP server once to verify it starts and advertises expected tools.
        Returns (ok, error_message).
        """
        try:
            proc = subprocess.Popen(
                [python_bin, str(mcp_server_script)],
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=server_env,
            )
        except Exception as exc:  # noqa: BLE001
            return False, f"Failed to launch MCP server: {exc}"

        try:
            if proc.stdin is None or proc.stdout is None:
                return False, "MCP server process streams not available"

            init_payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "clientInfo": {"name": "kg-agent-preflight", "version": "0.1.0"},
                    "protocolVersion": "2024-11-05",
                },
            }
            _write_mcp_message(proc.stdin, init_payload)
            init_response = _read_mcp_message(proc.stdout)

            if not init_response or init_response.get("error"):
                return False, f"Initialize failed: {init_response}"

            _write_mcp_message(
                proc.stdin,
                {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
            )
            list_response = _read_mcp_message(proc.stdout)
            tools = (list_response or {}).get("result", {}).get("tools", [])
            tool_names = [tool.get("name") for tool in tools]

            if "read_neo4j_cypher" not in tool_names or "get_neo4j_schema" not in tool_names:
                return False, f"Unexpected tool list: {tool_names}"

            # Graceful shutdown
            _write_mcp_message(
                proc.stdin,
                {"jsonrpc": "2.0", "id": 3, "method": "shutdown", "params": {}},
            )
            _read_mcp_message(proc.stdout)
            return True, ""
        except Exception as exc:  # noqa: BLE001
            stderr_output = ""
            try:
                if proc.stderr:
                    proc.poll()
                    stderr_output = proc.stderr.read().decode("utf-8", errors="ignore")
            except Exception:
                stderr_output = ""
            message = f"Preflight error: {exc}"
            if stderr_output:
                message += f" | stderr: {stderr_output.strip()}"
            return False, message
        finally:
            try:
                if proc.stdin:
                    proc.stdin.close()
                if proc.stdout:
                    proc.stdout.close()
                if proc.stderr:
                    proc.stderr.close()
            finally:
                proc.terminate()
                try:
                    proc.wait(timeout=1)
                except Exception:
                    proc.kill()

    ok, preflight_error = _verify_mcp_server()
    if not ok:
        error_text = textwrap.dedent(f"""
            Neo4j MCP server preflight failed.
            Script: {mcp_server_script}
            Error: {preflight_error}
        """).strip()
        _debug(error_text)
        return (
            "Sorry, I couldn't contact the Neo4j graph service just now. "
            "Please check the KG logs for the MCP server error."
        )

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

    # Run query - it returns an async iterator of messages
    try:
        response_text = ""
        last_text_segment = ""
        collected_segments: List[str] = []

        async for message in query(prompt=prompt, options=options):
            message_type = getattr(message, "type", "")
            text_segments = _extract_text_segments(message)

            if debug_enabled:
                print(
                    f"[KG Agent Debug] message_type={message_type} segments={len(text_segments)}",
                    file=sys.stderr
                )

            if not text_segments:
                continue

            collected_segments.extend(text_segments)
            last_text_segment = text_segments[-1]

        if collected_segments:
            # Prefer the last segment (final response), fallback to joined text
            response_text = last_text_segment or "\n".join(collected_segments)

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
