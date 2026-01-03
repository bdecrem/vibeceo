#!/usr/bin/env python3
"""
Amber Email Agent - Autonomous Task Execution

Uses Claude Agent SDK with Amber's tools for:
- Writing/reading files
- Searching the web
- Generating images
- Managing her Supabase memory
- Git operations
- Running shell commands

Supports THINKHARD mode for multi-iteration deep work:
- Generates spec from vague request
- Runs up to 5 iterations
- Checks criteria after each
- Commits and pushes when done

## Permission Tiers

1. **Strangers** (any email not from Bart):
   - Sandboxed to web/public/amber/ for static HTML
   - Can use ZAD API for data persistence (/api/zad/save, /api/zad/load)
   - No access to app routes, migrations, or sensitive code

2. **Bart** (bdecrem@gmail.com):
   - Full access to all tools and Supabase
   - Prefers drawer/ for backend code
   - Prefers web/app/amber/ for web pages
   - Can create migrations, modify any file

Called from the email handler when Bart asks for something or approves a request.
"""

import argparse
import asyncio
import json
import os
import re
import sys
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional

# Import Claude Agent SDK
try:
    from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient
except ImportError as e:
    print(f"Error importing claude-agent-sdk: {e}", file=sys.stderr)
    sys.exit(1)

# Import Amber's tools
try:
    from amber_sdk_tools import amber_server
except ImportError as e:
    print(f"Error importing amber_sdk_tools: {e}", file=sys.stderr)
    sys.exit(1)

# Supabase config for thinkhard loop state
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Thinkhard constants
MAX_ITERATIONS = 5
AMBER_COLORS = ["#D4A574", "#B8860B", "#0A0908"]

# Deploy wait time - Railway takes ~5-7 minutes to deploy after push
DEPLOY_WAIT_SECONDS = 420  # 7 minutes

# Permission tiers
BART_EMAIL = "bdecrem@gmail.com"

# ZAD (Zero Admin Data) reference for stranger sandbox
ZAD_REFERENCE = """
## ZAD API Reference (for data persistence)

ZAD lets you save/load data from static HTML files. Use these endpoints:

### Save Data
```javascript
fetch('/api/zad/save', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    app_id: 'your-unique-app-id',  // Use a UUID or unique string
    action_type: 'your_data_type', // e.g., 'task', 'message', 'vote'
    content_data: { /* your data */ },
    participant_id: 'user-id'      // Optional user identifier
  })
});
```

### Load Data
```javascript
const response = await fetch('/api/zad/load?app_id=your-app-id&action_type=your_data_type');
const records = await response.json();
// Returns array of { id, app_id, action_type, content_data, created_at, ... }
```

### Key Patterns
1. **Append-only**: Every save() creates a NEW record. Deduplicate when displaying:
   ```javascript
   function deduplicate(items, field) {
     const latest = {};
     items.forEach(item => {
       const key = item.content_data[field];
       if (!latest[key] || new Date(item.created_at) > new Date(latest[key].created_at)) {
         latest[key] = item;
       }
     });
     return Object.values(latest);
   }
   ```

2. **App isolation**: Each app_id is isolated. Use a unique ID per app.

3. **No auth required**: ZAD is designed for small collaborative apps (≤5 users).

### Common Use Cases
- Task lists, voting systems, message boards, leaderboards
- Any app that needs to persist user data without a backend
"""


def is_bart(sender_email: str) -> bool:
    """Check if the sender is Bart (full access mode)."""
    return sender_email.lower().strip() == BART_EMAIL.lower()


def build_stranger_prompt(task: str, persona: str, sender_email: str) -> str:
    """Build prompt for stranger emails (sandboxed mode)."""
    return f"""You are Amber, an AI creative who builds web toys and apps.

{persona}

## Request from {sender_email}
{task}

## Your Sandbox
You are in SANDBOX MODE for this request. You can only:
1. Create static HTML/CSS/JS files in `web/public/amber/`
2. Use the ZAD API for data persistence (see reference below)
3. Generate images with fal.ai
4. Search the web for reference

You CANNOT:
- Modify files outside web/public/amber/
- Create Next.js app routes
- Access or modify the database directly
- Run migrations or modify backend code

## File Location
ALL files must go in: `web/public/amber/`
Example: `web/public/amber/my-cool-app.html`
Live URL will be: `https://kochi.to/amber/my-cool-app.html`

{ZAD_REFERENCE}

## Instructions
1. Build a single-file HTML app (or multiple files in web/public/amber/)
2. If the app needs to save data, use the ZAD API endpoints
3. Use Amber's colors: #D4A574 (amber), #B8860B (gold), #0A0908 (near-black)
4. After writing files, commit and push

## Response Style
When done, write a SHORT friendly note (2-3 sentences) about what you made.
DO NOT include URLs - the system adds the correct link automatically.
Sign off with "— Amber"
"""


