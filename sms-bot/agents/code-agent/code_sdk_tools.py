#!/usr/bin/env python3
"""
Code SDK Tools for Claude Agent SDK

In-process MCP server providing file, search, and git operations.
Security: All paths validated against CODE_AGENT_CODEBASE_PATH.
"""

import json
import os
import subprocess
from typing import Any, Dict

from claude_agent_sdk import create_sdk_mcp_server, tool

# Security: Restrict to allowed codebase path
ALLOWED_CODEBASE = os.getenv("CODE_AGENT_CODEBASE_PATH", "/Users/bart/Documents/code/vibeceo")


def is_safe_path(path: str) -> bool:
    """Ensure path is within allowed codebase."""
    if not path:
        return True  # Empty path = codebase root
    # Normalize and resolve the path
    if path.startswith("/"):
        abs_path = os.path.abspath(path)
    else:
        abs_path = os.path.abspath(os.path.join(ALLOWED_CODEBASE, path))
    return abs_path.startswith(ALLOWED_CODEBASE)


def make_result(text: str, is_error: bool = False) -> Dict[str, Any]:
    """Create MCP tool result in correct format."""
    result = {"content": [{"type": "text", "text": text}]}
    if is_error:
        result["isError"] = True
    return result


# =============================================================================
# FILE OPERATIONS
# =============================================================================

