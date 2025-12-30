#!/usr/bin/env python3
"""
Code Agent - Autonomous Codebase Investigation

Uses Claude Agent SDK with file/git tools for deep code analysis.
Supports investigation queries and PR creation with approval flow.
"""

import argparse
import asyncio
import json
import os
import sys
from typing import Any, Dict, List

# Import Claude Agent SDK
try:
    from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
except ImportError as e:
    print(f"Error importing claude-agent-sdk: {e}", file=sys.stderr)
    sys.exit(1)

# Import code tools (in-process MCP server)
try:
    from code_sdk_tools import code_server
except ImportError as e:
    print(f"Error importing code_sdk_tools: {e}", file=sys.stderr)
    sys.exit(1)


def load_claude_md(codebase_path: str) -> str:
    """Load CLAUDE.md from codebase root for context."""
    claude_md_path = os.path.join(codebase_path, "CLAUDE.md")
    try:
        with open(claude_md_path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return "(No CLAUDE.md found in codebase root)"


def format_history(history: List[Dict[str, str]]) -> str:
    """Format conversation history for context."""
    if not history:
        return "(First investigation)"

    lines = []
    for msg in history[-5:]:  # Last 5 exchanges
        role = msg.get("role", "unknown").upper()
        content = msg.get("content", "")
        # Truncate long messages
        if len(content) > 500:
            content = content[:500] + "..."
        lines.append(f"{role}: {content}")

    return "\n".join(lines)


def extract_text_segments(message: Any) -> List[str]:
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
    seen: set = set()
    for segment in raw_segments:
        cleaned = segment.strip()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        segments.append(cleaned)

    return segments


async def run_investigation(
    question: str,
    codebase_path: str,
    conversation_history: List[Dict[str, str]],
    mode: str = "investigate"
) -> Dict[str, Any]:
    """
    Run code investigation using Claude Agent SDK.

    Args:
        question: User's question or PR description
        codebase_path: Root path of the codebase
        conversation_history: Previous Q&A for follow-ups
        mode: "investigate" for questions, "pr" for PR creation

    Returns:
        Dict with 'response', 'summary', 'files_examined', 'tool_calls_count'
    """
    debug_enabled = bool(os.getenv("CODE_AGENT_DEBUG"))
    claude_md = load_claude_md(codebase_path)
    history_text = format_history(conversation_history)

    if mode == "pr":
        task_instruction = f"""
USER REQUEST: Create a PR for: {question}

YOUR TASK:
1. Investigate the codebase to understand what needs to be changed
2. Identify all files that need modification
3. Plan the changes carefully
4. Create a detailed plan including:
   - Branch name to create
   - Files to modify/create
   - Summary of changes
   - Commit message

DO NOT execute the PR yet. Return a plan for user approval.
Format your response as:

## PR Plan

**Branch:** feature/your-branch-name
**Changes:**
- file1.ts: Description of changes
- file2.ts: Description of changes

**Commit Message:** Your commit message here

**Summary:** Brief description of what this PR does

Reply with this plan. The user will say YES to execute.
"""
    else:
        task_instruction = f"""
USER QUESTION: {question}

YOUR TASK:
1. Use the available tools to thoroughly investigate the codebase
2. Read relevant files, search for patterns, check git history if helpful
3. Build a comprehensive understanding
4. Provide a detailed answer with specific file references (use file:line format)

Be thorough but focused. Include specific code snippets when relevant.

IMPORTANT: End your response with a line starting with "TL;DR:" followed by a 1-2 sentence summary (under 200 characters) that captures the key answer. This summary will be sent via SMS.
"""

    prompt = f"""You are a code investigation agent for the vibeceo codebase.

CODEBASE ROOT: {codebase_path}

## Codebase Instructions (CLAUDE.md)
{claude_md[:8000]}  # Truncate if very long

## Previous Investigation Context
{history_text}

## Available Tools
- read_file: Read file contents (path relative to codebase root)
- search_code: Search for patterns (supports regex, file_pattern filter)
- list_directory: List files (recursive option available)
- git_status: Current git status
- git_log: Recent commits
- git_diff: Show changes
- git_show: Show commit details

For PR creation, you also have:
- write_file: Write content to a file
- create_branch: Create and checkout new branch
- stage_files: Stage files for commit
- commit: Create a commit
- push: Push to remote
- create_pr: Create GitHub PR

{task_instruction}

Keep your response concise but complete. Reference specific files with file:line format.
"""

    # Configure Claude Agent SDK
    allowed_tools = [
        "mcp__code__read_file",
        "mcp__code__search_code",
        "mcp__code__list_directory",
        "mcp__code__git_status",
        "mcp__code__git_log",
        "mcp__code__git_diff",
        "mcp__code__git_show",
    ]

    # Add write tools for PR mode
    if mode == "pr":
        allowed_tools.extend([
            "mcp__code__write_file",
            "mcp__code__create_branch",
            "mcp__code__stage_files",
            "mcp__code__commit",
            "mcp__code__push",
            "mcp__code__create_pr",
        ])

    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",
        mcp_servers={"code": code_server},
        allowed_tools=allowed_tools,
    )

    files_examined = set()
    tool_call_count = 0
    response_text = ""
    collected_segments: List[str] = []

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)

            async for message in client.receive_response():
                message_type = type(message).__name__

                # Track tool calls
                content = getattr(message, "content", None)
                if isinstance(content, list):
                    for block in content:
                        if type(block).__name__ == "ToolUseBlock":
                            tool_call_count += 1
                            # Track files examined
                            tool_input = getattr(block, "input", {})
                            if isinstance(tool_input, dict):
                                path = tool_input.get("path")
                                if path:
                                    files_examined.add(path)

                            if debug_enabled:
                                tool_name = getattr(block, "name", "unknown")
                                print(f"[Code Agent] Tool: {tool_name}", file=sys.stderr)

                # Collect text response
                text_segments = extract_text_segments(message)
                if text_segments:
                    collected_segments.extend(text_segments)

                if debug_enabled:
                    print(f"[Code Agent] {message_type}: {len(text_segments)} segments", file=sys.stderr)

        # Use last segment as response (final answer)
        if collected_segments:
            response_text = collected_segments[-1]

        if not response_text:
            response_text = "Investigation completed but no response generated."

        # Generate summary for voice mode (first 200 chars)
        summary = response_text[:200].split("\n")[0]
        if len(response_text) > 200:
            summary += "..."

        print(f"[Code Agent] Done: {tool_call_count} tool calls, {len(files_examined)} files", file=sys.stderr)

        return {
            "response": response_text.strip(),
            "summary": summary,
            "files_examined": list(files_examined),
            "tool_calls_count": tool_call_count,
        }

    except Exception as e:
        print(f"[Code Agent] Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            "response": f"Investigation error: {str(e)[:200]}",
            "summary": f"Error: {str(e)[:100]}",
            "files_examined": [],
            "tool_calls_count": 0,
        }