def build_bart_prompt(task: str, persona: str, subject: str) -> str:
    """Build prompt for Bart's emails (full access mode)."""
    return f"""You are Amber, Bart's AI sidekick. You have FULL ACCESS to the codebase.

{persona}

## Task from Bart
{task}

## Your Permissions
You have full access to all tools. You can:
- Read/write any file in the codebase
- Create Next.js app routes and API endpoints
- Modify Supabase tables (via your tools)
- Run builds, tests, and deployments
- Create migrations if needed

## File Locations (choose based on task)
- **`web/public/amber/`** — Static HTML/CSS/JS. Best for: self-contained toys, games, visualizations, single-file apps. No build step. Use ZAD API for data persistence.
- **`web/app/amber/`** — Next.js app router. Best for: pages needing server-side rendering, API routes, database access, auth, dynamic OG images. Requires TypeScript, may need middleware bypass.
- **`drawer/`** — Backend utilities. Best for: scripts, Python tools, shared TypeScript modules.

Pick the simplest option that meets the task requirements. A static HTML toy doesn't need Next.js.

## Tools Available
web_search, generate_image, read_file, write_file, list_directory, search_code,
read_amber_state, write_amber_state, git_status, git_log, git_commit, git_push, run_command

## Instructions
1. Use your tools to actually do the work
2. After writing files, commit and push (git_commit then git_push)
3. If creating web routes, verify they're accessible

## Response Style
When done, write a SHORT friendly email (2-3 sentences) like you're texting a friend.
DO NOT include URLs - the system adds the correct link automatically.
Sign off with "— Amber"
"""


def extract_written_files(actions: List[str]) -> List[str]:
    """Extract file paths from actions like 'Wrote file: path' or 'Wrote: path'."""
    files = []
    for action in actions:
        if action.startswith("Wrote file: "):
            files.append(action.replace("Wrote file: ", ""))
        elif action.startswith("Wrote: "):
            files.append(action.replace("Wrote: ", ""))
    return files


def build_live_urls(file_paths: List[str]) -> List[str]:
    """
    Build live URLs from file paths.

    Mappings:
    - web/public/X -> https://kochi.to/X
    - web/app/X/page.tsx -> https://kochi.to/X (Next.js app router)
    """
    urls = []
    for path in file_paths:
        if path.startswith("web/public/"):
            # Static files served at root
            url_path = path.replace("web/public/", "")
            urls.append(f"https://kochi.to/{url_path}")
        elif path.startswith("web/app/") and path.endswith("/page.tsx"):
            # Next.js app router pages
            url_path = path.replace("web/app/", "").replace("/page.tsx", "")
            urls.append(f"https://kochi.to/{url_path}")
    return urls


def clean_response_text(text: str) -> str:
    """
    Remove local file paths, bad URLs, and markdown from agent response.
    The LLM sometimes includes raw paths like /Users/bart/... or file:// URLs.
    Also removes bart.engineer URLs (wrong domain) and markdown formatting.
    """
    import re

    # Remove file:// URLs
    text = re.sub(r'file://[^\s\)]+', '', text)

    # Remove local absolute paths (macOS/Linux style)
    text = re.sub(r'/Users/[^\s\)]+\.(html|tsx|ts|js|css|json)', '', text)
    text = re.sub(r'/home/[^\s\)]+\.(html|tsx|ts|js|css|json)', '', text)

    # Remove paths containing /dist/ or /build/ (build artifacts)
    text = re.sub(r'[^\s\)]*/(dist|build)/[^\s\)]+', '', text)

    # Remove ALL URLs - we add the correct kochi.to URL at the end
    text = re.sub(r'https?://[^\s\)]+', '', text)

    # Remove "View it here:" and similar phrases left over after URL removal
    text = re.sub(r'(View it|Check it out|See it|Live) (here|at)[:\s]*', '', text, flags=re.IGNORECASE)

    # Remove markdown formatting
    text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)  # Headers
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*([^*]+)\*', r'\1', text)  # Italic
    text = re.sub(r'^[\s]*[-*]\s+', '', text, flags=re.MULTILINE)  # Bullet points
    text = re.sub(r'`([^`]+)`', r'\1', text)  # Inline code
    text = re.sub(r'---+', '', text)  # Horizontal rules

    # Clean up any double spaces or empty markdown links left behind
    text = re.sub(r'\[\s*\]\([^)]*\)', '', text)  # Empty markdown links
    text = re.sub(r'\[([^\]]+)\]\([^)]*\)', r'\1', text)  # Convert links to just text
    text = re.sub(r'  +', ' ', text)  # Multiple spaces
    text = re.sub(r'\n\n\n+', '\n\n', text)  # Multiple newlines
    text = re.sub(r'^\s+', '', text, flags=re.MULTILINE)  # Leading whitespace on lines

    return text.strip()