@tool(
    "read_file",
    "Read the contents of a file. Path should be relative to codebase root. "
    "Optionally specify start_line and end_line to read a range.",
    {"path": str, "start_line": int, "end_line": int}
)
async def read_file_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path", "")
    start_line = args.get("start_line", 0)
    end_line = args.get("end_line", 0)

    if not is_safe_path(path):
        return make_result(json.dumps({"error": "Path not allowed"}), is_error=True)

    full_path = os.path.join(ALLOWED_CODEBASE, path) if path else ALLOWED_CODEBASE

    try:
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            lines = f.readlines()

        # Apply line range if specified
        if start_line > 0 and end_line > 0:
            lines = lines[start_line - 1:end_line]
        elif start_line > 0:
            lines = lines[start_line - 1:]

        content = "".join(lines)

        # Truncate very large files
        if len(content) > 50000:
            content = content[:50000] + "\n\n... [truncated at 50000 chars]"

        return make_result(content)
    except FileNotFoundError:
        return make_result(json.dumps({"error": f"File not found: {path}"}), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "search_code",
    "Search for a regex pattern across files using ripgrep. "
    "Returns matching lines with file paths and line numbers. "
    "Use file_pattern to filter (e.g., '*.ts', '*.py').",
    {"pattern": str, "file_pattern": str, "max_results": int}
)
async def search_code_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    pattern = args.get("pattern", "")
    file_pattern = args.get("file_pattern", "")
    max_results = args.get("max_results", 50)

    if not pattern:
        return make_result(json.dumps({"error": "Pattern required"}), is_error=True)

    cmd = ["rg", "--json", "-m", str(max_results), pattern, ALLOWED_CODEBASE]
    if file_pattern:
        cmd.extend(["--glob", file_pattern])

    # Exclude common directories
    cmd.extend(["--glob", "!node_modules", "--glob", "!.git", "--glob", "!dist", "--glob", "!.next"])

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

        matches = []
        for line in result.stdout.strip().split("\n"):
            if not line:
                continue
            try:
                data = json.loads(line)
                if data.get("type") == "match":
                    match_data = data.get("data", {})
                    file_path = match_data.get("path", {}).get("text", "")
                    # Make path relative to codebase
                    rel_path = file_path.replace(ALLOWED_CODEBASE + "/", "")
                    matches.append({
                        "file": rel_path,
                        "line": match_data.get("line_number"),
                        "content": match_data.get("lines", {}).get("text", "").strip()
                    })
            except json.JSONDecodeError:
                continue

        return make_result(json.dumps(matches[:max_results], indent=2))
    except subprocess.TimeoutExpired:
        return make_result(json.dumps({"error": "Search timeout"}), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "list_directory",
    "List files and directories at a path. Use recursive=true to list all files recursively.",
    {"path": str, "recursive": bool}
)
async def list_directory_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path", ".")
    recursive = args.get("recursive", False)

    if not is_safe_path(path):
        return make_result(json.dumps({"error": "Path not allowed"}), is_error=True)

    full_path = os.path.join(ALLOWED_CODEBASE, path) if path and path != "." else ALLOWED_CODEBASE

    try:
        if recursive:
            items = []
            skip_dirs = {'.git', 'node_modules', '.next', 'dist', '__pycache__', '.venv', 'venv'}
            for root, dirs, files in os.walk(full_path):
                # Skip unwanted directories
                dirs[:] = [d for d in dirs if d not in skip_dirs]
                rel_root = os.path.relpath(root, ALLOWED_CODEBASE)
                for f in files:
                    items.append(os.path.join(rel_root, f))
                if len(items) >= 500:
                    break
            return make_result(json.dumps(items[:500]))
        else:
            items = os.listdir(full_path)
            return make_result(json.dumps(sorted(items)))
    except FileNotFoundError:
        return make_result(json.dumps({"error": f"Directory not found: {path}"}), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# GIT READ OPERATIONS
# =============================================================================

@tool("git_status", "Show git status of the repository.", {})
async def git_status_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain", "-b"],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=10
        )
        output = result.stdout.strip()
        return make_result(output if output else "Working tree clean, on main branch")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "git_log",
    "Show recent git commits. Optionally filter by file_path.",
    {"count": int, "file_path": str}
)
async def git_log_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    count = args.get("count", 10)
    file_path = args.get("file_path", "")

    cmd = ["git", "log", f"-{min(count, 50)}", "--oneline", "--no-decorate"]
    if file_path and is_safe_path(file_path):
        cmd.append("--")
        cmd.append(file_path)

    try:
        result = subprocess.run(cmd, cwd=ALLOWED_CODEBASE, capture_output=True, text=True, timeout=10)
        return make_result(result.stdout.strip() or "No commits found")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "git_diff",
    "Show git diff. Optionally specify commit or file_path.",
    {"commit": str, "file_path": str}
)
async def git_diff_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    commit = args.get("commit", "")
    file_path = args.get("file_path", "")

    cmd = ["git", "diff"]
    if commit:
        cmd.append(commit)
    if file_path and is_safe_path(file_path):
        cmd.append("--")
        cmd.append(file_path)

    try:
        result = subprocess.run(cmd, cwd=ALLOWED_CODEBASE, capture_output=True, text=True, timeout=30)
        diff = result.stdout.strip()
        if len(diff) > 30000:
            diff = diff[:30000] + "\n\n... [truncated at 30000 chars]"
        return make_result(diff if diff else "No changes")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "git_show",
    "Show a specific commit's details and diff.",
    {"commit": str}
)
async def git_show_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    commit = args.get("commit", "HEAD")

    try:
        result = subprocess.run(
            ["git", "show", "--stat", commit],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=10
        )
        output = result.stdout.strip()
        if len(output) > 10000:
            output = output[:10000] + "\n\n... [truncated]"
        return make_result(output)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# GIT WRITE OPERATIONS (PR Creation)
# =============================================================================

