#!/usr/bin/env python3
"""
Runs an MCP `execute_sql` call via the Supabase MCP server to fetch the most
recent subscribers from the sms_subscribers table.
"""

import asyncio
import json
import tomllib
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

PROJECT_REF = "tqniseocczttrfwtpbdr"
QUERY = """
select phone_number, slug, created_at
from public.sms_subscribers
order by created_at desc
limit 10;
""".strip()


def load_supabase_token() -> str:
    config_path = Path.home() / ".codex" / "config.toml"
    data = tomllib.loads(config_path.read_text())
    return data["mcp_servers"]["supabase"]["env"]["SUPABASE_ACCESS_TOKEN"]


async def run():
    token = load_supabase_token()
    server_params = StdioServerParameters(
        command="npx",
        args=[
            "-y",
            "@supabase/mcp-server-supabase",
            "--project-ref",
            PROJECT_REF,
            "--read-only",
        ],
        env={"SUPABASE_ACCESS_TOKEN": token},
    )

    async with stdio_client(server_params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            result = await session.call_tool(
                "execute_sql",
                arguments={"query": QUERY},
            )

            if result.structuredContent:
                print(json.dumps(result.structuredContent, indent=2))
            else:
                print(result.content[0].text if result.content else "No data")


if __name__ == "__main__":
    asyncio.run(run())