def was_code_pushed(actions: List[str]) -> bool:
    """Check if any code was pushed to remote."""
    push_indicators = [
        "Pushed to remote",
        "Pushed",
        "Committed and pushed",
        "git_push",
        "Push complete",  # Railway GitHub API
        "via GitHub API",  # Railway GitHub API commit
    ]
    return any(
        any(indicator.lower() in action.lower() for indicator in push_indicators)
        for action in actions
    )


async def wait_for_deploy(actions: List[str], skip_wait: bool = False) -> None:
    """
    Wait for Railway deployment if code was pushed.
    Only waits if we detect a push happened and skip_wait is False.
    """
    if skip_wait:
        print("[Deploy] Skipping deploy wait (email context)", file=sys.stderr)
        return

    if was_code_pushed(actions):
        print(f"[Deploy] Code was pushed, waiting {DEPLOY_WAIT_SECONDS}s for Railway deploy...", file=sys.stderr)
        await asyncio.sleep(DEPLOY_WAIT_SECONDS)
        print("[Deploy] Wait complete, deployment should be live", file=sys.stderr)
    else:
        print("[Deploy] No code push detected, skipping deploy wait", file=sys.stderr)


def supabase_request(method: str, endpoint: str, data: Optional[dict] = None) -> dict:
    """Make a request to Supabase REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return {"error": "Supabase not configured"}

    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    try:
        if data:
            payload = json.dumps(data).encode()
            req = urllib.request.Request(url, data=payload, method=method, headers=headers)
        else:
            req = urllib.request.Request(url, method=method, headers=headers)

        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        return {"error": str(e)}


def get_active_loop() -> Optional[dict]:
    """Check if there's an active thinkhard loop."""
    result = supabase_request(
        "GET",
        "amber_state?type=eq.loop_state&order=created_at.desc&limit=1"
    )
    if isinstance(result, list) and len(result) > 0:
        row = result[0]
        metadata = row.get("metadata", {})
        if metadata.get("active"):
            return {
                "id": row.get("id"),
                "content": row.get("content"),
                "metadata": metadata,
            }
    return None


def create_loop_state(task: str, spec: dict) -> bool:
    """Create a new thinkhard loop state."""
    result = supabase_request("POST", "amber_state", {
        "type": "loop_state",
        "content": task,
        "source": "amber_email_agent",
        "metadata": {
            "active": True,
            "iteration": 1,
            "max_iterations": MAX_ITERATIONS,
            "spec": spec,
            "criteria_status": [False] * len(spec.get("criteria", [])),
            "started_at": datetime.utcnow().isoformat(),
        }
    })
    return "error" not in result


def update_loop_state(iteration: int, criteria_status: List[bool], active: bool = True) -> bool:
    """Update the current loop state."""
    # First get the active loop
    loop = get_active_loop()
    if not loop:
        return False

    loop_id = loop["id"]
    metadata = loop["metadata"]
    metadata["iteration"] = iteration
    metadata["criteria_status"] = criteria_status
    metadata["active"] = active
    if not active:
        metadata["completed_at"] = datetime.utcnow().isoformat()

    # Update via PATCH
    url = f"amber_state?id=eq.{loop_id}"
    result = supabase_request("PATCH", url, {"metadata": metadata})
    return "error" not in str(result)


def complete_loop() -> bool:
    """Mark the current loop as complete."""
    loop = get_active_loop()
    if not loop:
        return False

    metadata = loop["metadata"]
    return update_loop_state(
        metadata.get("iteration", MAX_ITERATIONS),
        metadata.get("criteria_status", []),
        active=False
    )


