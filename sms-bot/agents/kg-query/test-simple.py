#!/usr/bin/env python3
"""
Test with EXACT pattern from official Anthropic docs
https://github.com/anthropics/claude-agent-sdk-python/blob/main/README.md
"""

import asyncio
from claude_agent_sdk import tool, create_sdk_mcp_server, ClaudeAgentOptions, ClaudeSDKClient

# Define a tool using the @tool decorator (from official example)
@tool("greet", "Greet a user", {"name": str})
async def greet_user(args):
    print(f"[TEST] Tool called! Args: {args}")
    return {
        "content": [
            {"type": "text", "text": f"Hello, {args['name']}!"}
        ]
    }

# Create an SDK MCP server
server = create_sdk_mcp_server(
    name="my-tools",
    version="1.0.0",
    tools=[greet_user]
)

async def main():
    # Use it with Claude
    options = ClaudeAgentOptions(
        mcp_servers={"tools": server},
        allowed_tools=["mcp__tools__greet"],
        permission_mode="acceptEdits"
    )

    print("Configuration:")
    print(f"  MCP servers: {options.mcp_servers}")
    print(f"  Allowed tools: {options.allowed_tools}")
    print()

    tool_call_count = 0

    async with ClaudeSDKClient(options=options) as client:
        await client.query("Greet Alice")

        # Extract and print response
        async for msg in client.receive_response():
            msg_type = getattr(msg, "type", "")
            print(f"[DEBUG] Message type: '{msg_type}' | Message: {msg}")

            if msg_type == "tool_use":
                tool_call_count += 1
                print(f"[TEST] Tool use detected! Count: {tool_call_count}")

            # Try to get text content
            content = getattr(msg, "content", None)
            if isinstance(content, str):
                print(f"Response: {content}")
            elif isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and block.get("type") == "text":
                        print(f"Response: {block.get('text')}")

    print(f"\nFinal tool call count: {tool_call_count}")
    if tool_call_count == 0:
        print("❌ FAILED - No tools called (bug persists)")
    else:
        print("✅ SUCCESS - Tools working!")

if __name__ == "__main__":
    asyncio.run(main())