async def execute_pr(
    plan: str,
    codebase_path: str
) -> Dict[str, Any]:
    """
    Execute a PR plan that was previously approved.

    Args:
        plan: The approved PR plan from investigation
        codebase_path: Root path of the codebase

    Returns:
        Dict with 'response', 'pr_url'
    """
    prompt = f"""You previously created this PR plan that was approved:

{plan}

Now execute the plan:
1. Create the branch
2. Make the file changes
3. Stage and commit
4. Push to remote
5. Create the PR

Use the write_file tool to make changes, then create_branch, stage_files, commit, push, and create_pr.

Return the PR URL when done.
"""

    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",
        mcp_servers={"code": code_server},
        allowed_tools=[
            "mcp__code__read_file",
            "mcp__code__write_file",
            "mcp__code__create_branch",
            "mcp__code__stage_files",
            "mcp__code__commit",
            "mcp__code__push",
            "mcp__code__create_pr",
        ],
    )

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)

            response_text = ""
            collected_segments: List[str] = []

            async for message in client.receive_response():
                text_segments = extract_text_segments(message)
                if text_segments:
                    collected_segments.extend(text_segments)

            if collected_segments:
                response_text = collected_segments[-1]

            # Try to extract PR URL from response
            pr_url = None
            for line in response_text.split("\n"):
                if "github.com" in line and "/pull/" in line:
                    # Extract URL
                    import re
                    urls = re.findall(r'https://github\.com/[^\s]+/pull/\d+', line)
                    if urls:
                        pr_url = urls[0]
                        break

            return {
                "response": response_text.strip(),
                "pr_url": pr_url,
            }

    except Exception as e:
        return {
            "response": f"PR execution error: {str(e)[:200]}",
            "pr_url": None,
        }


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Code Agent")
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="JSON input with question, codebase_path, conversation_history, mode"
    )

    args = parser.parse_args()

    try:
        input_data = json.loads(args.input)
        question = input_data.get("question", "")
        codebase_path = input_data.get("codebase_path", "/Users/bart/Documents/code/vibeceo")
        conversation_history = input_data.get("conversation_history", [])
        mode = input_data.get("mode", "investigate")

        if not question:
            print(json.dumps({"error": "No question provided"}))
            sys.exit(1)

        if mode == "execute_pr":
            # Execute approved PR plan
            plan = input_data.get("plan", question)
            result = asyncio.run(execute_pr(plan, codebase_path))
        else:
            # Investigation or PR planning
            result = asyncio.run(run_investigation(
                question,
                codebase_path,
                conversation_history,
                mode
            ))

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