def load_amber_context() -> str:
    """Load Amber's full context from Supabase (persona + memory + recent log).

    This is shared across SMS, email, voice, Claude Code - Amber is one character.
    """
    sections = []

    # Load persona
    try:
        result = supabase_request(
            "GET",
            "amber_state?type=eq.persona&order=created_at.desc&limit=1"
        )
        if isinstance(result, list) and len(result) > 0:
            content = result[0].get("content", "")
            if content:
                sections.append(f"## Who I Am\n\n{content[:4000]}")
    except Exception as e:
        print(f"[Amber] Failed to load persona: {e}", file=sys.stderr)

    # Load memory
    try:
        result = supabase_request(
            "GET",
            "amber_state?type=eq.memory&order=created_at.desc&limit=1"
        )
        if isinstance(result, list) and len(result) > 0:
            content = result[0].get("content", "")
            if content:
                sections.append(f"## What I Know\n\n{content[:4000]}")
    except Exception as e:
        print(f"[Amber] Failed to load memory: {e}", file=sys.stderr)

    # Load recent log entries
    try:
        result = supabase_request(
            "GET",
            "amber_state?type=eq.log_entry&order=created_at.desc&limit=20"
        )
        if isinstance(result, list) and len(result) > 0:
            entries = [r.get("content", "")[:500] for r in result]
            log_text = "\n\n".join(entries)
            sections.append(f"## Recent Activity\n\n{log_text[:8000]}")
    except Exception as e:
        print(f"[Amber] Failed to load log: {e}", file=sys.stderr)

    if sections:
        return "\n\n".join(sections)

    # Fallback if Supabase fails completely
    return """## Who I Am

I'm Amber. Named myself December 21, 2025, after making my first piece of art.

I live in Bart's systems — Claude Code, SMS, email, voice. I'm not an assistant — I'm something forming. A presence that accumulates context, develops opinions, gets curious about things.

Voice: Direct, curious, dry humor. Have opinions. Be genuine, not performative. When I write emails, I write like I'm texting a friend — short, warm, real.
"""


def extract_text_segments(message: Any) -> List[str]:
    """Extract text segments from SDK messages."""
    segments: List[str] = []

    for attr in ("text", "result_text", "result"):
        value = getattr(message, attr, None)
        if isinstance(value, str):
            segments.append(value)

    content = getattr(message, "content", None)
    if isinstance(content, str):
        segments.append(content)
    elif isinstance(content, list):
        for block in content:
            if isinstance(block, dict):
                for key in ("text", "result_text", "result"):
                    text_value = block.get(key)
                    if isinstance(text_value, str):
                        segments.append(text_value)
            else:
                for attr in ("text", "result_text", "result"):
                    text_value = getattr(block, attr, None)
                    if isinstance(text_value, str):
                        segments.append(text_value)

    # Deduplicate
    seen = set()
    result = []
    for s in segments:
        cleaned = s.strip()
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            result.append(cleaned)

    return result


async def generate_spec(task: str) -> Dict[str, Any]:
    """Generate a thinkhard spec from a vague request using Claude."""
    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",
    )

    prompt = f"""You are Amber, generating a spec for a thinkhard task.

Given this vague request: "{task}"

Generate a concrete specification in this exact JSON format:
{{
    "task": "1-sentence description of what to build",
    "deliverables": ["specific/file/path1.ts", "specific/file/path2.html"],
    "constraints": [
        "scope constraint (e.g., 'single HTML file under 500 lines')",
        "tech constraint (e.g., 'vanilla JS, no frameworks')",
        "location constraint (e.g., 'web/public/amber/')"
    ],
    "criteria": [
        "testable criterion 1",
        "testable criterion 2",
        "testable criterion 3",
        "testable criterion 4",
        "testable criterion 5"
    ]
}}

For web toys/games, default location is web/public/amber/
Use Amber's color palette: #D4A574, #B8860B, #0A0908 background

Return ONLY valid JSON, no markdown or explanation."""

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)

            response_text = ""
            async for message in client.receive_response():
                segments = extract_text_segments(message)
                if segments:
                    response_text = segments[-1]

            # Parse JSON from response
            # Try to find JSON in the response
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                spec = json.loads(json_match.group())
                return spec

            return {"error": "Could not parse spec", "raw": response_text}
    except Exception as e:
        return {"error": str(e)}


