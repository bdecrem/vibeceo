# Claude Agent SDK Guide - Python

## Overview

Complete guide for using the Python `claude-agent-sdk` to build autonomous AI agents. Covers setup, authentication, implementation patterns, and critical lessons learned from production use.

---

## Quick Start

### Installation

```bash
# Requires Python 3.10+
python3 -m venv .venv
source .venv/bin/activate
pip install claude-agent-sdk==0.1.6
```

### Authentication

**Use ANTHROPIC_API_KEY (not OAuth tokens):**

```bash
# In .env.local
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE
CLAUDE_AGENT_SDK_TOKEN=sk-ant-api03-YOUR_KEY_HERE  # Same key
```

**Why API key instead of OAuth?**
- OAuth tokens from `claude setup-token` may link to different accounts
- API keys from console.anthropic.com ensure correct account/credits
- Keeps Claude Code on Max plan (don't set tokens in shell)

**Critical**: Only set in .env.local, NOT in ~/.zshrc or shell environment!

### Basic Usage

```python
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

options = ClaudeAgentOptions(
    model="claude-sonnet-4-5-20250929",
    permission_mode="acceptEdits",  # Auto-approve for non-interactive
    allowed_tools=["WebSearch", "Write", "Read"]
)

async with ClaudeSDKClient(options=options) as client:
    await client.query("Your high-level task")

    async for message in client.receive_response():
        # Process messages
        print(message)
```

---

## Critical Lessons Learned

This section documents important patterns and gotchas discovered from production use.

---

## ✅ SDK MCP Tools DO WORK (But Message Parsing is Tricky!)

### The Problem We Hit

When implementing custom MCP tools with `create_sdk_mcp_server()`, we initially got **0 tool calls** despite following the official documentation. The tools appeared configured correctly but Claude never called them.

### The Root Cause

**We were checking for the WRONG message type!**

The SDK returns typed message objects (`AssistantMessage`, `UserMessage`, `SystemMessage`) - not simple objects with a `.type` attribute. Tool use is indicated by `ToolUseBlock` objects within the message content.

### ❌ INCORRECT Pattern (Doesn't Work):

```python
async for message in client.receive_response():
    message_type = getattr(message, "type", "")

    if message_type == "tool_use":  # This is NEVER true!
        tool_call_count += 1
```

**Result**: Reports 0 tool calls even though tools ARE being called.

### ✅ CORRECT Pattern (Works):

```python
async for message in client.receive_response():
    message_type = type(message).__name__  # "AssistantMessage", etc.

    # Check for ToolUseBlock in content
    content = getattr(message, "content", None)
    if isinstance(content, list):
        for block in content:
            if type(block).__name__ == "ToolUseBlock":
                tool_call_count += 1
                tool_name = getattr(block, "name", "unknown")
                print(f"Tool called: {tool_name}")
```

**Result**: Correctly detects all tool calls.

---

## SDK MCP Server Pattern (In-Process Tools)

### When to Use

- Need custom tools (database queries, API calls, etc.)
- Running in non-interactive environment (Railway, Lambda, etc.)
- Want in-process tools (no external MCP server needed)

### Implementation

**1. Define Tools with @tool Decorator:**

```python
from claude_agent_sdk import tool, create_sdk_mcp_server

@tool(
    "execute_query",
    "Execute a database query and return results",
    {"query": str, "params": dict}
)
async def execute_query_tool(args: dict) -> dict:
    """Tool implementation."""
    query = args.get("query", "")
    params = args.get("params", {})

    # Your logic here
    results = your_database.execute(query, params)

    return {
        "content": [{
            "type": "text",
            "text": json.dumps(results, default=str)
        }]
    }

@tool("get_schema", "Get database schema", {})
async def get_schema_tool(args: dict) -> dict:
    """Get schema tool."""
    schema = your_database.get_schema()

    return {
        "content": [{
            "type": "text",
            "text": json.dumps(schema)
        }]
    }
```

**2. Create SDK MCP Server:**

```python
server = create_sdk_mcp_server(
    name="database",
    version="1.0.0",
    tools=[execute_query_tool, get_schema_tool]
)
```

**3. Configure and Use:**

```python
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

options = ClaudeAgentOptions(
    model="claude-sonnet-4-5-20250929",
    permission_mode="acceptEdits",  # Auto-approve (non-interactive)
    mcp_servers={"db": server},
    allowed_tools=[
        "mcp__db__execute_query",
        "mcp__db__get_schema"
    ]
)

async with ClaudeSDKClient(options=options) as client:
    await client.query("Query the database for user data")

    async for message in client.receive_response():
        # Process messages (see correct pattern above)
        pass
```

---

## Tool Naming Convention

**Format:** `mcp__{server_name}__{tool_name}`

**Example:**
- Server name: `"database"`
- Tool name (from @tool): `"execute_query"`
- Allowed tool name: `"mcp__database__execute_query"`

---

## Message Types Reference

### Common Message Types:

- `SystemMessage` - System initialization, includes available tools
- `AssistantMessage` - Claude's responses (text or tool use)
- `UserMessage` - Tool results being returned to Claude
- `ResultMessage` - Final result with usage stats

### Message Content Blocks:

- `TextBlock` - Text content from Claude
- `ToolUseBlock` - Claude calling a tool
- `ToolResultBlock` - Tool execution results

### Example Message Flow:

```
1. SystemMessage(subtype='init')
   - Lists all available tools
   - Shows mcp_servers status

2. AssistantMessage(content=[TextBlock(...)])
   - Claude thinking/planning

3. AssistantMessage(content=[ToolUseBlock(name='mcp__db__execute_query', input={...})])
   - Claude calling tool

4. UserMessage(content=[ToolResultBlock(...)])
   - Tool results returned

5. AssistantMessage(content=[TextBlock(...)])
   - Claude's final response

6. ResultMessage(usage={...})
   - Cost and token stats
```

---

## Debugging Tips

### 1. Enable Debug Logging

```python
async for message in client.receive_response():
    msg_type = type(message).__name__
    print(f"[DEBUG] Message type: {msg_type}")
    print(f"[DEBUG] Message: {message}")
```

### 2. Check Tool Registration

```python
options = ClaudeAgentOptions(
    mcp_servers={"db": server},
    allowed_tools=["mcp__db__execute_query"]
)

print(f"MCP servers: {options.mcp_servers}")
print(f"Allowed tools: {options.allowed_tools}")
```

Look for:
- `{'type': 'sdk', 'name': 'your-server', 'instance': <Server object>}`
- If you see this, tools are configured correctly

### 3. Check SystemMessage Init

The first message includes registered tools:

```python
async for message in client.receive_response():
    if type(message).__name__ == "SystemMessage":
        data = getattr(message, "data", {})
        tools = data.get("tools", [])
        mcp_servers = data.get("mcp_servers", [])

        print(f"Available tools: {tools}")
        print(f"MCP server status: {mcp_servers}")
        break
```

Expected:
- `tools` includes your `mcp__*` tool names
- `mcp_servers` shows `{'name': 'your-server', 'status': 'connected'}`

---

## Permission Modes

### Interactive Mode (Default):
```python
permission_mode="prompt"  # or omit
```
- Prompts user for each tool call
- Only works in interactive CLI environments

### Auto-Approve Mode (Production):
```python
permission_mode="acceptEdits"
```
- Automatically approves all tool calls
- Required for non-interactive environments (Railway, Lambda, etc.)
- Still respects `allowed_tools` list

---

## Common Pitfalls

### ❌ Pitfall 1: Wrong Message Type Check
```python
if message.type == "tool_use":  # Never works!
```

### ❌ Pitfall 2: Forgetting Tool Name Prefix
```python
allowed_tools=["execute_query"]  # Wrong - missing mcp__ prefix
```

### ❌ Pitfall 3: Using query() Instead of ClaudeSDKClient
```python
async for message in query(prompt=prompt, options=options):
    # This works but ClaudeSDKClient is recommended for custom tools
```

### ❌ Pitfall 4: Hardcoding Prompt Instead of Letting Claude Iterate
```python
# Bad: Pre-query and inject data
data = database.query(hardcoded_query)
prompt = f"Here's the data: {data}"

# Good: Let Claude query iteratively
prompt = "Find users in the database"
# Claude will call tools multiple times as needed
```

---

## Working Examples

### Example 1: Neo4j Query Agent
Location: `sms-bot/agents/kg-query/`

Shows:
- SDK MCP server with Neo4j tools
- Iterative querying (15+ tool calls)
- Proper message parsing
- Error handling in tools

### Example 2: Simple Test
Location: `sms-bot/agents/kg-query/test-simple.py`

Minimal example proving tools work:
- Single tool: greet user
- Demonstrates correct message parsing
- Good starting point for testing

---

## SDK Versions Tested

- ✅ **v0.1.6** (latest as of Jan 2025) - Works with correct parsing
- ✅ **v0.1.4** - Works with correct parsing
- Note: Earlier reports of tools not working were due to incorrect message parsing

---

## Resources

- **Official Docs**: https://docs.claude.com/en/api/agent-sdk/
- **GitHub**: https://github.com/anthropics/claude-agent-sdk-python
- **MCP Spec**: https://docs.claude.com/en/api/agent-sdk/mcp

---

## Quick Checklist

When tools aren't being called, check:

- [ ] Tool names use correct format: `mcp__{server}__{tool}`
- [ ] Tools are in `allowed_tools` list
- [ ] Using `ClaudeSDKClient` not just `query()`
- [ ] Message parsing checks for `ToolUseBlock` in content
- [ ] `permission_mode="acceptEdits"` for non-interactive
- [ ] Tool functions return correct format (content array)
- [ ] SystemMessage shows tools registered and server connected

---

## Summary

**The key insight**: SDK MCP tools work perfectly, but you must parse messages correctly. Always check for `ToolUseBlock` objects in message content, not a `.type` attribute on the message itself.

This pattern enables true agentic behavior where Claude iteratively calls tools until it solves the problem.
