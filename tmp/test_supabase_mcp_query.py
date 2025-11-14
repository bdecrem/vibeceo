#!/usr/bin/env python3
"""
Quick sanity script to prove the Supabase MCP server is reachable.
It spawns the stdio server via `npx @supabase/mcp-server-supabase`,
lists tools, and runs the `list_tables` tool for the public schema.
"""

import asyncio
import json
import tomllib
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

PROJECT_REF = "tqniseocczttrfwtpbdr"


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

            tools = await session.list_tools()
            tool_names = [tool.name for tool in tools.tools]
            print("Tools:", tool_names)

            result = await session.call_tool(
                "list_tables",
                arguments={"schemas": ["public"]},
            )
            print("list_tables result (first entry):")
            if result.structuredContent:
                print(json.dumps(result.structuredContent[0], indent=2))
            else:
                print(result.content[0].text if result.content else "No data")


if __name__ == "__main__":
    asyncio.run(run())
