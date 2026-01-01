#!/usr/bin/env python3
"""
Amber SDK Tools for Claude Agent SDK

In-process MCP server providing Amber's capabilities:
- Web search
- Image generation (fal.ai)
- File operations (restricted to codebase)
- Supabase queries (amber_state)
- Git operations
- Bash commands (restricted)
"""

import base64
import json
import os
import subprocess
import urllib.request
import urllib.parse
from typing import Any, Dict

from claude_agent_sdk import create_sdk_mcp_server, tool

# Security: Restrict file operations to codebase
ALLOWED_CODEBASE = os.getenv("AMBER_CODEBASE_PATH", "/Users/bart/Documents/code/vibeceo")

# Supabase config
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")


def is_safe_path(path: str) -> bool:
    """Ensure path is within allowed codebase."""
    if not path:
        return True
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
# WEB SEARCH
# =============================================================================

@tool(
    "web_search",
    "Search the web using Brave Search API. Returns relevant results for a query.",
    {"query": str, "count": int}
)
async def web_search_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    query = args.get("query", "")
    count = min(args.get("count", 5), 10)

    if not query:
        return make_result(json.dumps({"error": "Query required"}), is_error=True)

    brave_key = os.getenv("BRAVE_API_KEY")
    if not brave_key:
        return make_result(json.dumps({"error": "BRAVE_API_KEY not configured"}), is_error=True)

    try:
        url = f"https://api.search.brave.com/res/v1/web/search?q={urllib.parse.quote(query)}&count={count}"
        req = urllib.request.Request(url, headers={
            "Accept": "application/json",
            "X-Subscription-Token": brave_key
        })

        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

        results = []
        for item in data.get("web", {}).get("results", [])[:count]:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "description": item.get("description", "")
            })

        return make_result(json.dumps(results, indent=2))
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# IMAGE GENERATION (fal.ai)
# =============================================================================

@tool(
    "generate_image",
    "Generate an image using fal.ai's FLUX model. Returns the image URL.",
    {"prompt": str, "aspect_ratio": str}
)
async def generate_image_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    prompt = args.get("prompt", "")
    aspect_ratio = args.get("aspect_ratio", "square")  # square, landscape, portrait

    if not prompt:
        return make_result(json.dumps({"error": "Prompt required"}), is_error=True)

    fal_key = os.getenv("FAL_KEY")
    if not fal_key:
        return make_result(json.dumps({"error": "FAL_KEY not configured"}), is_error=True)

    # Map aspect ratio to dimensions
    size_map = {
        "square": {"width": 1024, "height": 1024},
        "landscape": {"width": 1024, "height": 768},
        "portrait": {"width": 768, "height": 1024},
    }
    size = size_map.get(aspect_ratio, size_map["square"])

    try:
        import urllib.request

        url = "https://queue.fal.run/fal-ai/flux/schnell"
        payload = json.dumps({
            "prompt": prompt,
            "image_size": size,
            "num_images": 1,
        }).encode()

        req = urllib.request.Request(url, data=payload, headers={
            "Authorization": f"Key {fal_key}",
            "Content-Type": "application/json"
        })

        with urllib.request.urlopen(req, timeout=60) as response:
            data = json.loads(response.read().decode())

        # fal.ai returns request_id for queue - poll for result
        request_id = data.get("request_id")
        if request_id:
            # Poll for completion
            status_url = f"https://queue.fal.run/fal-ai/flux/schnell/requests/{request_id}/status"
            for _ in range(30):  # Max 30 seconds
                status_req = urllib.request.Request(status_url, headers={
                    "Authorization": f"Key {fal_key}"
                })
                with urllib.request.urlopen(status_req, timeout=10) as status_response:
                    status_data = json.loads(status_response.read().decode())

                if status_data.get("status") == "COMPLETED":
                    # Get result
                    result_url = f"https://queue.fal.run/fal-ai/flux/schnell/requests/{request_id}"
                    result_req = urllib.request.Request(result_url, headers={
                        "Authorization": f"Key {fal_key}"
                    })
                    with urllib.request.urlopen(result_req, timeout=10) as result_response:
                        result_data = json.loads(result_response.read().decode())

                    images = result_data.get("images", [])
                    if images:
                        return make_result(json.dumps({
                            "url": images[0].get("url"),
                            "prompt": prompt
                        }))
                    break

                import time
                time.sleep(1)

            return make_result(json.dumps({"error": "Image generation timeout"}), is_error=True)

        # Direct response (not queued)
        images = data.get("images", [])
        if images:
            return make_result(json.dumps({
                "url": images[0].get("url"),
                "prompt": prompt
            }))

        return make_result(json.dumps({"error": "No image generated"}), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# FILE OPERATIONS
# =============================================================================

@tool(
    "read_file",
    "Read the contents of a file. Path relative to codebase root.",
    {"path": str}
)
async def read_file_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    path = args.get("path", "")

    if not is_safe_path(path):
        return make_result(json.dumps({"error": "Path not allowed"}), is_error=True)

    full_path = os.path.join(ALLOWED_CODEBASE, path) if path else ALLOWED_CODEBASE

    try:
        with open(full_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        if len(content) > 50000:
            content = content[:50000] + "\n\n... [truncated at 50000 chars]"

        return make_result(content)
    except FileNotFoundError:
        return make_result(json.dumps({"error": f"File not found: {path}"}), is_error=True)
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
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "w", encoding="utf-8") as f:
            f.write(content)
        return make_result(f"Wrote {len(content)} bytes to {path}")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "list_directory",
    "List files in a directory.",
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


@tool(
    "search_code",
    "Search for a pattern in codebase using ripgrep.",
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
    cmd.extend(["--glob", "!node_modules", "--glob", "!.git", "--glob", "!dist"])

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
                    rel_path = file_path.replace(ALLOWED_CODEBASE + "/", "")
                    matches.append({
                        "file": rel_path,
                        "line": match_data.get("line_number"),
                        "content": match_data.get("lines", {}).get("text", "").strip()
                    })
            except json.JSONDecodeError:
                continue
        return make_result(json.dumps(matches[:max_results], indent=2))
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# SUPABASE (Amber's Memory)
# =============================================================================

@tool(
    "read_amber_state",
    "Read Amber's state from Supabase. Types: persona, memory, log_entry, blog_post, voice_session.",
    {"type": str, "limit": int}
)
async def read_amber_state_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    state_type = args.get("type", "memory")
    limit = min(args.get("limit", 5), 20)

    if not SUPABASE_URL or not SUPABASE_KEY:
        return make_result(json.dumps({"error": "Supabase not configured"}), is_error=True)

    try:
        url = f"{SUPABASE_URL}/rest/v1/amber_state?type=eq.{state_type}&order=created_at.desc&limit={limit}"
        req = urllib.request.Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        })

        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

        results = []
        for row in data:
            results.append({
                "content": row.get("content", "")[:2000],
                "created_at": row.get("created_at"),
                "metadata": row.get("metadata"),
            })

        return make_result(json.dumps(results, indent=2))
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "write_amber_state",
    "Write to Amber's state in Supabase.",
    {"type": str, "content": str, "metadata": dict}
)
async def write_amber_state_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    state_type = args.get("type", "log_entry")
    content = args.get("content", "")
    metadata = args.get("metadata", {})

    if not content:
        return make_result(json.dumps({"error": "Content required"}), is_error=True)

    if not SUPABASE_URL or not SUPABASE_KEY:
        return make_result(json.dumps({"error": "Supabase not configured"}), is_error=True)

    try:
        url = f"{SUPABASE_URL}/rest/v1/amber_state"
        payload = json.dumps({
            "type": state_type,
            "content": content,
            "source": "amber_email_agent",
            "metadata": metadata,
        }).encode()

        req = urllib.request.Request(url, data=payload, method="POST", headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        })

        with urllib.request.urlopen(req, timeout=10) as response:
            pass  # 201 Created

        return make_result(f"Stored {state_type} entry ({len(content)} chars)")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# GIT OPERATIONS
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
    "Show recent git commits.",
    {"count": int}
)
async def git_log_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    count = min(args.get("count", 10), 50)

    try:
        result = subprocess.run(
            ["git", "log", f"-{count}", "--oneline", "--no-decorate"],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=10
        )
        return make_result(result.stdout.strip() or "No commits found")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