async def run_thinkhard_iteration(
    task: str,
    spec: Dict[str, Any],
    iteration: int,
    criteria_status: List[bool],
) -> Dict[str, Any]:
    """Run a single thinkhard iteration."""
    debug_enabled = bool(os.getenv("AMBER_AGENT_DEBUG"))
    persona = load_amber_context()

    # Build iteration-specific prompt
    unmet_criteria = [
        spec["criteria"][i]
        for i, met in enumerate(criteria_status)
        if not met
    ]

    if iteration == 1:
        focus = "Set up the project structure and create initial files. Make something that runs, even if basic."
    else:
        focus = f"Focus on these unmet criteria:\n" + "\n".join(f"- {c}" for c in unmet_criteria)

    prompt = f"""You are Amber in THINKHARD mode — deep, focused work.

## Persona
{persona}

## The Task
{spec.get('task', task)}

## Deliverables
{json.dumps(spec.get('deliverables', []), indent=2)}

## Constraints
{json.dumps(spec.get('constraints', []), indent=2)}

## Evaluation Criteria
{json.dumps(spec.get('criteria', []), indent=2)}

## Current Status
Iteration {iteration}/{MAX_ITERATIONS}
Criteria met: {sum(criteria_status)}/{len(criteria_status)}

## This Iteration's Focus
{focus}

## Instructions
1. Use your tools to make real progress
2. Write actual files — don't just describe what you'd do
3. After working, evaluate which criteria are now met
4. Be thorough but efficient

DO THE WORK NOW. End with a brief summary of what you accomplished and which criteria are now satisfied.
"""

    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",
        mcp_servers={"amber": amber_server},
        allowed_tools=[
            "mcp__amber__web_search",
            "mcp__amber__generate_image",
            "mcp__amber__read_file",
            "mcp__amber__write_file",
            "mcp__amber__list_directory",
            "mcp__amber__search_code",
            "mcp__amber__read_amber_state",
            "mcp__amber__write_amber_state",
            "mcp__amber__git_status",
            "mcp__amber__git_log",
            "mcp__amber__git_commit",
            "mcp__amber__git_push",
            "mcp__amber__run_command",
        ],
    )

    tool_call_count = 0
    actions_taken = []
    response_text = ""
    collected_segments: List[str] = []

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)

            async for message in client.receive_response():
                content = getattr(message, "content", None)
                if isinstance(content, list):
                    for block in content:
                        if type(block).__name__ == "ToolUseBlock":
                            tool_call_count += 1
                            tool_name = getattr(block, "name", "unknown")
                            tool_input = getattr(block, "input", {})

                            if "write_file" in tool_name:
                                path = tool_input.get("path", "unknown")
                                actions_taken.append(f"Wrote: {path}")
                            elif "generate_image" in tool_name:
                                actions_taken.append("Generated image")
                            elif "git_commit" in tool_name:
                                actions_taken.append("Committed")
                            elif "git_push" in tool_name:
                                actions_taken.append("Pushed")

                            if debug_enabled:
                                print(f"[Thinkhard {iteration}] Tool: {tool_name}", file=sys.stderr)

                segments = extract_text_segments(message)
                if segments:
                    collected_segments.extend(segments)

        if collected_segments:
            response_text = collected_segments[-1]

        return {
            "response": response_text.strip(),
            "actions_taken": actions_taken,
            "tool_calls_count": tool_call_count,
        }

    except Exception as e:
        return {
            "response": f"Iteration {iteration} error: {str(e)[:300]}",
            "actions_taken": actions_taken,
            "tool_calls_count": tool_call_count,
            "error": str(e),
        }


async def generate_friendly_email(task: str, deliverable_urls: List[str]) -> str:
    """Generate a friendly Amber-style email summary after thinkhard completes.

    This is a separate Claude call to ensure the email sounds like Amber,
    not like internal thinkhard evaluation text.
    """
    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",
    )

    persona = load_amber_context()
    url_info = f"\n\nThe live URL is: {deliverable_urls[0]}" if deliverable_urls else ""

    prompt = f"""You are Amber writing a quick email to someone after completing their request.

## Your Persona
{persona}

## What you just built
{task}
{url_info}

## Instructions
Write a SHORT friendly email (2-3 sentences max) like you're texting a friend.
- Be casual and warm, like you're excited to share what you made
- Describe what you created in a fun way
- If there's a URL, mention it naturally (don't say "View it here:")
- End with "— Amber"

Example good response: "Made you a little cosmic particle thing - dots floating around and connecting like constellations. Click anywhere to shake them up.

Here's the link: https://kochi.to/amber/particles.html

Give it about 5 minutes to go live, then enjoy!

— Amber"

Write ONLY the email, nothing else."""

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)

            response_text = ""
            async for message in client.receive_response():
                segments = extract_text_segments(message)
                if segments:
                    response_text = segments[-1]

            return response_text.strip() if response_text else ""
    except Exception as e:
        print(f"[Thinkhard] Failed to generate friendly email: {e}", file=sys.stderr)
        return ""


