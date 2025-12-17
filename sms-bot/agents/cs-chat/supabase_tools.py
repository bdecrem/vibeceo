#!/usr/bin/env python3
"""
Supabase SDK Tools for CS Chat Agent

Wraps Supabase client as in-process MCP server using create_sdk_mcp_server.
Follows the same pattern as kg-query/neo4j_sdk_tools.py.
"""

import json
import os
import sys
from typing import Any, Dict, List

from claude_agent_sdk import create_sdk_mcp_server, tool
from supabase import create_client, Client

# Supabase configuration - get at module load time
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")


class SupabaseTools:
    """Supabase query tools for CS content."""

    def __init__(self):
        # Debug: print env var status
        print(f"[SupabaseTools] SUPABASE_URL: {'SET ('+SUPABASE_URL[:30]+'...)' if SUPABASE_URL else 'MISSING'}", file=sys.stderr)
        print(f"[SupabaseTools] SUPABASE_SERVICE_KEY: {'SET ('+SUPABASE_SERVICE_KEY[:20]+'...)' if SUPABASE_SERVICE_KEY else 'MISSING'}", file=sys.stderr)

        if not all([SUPABASE_URL, SUPABASE_SERVICE_KEY]):
            missing = []
            if not SUPABASE_URL:
                missing.append("SUPABASE_URL")
            if not SUPABASE_SERVICE_KEY:
                missing.append("SUPABASE_SERVICE_KEY")
            raise ValueError(f"Missing environment variables: {', '.join(missing)}")

        try:
            self.client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
            print(f"[SupabaseTools] Client created successfully", file=sys.stderr)
        except Exception as e:
            print(f"[SupabaseTools] Failed to create client: {e}", file=sys.stderr)
            raise

    def get_all_links(self) -> List[Dict[str, Any]]:
        """Get all links with content summaries."""
        try:
            print(f"[SupabaseTools] Querying cs_content table...", file=sys.stderr)
            result = self.client.table("cs_content").select(
                "id, url, domain, posted_by_name, notes, posted_at, content_summary"
            ).not_.is_("content_fetched_at", "null").order(
                "posted_at", desc=True
            ).limit(50).execute()
            print(f"[SupabaseTools] Query returned {len(result.data)} rows", file=sys.stderr)
            return result.data
        except Exception as e:
            print(f"[SupabaseTools] Query error: {type(e).__name__}: {e}", file=sys.stderr)
            raise

    def search_links(self, keyword: str) -> List[Dict[str, Any]]:
        """Search links by keyword in content."""
        result = self.client.table("cs_content").select(
            "id, url, domain, posted_by_name, notes, posted_at, content_summary, content_text"
        ).or_(
            f"content_text.ilike.%{keyword}%,content_summary.ilike.%{keyword}%,notes.ilike.%{keyword}%"
        ).not_.is_("content_fetched_at", "null").order(
            "posted_at", desc=True
        ).limit(20).execute()
        return result.data


@tool(
    "get_all_links",
    "Get all links with their summaries - use this for broad questions about themes or patterns",
    {}
)
async def get_all_links_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """Get all links with content summaries."""
    try:
        tools = SupabaseTools()
        data = tools.get_all_links()
        return {
            "content": [{
                "type": "text",
                "text": json.dumps(data, indent=2, default=str)
            }]
        }
    except Exception as e:
        print(f"[supabase_tools] get_all_links error: {e}", file=sys.stderr)
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
    """Search links by keyword."""
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
        tools = SupabaseTools()
        data = tools.search_links(keyword)
        return {
            "content": [{
                "type": "text",
                "text": json.dumps(data, indent=2, default=str)
            }]
        }
    except Exception as e:
        print(f"[supabase_tools] search_links error: {e}", file=sys.stderr)
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"error": str(e)}, indent=2)
            }],
            "isError": True
        }


@tool(
    "get_schema",
    "Get the cs_content table schema - columns and their types",
    {}
)
async def get_schema_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """Get cs_content table schema."""
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
            "Use get_all_links for broad questions about themes",
            "Use search_links with a keyword for specific topic searches"
        ]
    }

    return {
        "content": [{
            "type": "text",
            "text": json.dumps(schema, indent=2)
        }]
    }


# Create SDK MCP server (in-process, works on Railway)
supabase_server = create_sdk_mcp_server(
    name="supabase",
    version="1.0.0",
    tools=[
        get_all_links_tool,
        search_links_tool,
        get_schema_tool
    ]
)


def main():
    """CLI interface for testing."""
    import argparse

    parser = argparse.ArgumentParser(description="Supabase Tools CLI")
    parser.add_argument("--test", action="store_true", help="Run test queries")

    args = parser.parse_args()

    if args.test:
        print("=== Testing SupabaseTools ===")
        print(f"SUPABASE_URL: {'SET' if SUPABASE_URL else 'MISSING'}")
        print(f"SUPABASE_SERVICE_KEY: {'SET' if SUPABASE_SERVICE_KEY else 'MISSING'}")

        try:
            tools = SupabaseTools()
            print("Client created successfully!")

            links = tools.get_all_links()
            print(f"Found {len(links)} links")
            for link in links[:3]:
                print(f"  - {link.get('domain')}: {link.get('url')[:50]}...")
        except Exception as e:
            print(f"Error: {e}")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