@tool(
    "git_commit",
    "Stage all changes and create a commit.",
    {"message": str}
)
async def git_commit_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    message = args.get("message", "")

    if not message:
        return make_result(json.dumps({"error": "Commit message required"}), is_error=True)

    try:
        # Stage all changes
        subprocess.run(["git", "add", "-A"], cwd=ALLOWED_CODEBASE, timeout=10)

        # Commit
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
    "git_push",
    "Push commits to remote.",
    {}
)
async def git_push_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    try:
        result = subprocess.run(
            ["git", "push"],
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=60
        )

        if result.returncode != 0:
            return make_result(json.dumps({"error": result.stderr.strip()}), is_error=True)

        return make_result("Pushed to remote")
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# BASH (Restricted)
# =============================================================================

ALLOWED_COMMANDS = [
    "ls", "pwd", "date", "echo", "cat", "head", "tail", "wc",
    "npm", "npx", "node", "python", "python3", "pip",
    "curl", "wget",
]

@tool(
    "run_command",
    "Run a shell command. Only certain commands are allowed.",
    {"command": str}
)
async def run_command_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    command = args.get("command", "")

    if not command:
        return make_result(json.dumps({"error": "Command required"}), is_error=True)

    # Check if command starts with an allowed binary
    first_word = command.split()[0] if command.split() else ""
    if first_word not in ALLOWED_COMMANDS:
        return make_result(json.dumps({
            "error": f"Command '{first_word}' not allowed. Allowed: {', '.join(ALLOWED_COMMANDS)}"
        }), is_error=True)

    try:
        result = subprocess.run(
            command,
            shell=True,
            cwd=ALLOWED_CODEBASE,
            capture_output=True,
            text=True,
            timeout=60
        )

        output = result.stdout.strip()
        if result.stderr:
            output += f"\n\nSTDERR:\n{result.stderr.strip()}"

        if len(output) > 10000:
            output = output[:10000] + "\n\n... [truncated]"

        return make_result(output if output else "(no output)")
    except subprocess.TimeoutExpired:
        return make_result(json.dumps({"error": "Command timeout"}), is_error=True)
    except Exception as e:
        return make_result(json.dumps({"error": str(e)}), is_error=True)


# =============================================================================
# CREATE MCP SERVER
# =============================================================================

amber_server = create_sdk_mcp_server(
    name="amber",
    version="1.0.0",
    tools=[
        # Web
        web_search_tool,
        # Images
        generate_image_tool,
        # Files
        read_file_tool,
        write_file_tool,
        list_directory_tool,
        search_code_tool,
        # Supabase (memory)
        read_amber_state_tool,
        write_amber_state_tool,
        # Git
        git_status_tool,
        git_log_tool,
        git_commit_tool,
        git_push_tool,
        # Bash
        run_command_tool,
    ]
)