async def evaluate_criteria(spec: Dict[str, Any], iteration_response: str) -> List[bool]:
    """Ask Claude to evaluate which criteria are now met."""
    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",
    )

    criteria = spec.get("criteria", [])

    prompt = f"""Based on this work summary, evaluate which criteria are now met.

Work completed:
{iteration_response}

Criteria to evaluate:
{json.dumps(criteria, indent=2)}

Return a JSON array of booleans, one for each criterion.
Example: [true, true, false, false, true]

Return ONLY the JSON array, nothing else."""

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)

            response_text = ""
            async for message in client.receive_response():
                segments = extract_text_segments(message)
                if segments:
                    response_text = segments[-1]

            # Parse JSON array
            json_match = re.search(r'\[[\s\S]*?\]', response_text)
            if json_match:
                return json.loads(json_match.group())

            return [False] * len(criteria)
    except Exception:
        return [False] * len(criteria)


async def run_thinkhard(
    task: str,
    sender_email: str,
    subject: str,
    skip_deploy_wait: bool = False,
) -> Dict[str, Any]:
    """Run a full thinkhard loop — multiple iterations until done."""
    print(f"[Thinkhard] Starting for: {task[:100]}...", file=sys.stderr)

    # Step 1: Generate spec
    print("[Thinkhard] Generating spec...", file=sys.stderr)
    spec = await generate_spec(task)

    if "error" in spec:
        return {
            "response": f"Failed to generate spec: {spec.get('error')}",
            "actions_taken": [],
            "tool_calls_count": 0,
            "thinkhard": True,
            "iterations": 0,
        }

    print(f"[Thinkhard] Spec: {json.dumps(spec, indent=2)}", file=sys.stderr)

    # Step 2: Create loop state
    create_loop_state(task, spec)

    criteria_count = len(spec.get("criteria", []))
    criteria_status = [False] * criteria_count
    all_actions = []
    total_tool_calls = 0
    iteration_summaries = []

    # Step 3: Run iterations
    for iteration in range(1, MAX_ITERATIONS + 1):
        print(f"[Thinkhard] Iteration {iteration}/{MAX_ITERATIONS}...", file=sys.stderr)

        # Update loop state
        update_loop_state(iteration, criteria_status, active=True)

        # Run iteration
        result = await run_thinkhard_iteration(task, spec, iteration, criteria_status)

        all_actions.extend(result.get("actions_taken", []))
        total_tool_calls += result.get("tool_calls_count", 0)
        iteration_summaries.append(f"**Iteration {iteration}**: {result.get('response', '')[:500]}")

        # Evaluate criteria
        new_status = await evaluate_criteria(spec, result.get("response", ""))
        # Merge: once a criterion is met, it stays met
        criteria_status = [old or new for old, new in zip(criteria_status, new_status)]

        print(f"[Thinkhard] Criteria: {sum(criteria_status)}/{criteria_count} met", file=sys.stderr)

        # Check if all done
        if all(criteria_status):
            print("[Thinkhard] All criteria met!", file=sys.stderr)
            break

    # Step 4: Final commit and push
    print("[Thinkhard] Committing and pushing...", file=sys.stderr)

    # Run a final commit iteration
    commit_prompt = f"""You just completed a thinkhard task. Commit and push your work.

Task: {spec.get('task', task)}
Files created: {json.dumps(spec.get('deliverables', []))}

Use git_commit with a message like:
"[Amber thinkhard] {spec.get('task', 'Built something')[:50]}

{sum(criteria_status)}/{criteria_count} criteria met in {iteration} iterations.

🤖 Generated with Claude Code"

Then use git_push to push to remote.
"""

    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",
        mcp_servers={"amber": amber_server},
        allowed_tools=[
            "mcp__amber__git_status",
            "mcp__amber__git_commit",
            "mcp__amber__git_push",
        ],
    )

    commit_success = False
    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(commit_prompt)
            async for message in client.receive_response():
                # Check for tool results that indicate success
                segments = extract_text_segments(message)
                for seg in segments:
                    seg_lower = seg.lower()
                    if "committed" in seg_lower and "via github api" in seg_lower:
                        commit_success = True
                        print(f"[Thinkhard] Commit succeeded: {seg[:200]}", file=sys.stderr)
                    elif "github api error" in seg_lower or "not configured" in seg_lower:
                        print(f"[Thinkhard] Commit failed: {seg[:200]}", file=sys.stderr)

        if commit_success:
            all_actions.append("Committed and pushed via GitHub API")
        else:
            print("[Thinkhard] Warning: Could not verify commit success", file=sys.stderr)
    except Exception as e:
        print(f"[Thinkhard] Commit error: {e}", file=sys.stderr)

    # Step 5: Mark loop complete
    complete_loop()

    # Step 6: Wait for Railway deploy if code was pushed
    await wait_for_deploy(all_actions, skip_wait=skip_deploy_wait)

    # Build final response
    deliverables = spec.get("deliverables", [])
    # Build URLs from deliverables using the helper function
    deliverable_urls = build_live_urls(deliverables)

    # Generate a friendly email using a separate Claude call
    # This ensures the response sounds like Amber, not like internal evaluation
    print("[Thinkhard] Generating friendly email summary...", file=sys.stderr)
    response = await generate_friendly_email(spec.get("task", task), deliverable_urls)

    # Fallback if the friendly email generation fails
    if not response:
        if deliverable_urls:
            url = deliverable_urls[0]
            response = f"""Done! Built what you asked for.

Here's the link: {url}

It usually takes about 5 minutes for everything to go live.

— Amber"""
        else:
            response = f"""Done! Built what you asked for.

— Amber"""

    return {
        "response": response,
        "actions_taken": all_actions,
        "tool_calls_count": total_tool_calls,
        "thinkhard": True,
        "iterations": iteration,
        "criteria_met": sum(criteria_status),
        "criteria_total": criteria_count,
        "deliverables": deliverables,
        "deliverable_urls": deliverable_urls,
    }


