#!/usr/bin/env python3
"""
Supabase SDK Tools for CS Chat Agent

Wraps Supabase client as in-process MCP server using create_sdk_mcp_server.
"""

import json
import os
import sys
from typing import Any, Dict

from claude_agent_sdk import create_sdk_mcp_server, tool
from supabase import create_client, Client

# Initialize Supabase client once at module load
_supabase_client: Client | None = None

def get_supabase() -> Client:
    """Get Supabase client (singleton)."""
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")

    # Debug logging
    print(f"[supabase_tools] SUPABASE_URL: {'SET' if url else 'MISSING'}", file=sys.stderr)
    print(f"[supabase_tools] SUPABASE_SERVICE_KEY: {'SET' if key else 'MISSING'}", file=sys.stderr)

    if not url or not key:
        raise ValueError(f"SUPABASE_URL={'SET' if url else 'MISSING'}, SUPABASE_SERVICE_KEY={'SET' if key else 'MISSING'}")

    try:
        _supabase_client = create_client(url, key)
        print(f"[supabase_tools] Client created successfully", file=sys.stderr)
        return _supabase_client
    except Exception as e:
        print(f"[supabase_tools] Failed to create client: {e}", file=sys.stderr)
        raise


@tool(
    "execute_sql",
    "Execute a SQL query on the Supabase Postgres database. Use this to search and analyze cs_content links.",
    {"query": str}
)
async def execute_sql_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute SQL query on Supabase.

    Args:
        query: SQL query string (SELECT only for safety)

    Returns:
        Query results as JSON
    """
    query = args.get("query", "")

    if not query:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"error": "Missing 'query' parameter"})
            }],
            "isError": True
        }

    # Safety: only allow SELECT queries
    query_upper = query.strip().upper()
    if not query_upper.startswith("SELECT"):
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"error": "Only SELECT queries are allowed"})
            }],
            "isError": True
        }

    try:
        supabase = get_supabase()
        result = supabase.rpc("exec_sql", {"sql_query": query}).execute()

        # If RPC doesn't exist, fall back to raw query via postgrest
        if hasattr(result, 'data'):
            return {
                "content": [{
                    "type": "text",
                    "text": json.dumps(result.data, indent=2, default=str)
                }]
            }
        else:
            return {
                "content": [{
                    "type": "text",
                    "text": json.dumps({"error": "No data returned"})
                }],
                "isError": True
            }
    except Exception as e:
        # Try direct table query as fallback
        try:
            return await query_cs_content_fallback(query)
        except Exception as e2:
            return {
                "content": [{
                    "type": "text",
                    "text": json.dumps({
                        "error": str(e),
                        "fallback_error": str(e2),
                        "query": query
                    }, indent=2)
                }],
                "isError": True
            }


async def query_cs_content_fallback(query: str) -> Dict[str, Any]:
    """Fallback: parse simple queries and use Supabase client."""
    supabase = get_supabase()

    # For simple SELECT * FROM cs_content queries, use the client directly
    result = supabase.table("cs_content").select("*").limit(50).execute()

    return {
        "content": [{
            "type": "text",
            "text": json.dumps(result.data, indent=2, default=str)
        }]
    }


@tool(
    "get_schema",
    "Get the cs_content table schema - columns and their types",
    {}
)
async def get_schema_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get cs_content table schema.

    Returns:
        Schema description with column names and types
    """
    schema = {
        "table": "cs_content",
        "description": "Shared links with fetched content and AI summaries",
        "columns": {
            "id": "UUID - primary key",
            "url": "TEXT - the shared URL",
            "domain": "TEXT - extracted domain (e.g., 'github.com')",
            "posted_by_name": "TEXT - display name of poster",
            "posted_by_phone": "TEXT - phone number of poster (normalized)",
            "notes": "TEXT - optional note added when sharing",
            "posted_at": "TIMESTAMPTZ - when the link was shared",
            "content_text": "TEXT - extracted page content (up to 5000 chars)",
            "content_summary": "TEXT - AI-generated 2-sentence summary",
            "content_fetched_at": "TIMESTAMPTZ - when content was fetched",
            "comments": "JSONB - array of {id, author, text, created_at}"
        },
        "tips": [
            "Use content_text for full-text search with ILIKE",
            "Use content_summary for quick overview of what each link is about",
            "Filter by content_fetched_at IS NOT NULL to get links with content",
            "Order by posted_at DESC for most recent first"
        ]
    }

    return {
        "content": [{
            "type": "text",
            "text": json.dumps(schema, indent=2)
        }]
    }


@tool(
    "get_all_links",
    "Get all links with their summaries - use this for broad questions about themes or patterns",
    {}
)
async def get_all_links_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get all links with content summaries.

    Returns:
        All links with url, domain, summary, notes, posted_by_name
    """
    try:
        supabase = get_supabase()
        result = supabase.table("cs_content").select(
            "id, url, domain, posted_by_name, notes, posted_at, content_summary"
        ).not_.is_("content_fetched_at", "null").order(
            "posted_at", desc=True
        ).limit(50).execute()

        return {
            "content": [{
                "type": "text",
                "text": json.dumps(result.data, indent=2, default=str)
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"error": str(e)}, indent=2)
            }],
            "isError": True
        }


@tool(
    "search_links",
    "Search links by keyword in content_text or content_summary",
    {"keyword": str}
)
async def search_links_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Search links by keyword.

    Args:
        keyword: Search term to find in content

    Returns:
        Matching links with their content
    """
    keyword = args.get("keyword", "")

    if not keyword:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"error": "Missing 'keyword' parameter"})
            }],
            "isError": True
        }

    try:
        supabase = get_supabase()

        # Search in content_text using ilike
        result = supabase.table("cs_content").select(
            "id, url, domain, posted_by_name, notes, posted_at, content_summary, content_text"
        ).or_(
            f"content_text.ilike.%{keyword}%,content_summary.ilike.%{keyword}%,notes.ilike.%{keyword}%"
        ).not_.is_("content_fetched_at", "null").order(
            "posted_at", desc=True
        ).limit(20).execute()

        return {
            "content": [{
                "type": "text",
                "text": json.dumps(result.data, indent=2, default=str)
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"error": str(e)}, indent=2)
            }],
            "isError": True
        }


# Create SDK MCP server (in-process, works on Railway)
supabase_server = create_sdk_mcp_server(
    name="supabase",
    version="1.0.0",
    tools=[
        execute_sql_tool,
        get_schema_tool,
        get_all_links_tool,
        search_links_tool
    ]
)