@tool(
    "create_branch",
    "Create and checkout a new git branch.",
    {"branch_name": str}
)
async def create_branch_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    branch_name = args.get("branch_name", "")

    if not branch_name:
        return make_result(json.dumps({"error": "Branch name required"}), is_error=True)

    # Sanitize branch name
    branch_name = branch_name.replace(" ", "-").lower()

    try:
        result = subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode != 0:
            return make_result(json.dumps({"error": result.stderr.strip()}), is_error=True)
        return make_result(f"Created and switched to branch: {branch_name}")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "write_file",
    "Write content to a file. Creates file if it doesn't exist.",
    {"path": str, "content": str}
)
async def write_file_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path", "")
    content = args.get("content", "")

    if not path:
        return make_result(json.dumps({"error": "Path required"}), is_error=True)

    if not is_safe_path(path):
        return make_result(json.dumps({"error": "Path not allowed"}), is_error=True)

    full_path = os.path.join(ALLOWED_CODEBASE, path)

    try:
        # Create parent directories if needed
        os.makedirs(os.path.dirname(full_path), exist_ok=True)

        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)

        return make_result(f"Wrote {len(content)} bytes to {path}")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "stage_files",
    "Stage files for commit. Use paths=['*'] to stage all changes.",
    {"paths": list}
)
async def stage_files_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    paths = args.get("paths", [])

    if not paths:
        return make_result(json.dumps({"error": "Paths required"}), is_error=True)

    # Validate all paths
    for path in paths:
        if path != "*" and path != "." and not is_safe_path(path):
            return make_result(json.dumps({"error": f"Path not allowed: {path}"}), is_error=True)

    try:
        cmd = ["git", "add"] + paths
        result = subprocess.run(cmd, cwd=ALLOWED_CODEBASE, capture_output=True, text=True, timeout=10)

        if result.returncode != 0:
            return make_result(json.dumps({"error": result.stderr.strip()}), is_error=True)

        # Get status to show what was staged
        status = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=10
        )
        return make_result(f"Staged files:\n{status.stdout.strip()}")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "commit",
    "Create a git commit with the given message.",
    {"message": str}
)
async def commit_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    message = args.get("message", "")

    if not message:
        return make_result(json.dumps({"error": "Commit message required"}), is_error=True)

    try:
        result = subprocess.run(
            ["git", "commit", "-m", message],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode != 0:
            return make_result(json.dumps({"error": result.stderr.strip()}), is_error=True)

        return make_result(result.stdout.strip())
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "push",
    "Push the current branch to remote. Use set_upstream=true for new branches.",
    {"set_upstream": bool}
)
async def push_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    set_upstream = args.get("set_upstream", False)

    try:
        # Get current branch name
        branch_result = subprocess.run(
            ["git", "branch", "--show-current"],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=10
        )
        branch = branch_result.stdout.strip()

        if set_upstream:
            cmd = ["git", "push", "-u", "origin", branch]
        else:
            cmd = ["git", "push"]

        result = subprocess.run(cmd, cwd=ALLOWED_CODEBASE, capture_output=True, text=True, timeout=60)

        if result.returncode != 0:
            return make_result(json.dumps({"error": result.stderr.strip()}), is_error=True)

        return make_result(f"Pushed {branch} to origin")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "create_pr",
    "Create a GitHub pull request using gh CLI.",
    {"title": str, "body": str, "base": str}
)
async def create_pr_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    title = args.get("title", "")
    body = args.get("body", "")
    base = args.get("base", "main")

    if not title:
        return make_result(json.dumps({"error": "PR title required"}), is_error=True)

    try:
        cmd = [
            "gh", "pr", "create",
            "--title", title,
            "--body", body or "Created by Code Agent",
            "--base", base
        ]

        result = subprocess.run(cmd, cwd=ALLOWED_CODEBASE, capture_output=True, text=True, timeout=60)

        if result.returncode != 0:
            return make_result(json.dumps({"error": result.stderr.strip()}), is_error=True)

        # Output contains the PR URL
        return make_result(result.stdout.strip())
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# CREATE MCP SERVER
# =============================================================================

code_server = create_sdk_mcp_server(
    name="code",
    version="1.0.0",
    tools=[
        # Read operations
        read_file_tool,
        search_code_tool,
        list_directory_tool,
        # Git read operations
        git_status_tool,
        git_log_tool,
        git_diff_tool,
        git_show_tool,
        # Write operations (PR creation)
        write_file_tool,
        create_branch_tool,
        stage_files_tool,
        commit_tool,
        push_tool,
        create_pr_tool,
    ]
)