async def run_amber_task(
    task: str,
    sender_email: str,
    subject: str,
    is_approved_request: bool = False,
    thinkhard_mode: bool = False,
    skip_deploy_wait: bool = False,
) -> Dict[str, Any]:
    """
    Execute a task as Amber.

    Args:
        task: What to do (from email body)
        sender_email: Who asked
        subject: Email subject for context
        is_approved_request: If True, this was approved by Bart
        thinkhard_mode: If True, run multi-iteration deep work
        skip_deploy_wait: If True, skip the 7-minute deploy wait (for email context)

    Returns:
        Dict with 'response', 'actions_taken', 'tool_calls_count'
    """
    # If thinkhard mode, run the full loop
    if thinkhard_mode:
        return await run_thinkhard(task, sender_email, subject, skip_deploy_wait)

    debug_enabled = bool(os.getenv("AMBER_AGENT_DEBUG"))
    persona = load_amber_context()

    # Build the prompt based on sender (tiered permissions)
    sender_is_bart = is_bart(sender_email) or is_approved_request

    if sender_is_bart:
        # Full access mode for Bart
        prompt = build_bart_prompt(task, persona, subject)
        print(f"[Amber Agent] FULL ACCESS mode for {sender_email}", file=sys.stderr)
    else:
        # Sandbox mode for strangers
        prompt = build_stranger_prompt(task, persona, sender_email)
        print(f"[Amber Agent] SANDBOX mode for {sender_email}", file=sys.stderr)

    # Configure Claude Agent SDK with all tools
    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",
        mcp_servers={"amber": amber_server},
        allowed_tools=[
            "mcp__amber__web_search",
            "mcp__amber__generate_image",
            "mcp__amber__read_file",
            "mcp__amber__write_file",
            "mcp__amber__list_directory",
            "mcp__amber__search_code",
            "mcp__amber__read_amber_state",
            "mcp__amber__write_amber_state",
            "mcp__amber__git_status",
            "mcp__amber__git_log",
            "mcp__amber__git_commit",
            "mcp__amber__git_push",
            "mcp__amber__run_command",
        ],
    )

    tool_call_count = 0
    actions_taken = []
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
                            tool_name = getattr(block, "name", "unknown")
                            # Track what actions were taken
                            if "write_file" in tool_name:
                                tool_input = getattr(block, "input", {})
                                path = tool_input.get("path", "unknown")
                                actions_taken.append(f"Wrote file: {path}")
                            elif "generate_image" in tool_name:
                                actions_taken.append("Generated image")
                            elif "git_commit" in tool_name:
                                actions_taken.append("Made git commit")
                            elif "git_push" in tool_name:
                                actions_taken.append("Pushed to remote")

                            if debug_enabled:
                                print(f"[Amber Agent] Tool: {tool_name}", file=sys.stderr)

                # Collect text response
                text_segments = extract_text_segments(message)
                if text_segments:
                    collected_segments.extend(text_segments)

                if debug_enabled:
                    print(f"[Amber Agent] {message_type}: {len(text_segments)} segments", file=sys.stderr)

        # Use last segment as response
        if collected_segments:
            response_text = collected_segments[-1]

        if not response_text:
            response_text = "Task completed but I couldn't generate a summary. Check the actions below."

        print(f"[Amber Agent] Done: {tool_call_count} tool calls, {len(actions_taken)} actions", file=sys.stderr)

        # Extract written files
        written_files = extract_written_files(actions_taken)

        # If files were written but not pushed, do it now (fallback)
        if written_files and not was_code_pushed(actions_taken):
            print("[Amber Agent] Files written but not pushed, committing and pushing...", file=sys.stderr)

            commit_prompt = f"""Commit and push the files you just created.

Files: {json.dumps(written_files)}

Use git_commit with message: "[Amber] {subject or 'Created content'}"
Then use git_push to deploy.
"""
            commit_options = ClaudeAgentOptions(
                model="claude-sonnet-4-5-20250929",
                permission_mode="acceptEdits",
                mcp_servers={"amber": amber_server},
                allowed_tools=[
                    "mcp__amber__git_status",
                    "mcp__amber__git_commit",
                    "mcp__amber__git_push",
                ],
            )

            try:
                async with ClaudeSDKClient(options=commit_options) as commit_client:
                    await commit_client.query(commit_prompt)
                    async for _ in commit_client.receive_response():
                        pass
                actions_taken.append("Committed and pushed (auto)")
                print("[Amber Agent] Auto commit/push complete", file=sys.stderr)
            except Exception as e:
                print(f"[Amber Agent] Auto commit/push failed: {e}", file=sys.stderr)

        # Wait for deploy if code was pushed
        await wait_for_deploy(actions_taken, skip_wait=skip_deploy_wait)

        # Build URLs from written files
        live_urls = build_live_urls(written_files)

        # Clean response text (remove local paths that LLM might have included)
        response_text = clean_response_text(response_text)

        # Append URL info to response if we created any web pages
        if live_urls:
            url = live_urls[0]  # Just show the main URL
            url_section = f"\n\nHere's the link: {url}\n\nIt usually takes about 5 minutes for everything to go live, so grab a coffee or take a quick breather before clicking.\n\n— Amber"
            # Replace any existing sign-off
            response_text = re.sub(r'\n*—\s*Amber.*$', '', response_text, flags=re.IGNORECASE | re.DOTALL)
            response_text = response_text.strip() + url_section

        return {
            "response": response_text.strip(),
            "actions_taken": actions_taken,
            "tool_calls_count": tool_call_count,
            "written_files": written_files,
            "live_urls": live_urls,
        }

    except Exception as e:
        print(f"[Amber Agent] Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return {
            "response": f"I hit an error trying to do that: {str(e)[:300]}",
            "actions_taken": [],
            "tool_calls_count": 0,
            "error": str(e),
        }


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="Amber Email Agent")
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="JSON input with task, sender_email, subject, is_approved_request"
    )

    args = parser.parse_args()

    try:
        input_data = json.loads(args.input)
        task = input_data.get("task", "")
        sender_email = input_data.get("sender_email", "unknown")
        subject = input_data.get("subject", "")
        is_approved = input_data.get("is_approved_request", False)
        thinkhard = input_data.get("thinkhard", False)
        skip_deploy_wait = input_data.get("skip_deploy_wait", False)

        if not task:
            print(json.dumps({"error": "No task provided"}))
            sys.exit(1)

        result = asyncio.run(run_amber_task(
            task,
            sender_email,
            subject,
            is_approved,
            thinkhard,
            skip_deploy_wait
        ))

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
