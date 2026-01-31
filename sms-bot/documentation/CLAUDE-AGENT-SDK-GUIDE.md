Claude Agent SDK - Official Documentation


MORE / CURRENT INFO IS AT https://www.anthropic.com/learn/build-with-claude


## Overview
The Claude Agent SDK is a library that lets you build production AI agents in Python and TypeScript. It provides the same tools, agent loop, and context management that power Claude Code, but programmable. It was renamed from “Claude Code SDK” to “Claude Agent SDK”.

The SDK gives you autonomous agents that can:
Read files
- Run commands
- Search the web
- Edit code
- And more
## Key Features & Capabilities

### Built-in Tools
Your agent can read files, run commands, and search codebases out of the box:

**Read** - Read any file in the working directory
- **Write** - Create new files
- **Edit** - Make precise edits to existing files
- **Bash** - Run terminal commands, scripts, git operations
- **Glob** - Find files by pattern (e.g., **/*.ts, src/**/*.py)
- **Grep** - Search file contents with regex
- **WebSearch** - Search the web for current information
- **WebFetch** - Fetch and parse web page content
- **AskUserQuestion** - Ask users clarifying questions with multiple choice options
### Advanced Capabilities
**Hooks** - Customize agent behavior
- **Subagents** - Delegate tasks to other agents
- **MCP (Model Context Protocol)** - Integration with external tools
- **Permissions** - Control what operations agents can perform
- **Sessions** - Persist agent state across interactions
### Claude Code Features (When setting_sources=[“project”])
**Skills** - Specialized capabilities defined in Markdown (.claude/skills/SKILL.md)
- **Slash Commands** - Custom commands for common tasks (.claude/commands/*.md)
- **Memory** - Project context and instructions (CLAUDE.md or .claude/CLAUDE.md)
- **Plugins** - Extend with custom commands, agents, and MCP servers
## Getting Started

### 1. Install Claude Code
The SDK uses Claude Code as its runtime:

macOS/Linux/WSL:
```bash
Brew install claude-ai/tap/claude-code
```

Or using the install script:
```bash
Curl -fsSL https://claude.ai/install.sh | bash
```

See Claude Code setup for Windows and other options.

### 2. Install the SDK

**Python:**
```bash
Pip install claude-agent-sdk
```

**TypeScript/JavaScript:**
```bash
Npm install @anthropic-ai/claude-agent-sdk```### 3. Set Your API Key```bashexport ANTHROPIC_API_KEY=your-api-key```Get your key from the Claude Console at https://platform.claude.com/The SDK also supports authentication via third-party API providers:
**Amazon Bedrock**: Set CLAUDE_CODE_USE_BEDROCK=1 and configure AWS credentials
- **Google Vertex AI**: Set CLAUDE_CODE_USE_VERTEX=1 and configure Google Cloud credentials
- **Microsoft Foundry**: Set CLAUDE_CODE_USE_FOUNDRY=1 and configure Azure credentials
### 4. Run Your First Agent

**Python Example:**
```python
Import asyncio
From claude_agent_sdk import query, ClaudeAgentOptions

Async def main():
    Async for message in query(
        prompt=”What files are in this directory?”,
        options=ClaudeAgentOptions(allowed_tools=[“Bash”, “Glob”])
    ):
        If hasattr(message, “result”):
            print(message.result)

asyncio.run(main())
```

**Bug-Fixing Agent Example:**
```python
Import asyncio
From claude_agent_sdk import query, ClaudeAgentOptions

Async def main():
    Async for message in query(
        prompt=”Find and fix the bug in auth.py”,
        options=ClaudeAgentOptions(allowed_tools=[“Read”, “Edit”, “Bash”])
    ):
        print(message)
        # Claude reads the file, finds the bug, edits it

asyncio.run(main())
```

## Comparison to Other Claude Tools

### Agent SDK vs Client SDK (Anthropic SDK)
**Client SDK**: Direct API access - you send prompts and implement tool execution yourself
- **Agent SDK**: Claude handles autonomous tool execution - you just provide the prompt and tools
### Agent SDK vs Claude Code CLI
**Claude Code CLI**: Interactive development environment with UI
- **Agent SDK**: Programmatic SDK for building agents as libraries
## Changelog & Resources

**Official Docs**: https://platform.claude.com/docs/en/agent-sdk/overview
- **TypeScript Changelog**: https://github.com/anthropics/claude-agent-sdk-typescript/blob/main/CHANGELOG.md
- **Python Changelog**: https://github.com/anthropics/claude-agent-sdk-python/blob/main/CHANGELOG.md
## Reporting Issues

**TypeScript SDK**: https://github.com/anthropics/claude-agent-sdk-typescript/issues
- **Python SDK**: https://github.com/anthropics/claude-agent-sdk-python/issues
## Branding Guidelines

When referencing Claude in your product:

**Allowed:**
“Claude Agent” (preferred for dropdown menus)
- “Claude” (when within a menu already labeled “Agents”)
- “{YourAgentName} Powered by Claude”
**Not Permitted:**
“Claude Code” or “Claude Code Agent”
- Claude Code-branded ASCII art or visual elements
## License & Terms

Use of the Claude Agent SDK is governed by Anthropic’s Commercial Terms of Service, including when you use it to power products and services for your own customers and end users.
