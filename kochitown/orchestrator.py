#!/usr/bin/env python3
"""
Pixelpit Game Studio Orchestrator

Autonomous game-making agents using claude-agent-sdk.
Each agent has file write tools so they can actually create games.

Run locally: python orchestrator.py
Run test: python orchestrator.py --test

Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY environment variables
(or create kochitown/.env with these values)
"""

import os
import sys
import json
import time
import asyncio
import random
import argparse
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from pathlib import Path

# Load environment variables from sms-bot/.env.local
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent / "sms-bot" / ".env.local"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"[ENV] Loaded from {env_path}")
except ImportError:
    pass  # dotenv not installed, rely on system env vars

# Supabase client
from supabase import create_client, Client

# Claude Agent SDK (enables file writing)
from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, tool, create_sdk_mcp_server

# ============================================================================
# Configuration
# ============================================================================

# Paths
REPO_ROOT = Path(__file__).parent.parent
KOCHITOWN_PATH = Path(__file__).parent
GAMES_OUTPUT_PATH = REPO_ROOT / "web" / "app" / "kochitown"

OPERATING_HOURS = {
    "start": 8,   # 8 AM
    "end": 20,    # 8 PM
    "days": [0, 1, 2, 3, 4, 5],  # Monday-Saturday (0=Monday)
    # Sunday (6) excluded except for launch day
}

# How often to check for work (seconds)
TICK_INTERVAL = 30

# Max concurrent agent workers
MAX_WORKERS = 3

# Model to use for agents (Haiku for speed + cost)
AGENT_MODEL = "claude-3-5-haiku-20241022"

# Tools granted to game-making agents
AGENT_TOOLS = [
    "Read",
    "Write",
    "Edit",
    "Glob",
    "Grep",
]

# ============================================================================
# Database
# ============================================================================

def get_supabase() -> Client:
    """Get Supabase client from environment."""
    url = os.environ.get("SUPABASE_URL")
    # Support both naming conventions
    key = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("\n[ERROR] Missing environment variables!")
        print("Required: SUPABASE_URL, SUPABASE_SERVICE_KEY")
        print("Expected in: sms-bot/.env.local")
        print("")
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY required")
    return create_client(url, key)


def get_pending_tasks(supabase: Client) -> List[Dict[str, Any]]:
    """Get all pending tasks from the queue."""
    result = supabase.table("kochitown_state").select("*").eq("type", "task").execute()
    tasks = []
    for row in result.data:
        data = row.get("data", {})
        if data.get("status") == "pending":
            tasks.append({
                "key": row["key"],
                "assignee": data.get("assignee"),
                "description": data.get("description"),
                "game": data.get("game"),
                "acceptance": data.get("acceptance"),
                "round": data.get("round", 0),
                "data": data,
            })
    return tasks


def claim_task(supabase: Client, task_key: str) -> bool:
    """Mark a task as in_progress. Returns True if successful."""
    try:
        supabase.table("kochitown_state").update({
            "data": supabase.table("kochitown_state")
                .select("data")
                .eq("key", task_key)
                .single()
                .execute()
                .data["data"] | {"status": "in_progress", "claimed_at": datetime.now(timezone.utc).isoformat()}
        }).eq("type", "task").eq("key", task_key).execute()
        return True
    except Exception as e:
        print(f"[ERROR] Failed to claim task {task_key}: {e}")
        return False


def complete_task(supabase: Client, task_key: str, notes: str = "") -> bool:
    """Mark a task as done."""
    try:
        result = supabase.table("kochitown_state").select("data").eq("type", "task").eq("key", task_key).single().execute()
        data = result.data["data"]
        data["status"] = "done"
        data["completed_at"] = datetime.now(timezone.utc).isoformat()
        if notes:
            data["completion_notes"] = notes
        supabase.table("kochitown_state").update({"data": data}).eq("type", "task").eq("key", task_key).execute()
        return True
    except Exception as e:
        print(f"[ERROR] Failed to complete task {task_key}: {e}")
        return False


def block_task(supabase: Client, task_key: str, reason: str) -> bool:
    """Mark a task as blocked."""
    try:
        result = supabase.table("kochitown_state").select("data").eq("type", "task").eq("key", task_key).single().execute()
        data = result.data["data"]
        data["status"] = "blocked"
        data["blockers"] = data.get("blockers", []) + [reason]
        supabase.table("kochitown_state").update({"data": data}).eq("type", "task").eq("key", task_key).execute()
        return True
    except Exception as e:
        print(f"[ERROR] Failed to block task {task_key}: {e}")
        return False


def create_task(supabase: Client, description: str, assignee: str, game: Optional[str] = None, acceptance: Optional[str] = None, created_by: str = "orchestrator") -> str:
    """Create a new task. Returns task key."""
    # Get next task ID
    result = supabase.table("kochitown_state").select("key").eq("type", "task").execute()
    max_id = 0
    for row in result.data:
        try:
            task_num = int(row["key"].replace("task_", ""))
            max_id = max(max_id, task_num)
        except:
            pass

    new_key = f"task_{max_id + 1:03d}"

    data = {
        "description": description,
        "assignee": assignee,
        "status": "pending",
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if game:
        data["game"] = game
    if acceptance:
        data["acceptance"] = acceptance

    supabase.table("kochitown_state").insert({
        "type": "task",
        "key": new_key,
        "data": data,
    }).execute()

    return new_key


def log_activity(supabase: Client, actor: str, action: str, details: str, context: Optional[Dict] = None):
    """Log an activity to Supabase."""
    timestamp = datetime.now(timezone.utc)
    key = f"log_{timestamp.strftime('%Y%m%d_%H%M%S')}_{random.randint(100, 999)}"

    data = {
        "timestamp": timestamp.isoformat(),
        "actor": actor,
        "action": action,
        "details": details,
        "status": "done",  # Activity logs are immediately done
    }
    if context:
        data["context"] = context

    supabase.table("kochitown_state").insert({
        "type": "log",
        "key": key,
        "data": data,
    }).execute()


def get_agent_persona(supabase: Client, agent_id: str) -> Optional[Dict[str, Any]]:
    """Get agent info from Supabase."""
    try:
        result = supabase.table("kochitown_state").select("data").eq("type", "agent").eq("key", agent_id).single().execute()
        return result.data["data"]
    except:
        return None


# ============================================================================
# Agent Tools (MCP)
# ============================================================================

# Global supabase client for tools (set before running agent)
_supabase_client: Optional[Client] = None
_current_game: Optional[str] = None
_current_agent: Optional[str] = None


@tool(
    "update_game_status",
    "Update a game's status. Use when approving a game after QA.",
    {"game": str, "status": str}
)
async def update_game_status_tool(args: dict) -> dict:
    """Update game status in Supabase. Valid statuses: concept, prototype, playable, launched, dead"""
    global _supabase_client

    game = args.get("game", "").strip()
    status = args.get("status", "").strip()

    valid_statuses = ["concept", "prototype", "playable", "testing", "launched", "dead"]
    if status not in valid_statuses:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": f"Invalid status. Use: {valid_statuses}"})}]}

    if not game or not _supabase_client:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": "game required"})}]}

    try:
        # Get current game data
        result = _supabase_client.table("kochitown_state").select("data").eq("type", "game").eq("key", game).single().execute()
        data = result.data["data"]
        data["status"] = status

        # Update
        _supabase_client.table("kochitown_state").update({"data": data}).eq("type", "game").eq("key", game).execute()
        return {"content": [{"type": "text", "text": json.dumps({"success": True, "game": game, "status": status})}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": str(e)})}]}


_current_round: int = 0  # Track fix rounds for current game

@tool(
    "create_task",
    "Create a follow-up task for another agent. Use this after completing BUILD tasks to request testing.",
    {"assignee": str, "description": str}
)
async def create_task_tool(args: dict) -> dict:
    """Create a task in Supabase. Auto-routes to mayor after 2 QA rounds."""
    global _supabase_client, _current_game, _current_agent, _current_round

    assignee = args.get("assignee", "").strip().lower()
    description = args.get("description", "").strip()

    if not assignee:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": "assignee required"})}]}
    if not description:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": "description required"})}]}
    if not _supabase_client:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": "no database connection"})}]}

    # Track rounds: if this is a TEST task and we've had 2+ fix rounds, route to mayor
    is_test_task = assignee in ["mobile_tester", "desktop_tester"] or "[TEST]" in description.upper()
    is_fix_task = "[FIX]" in description.upper()

    # If tester is creating a FIX task, increment round
    new_round = _current_round
    if is_fix_task and _current_agent in ["mobile_tester", "desktop_tester"]:
        new_round = _current_round + 1

    # If builder is creating a TEST task after round 2, route to mayor instead
    if is_test_task and _current_round >= 2:
        assignee = "mayor"
        description = f"[REVIEW] {_current_game} ready after {_current_round} fix rounds. Approve for launch or kill."

    try:
        task_key = create_task(
            _supabase_client,
            description,
            assignee,
            game=_current_game,
            created_by=_current_agent or "agent",
        )

        # Store round in task data
        if new_round > 0 or _current_round > 0:
            result = _supabase_client.table("kochitown_state").select("data").eq("type", "task").eq("key", task_key).single().execute()
            data = result.data["data"]
            data["round"] = new_round
            _supabase_client.table("kochitown_state").update({"data": data}).eq("type", "task").eq("key", task_key).execute()

        return {"content": [{"type": "text", "text": json.dumps({"success": True, "task_key": task_key, "routed_to": assignee, "round": new_round})}]}
    except Exception as e:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": str(e)})}]}


def create_pixelpit_mcp_server():
    """Create MCP server with Pixelpit tools."""
    return create_sdk_mcp_server(
        name="pixelpit",
        version="1.0.0",
        tools=[create_task_tool, update_game_status_tool]
    )


# ============================================================================
# Agent Execution
# ============================================================================

def load_agent_prompt(agent_id: str) -> str:
    """Load agent's CLAUDE.md file for persona."""
    # Map agent IDs to folder paths
    agent_paths = {
        "mayor": "kochitown/mayor/CLAUDE.md",
        "m1": "kochitown/makers/m1/CLAUDE.md",
        "m2": "kochitown/makers/m2/CLAUDE.md",
        "m3": "kochitown/makers/m3/CLAUDE.md",
        "m4": "kochitown/makers/m4/CLAUDE.md",
        "m5": "kochitown/makers/m5/CLAUDE.md",
        "mobile_tester": "kochitown/testers/mobile/CLAUDE.md",
        "desktop_tester": "kochitown/testers/desktop/CLAUDE.md",
        "creative": "kochitown/creative/CLAUDE.md",
        "engineering": "kochitown/engineering/CLAUDE.md",
        "social": "kochitown/social/CLAUDE.md",
        "contentqa": "kochitown/contentqa/CLAUDE.md",
    }

    path = agent_paths.get(agent_id)
    if not path:
        return f"You are agent {agent_id} in the Kochitown Game Studio."

    # Try to find the file relative to this script
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    full_path = os.path.join(base_dir, path)

    if os.path.exists(full_path):
        with open(full_path, "r") as f:
            return f.read()

    return f"You are agent {agent_id} in the Kochitown Game Studio."


async def run_agent(agent_id: str, task: Dict[str, Any], supabase: Client, verbose: bool = False) -> Dict[str, Any]:
    """
    Run an agent on a task using claude-agent-sdk.

    The agent has file write tools and can actually create game code.

    Returns dict with:
      - success: bool
      - action: "completed" | "blocked" | "error"
      - notes: str
      - new_tasks: list of task dicts to create
      - files_written: list of files the agent created/modified
    """
    global _supabase_client, _current_game, _current_agent, _current_round

    # Set globals for MCP tools
    _supabase_client = supabase
    _current_game = task.get("game")
    _current_agent = agent_id
    _current_round = task.get("round", 0)

    # Load persona
    persona = load_agent_prompt(agent_id)

    # Determine working directory for the game
    game_id = task.get("game") or "scratch"
    game_path = GAMES_OUTPUT_PATH / game_id
    game_path.mkdir(parents=True, exist_ok=True)

    # Build the prompt
    prompt = f"""You are an agent in the Pixelpit Game Studio. Here is your persona and role:

{persona}

## Your Task

{task['description']}

{f"**Game:** {task['game']}" if task.get('game') else ""}
{f"**Acceptance Criteria:** {task['acceptance']}" if task.get('acceptance') else ""}

## Working Directory

You are working in: {game_path}

Game files go in `web/app/kochitown/{game_id}/page.tsx` (Next.js React page).

## Output Format

When finished, output your status:

- If successful: `TASK COMPLETED: [brief description of what you did]`
- If blocked: `TASK BLOCKED: [reason you cannot proceed]`

## REQUIRED: Follow-up Tasks

After completing a [BUILD] task, you MUST use the create_task tool:
```
create_task(assignee="mobile_tester", description="[TEST] Test [game name] on mobile and desktop")
```

After completing a [TEST] task with bugs found:
```
create_task(assignee="m1", description="[FIX] Fix [specific bug description]")
```

Valid assignees: m1, m2, m3, m4, m5, mobile_tester, desktop_tester

## Technical Guidelines

- Write React/TypeScript for Next.js (use 'use client' directive)
- Mobile-first: touch controls work, mouse is secondary
- Single file games: put everything in page.tsx unless it gets too large
- Use HTML5 Canvas or pure React - no external game engines
- Aim for 60fps

Now execute the task. Use the Write/Edit tools to create the actual game code.
"""

    # Create MCP server with Pixelpit tools (create_task)
    pixelpit_server = create_pixelpit_mcp_server()

    # Configure agent with file write capabilities + Pixelpit tools
    options = ClaudeAgentOptions(
        model=AGENT_MODEL,
        permission_mode="acceptEdits",  # Auto-accept file writes
        mcp_servers={"pixelpit": pixelpit_server},
        allowed_tools=AGENT_TOOLS + ["mcp__pixelpit__create_task", "mcp__pixelpit__update_game_status"],
        cwd=str(REPO_ROOT),  # Work from repo root so paths resolve correctly
    )

    result_text = ""
    files_written = []
    tool_calls = 0

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)

            async for message in client.receive_response():
                msg_type = type(message).__name__

                if verbose:
                    print(f"  [{agent_id}] {msg_type}")

                content = getattr(message, "content", None)
                if isinstance(content, list):
                    for block in content:
                        block_type = type(block).__name__

                        if block_type == "ToolUseBlock":
                            tool_name = getattr(block, "name", "unknown")
                            tool_calls += 1
                            if verbose:
                                print(f"  [{agent_id}] Tool: {tool_name}")

                            # Track file writes
                            if tool_name in ["Write", "Edit"]:
                                tool_input = getattr(block, "input", {})
                                file_path = tool_input.get("file_path", "")
                                if file_path:
                                    files_written.append(file_path)

                        elif block_type == "TextBlock":
                            text = getattr(block, "text", "")
                            if text:
                                result_text = text
                                if verbose:
                                    # Show last 200 chars
                                    print(f"  [{agent_id}] {text[-200:]}...")

        # Parse the response
        new_tasks = []
        action = "completed"
        notes = result_text

        if "TASK BLOCKED" in result_text.upper():
            action = "blocked"

        # Extract new tasks
        for line in result_text.split("\n"):
            if line.strip().upper().startswith("NEW TASK:"):
                # Parse "NEW TASK: [assignee] - [description]"
                task_text = line.split(":", 1)[1].strip()
                if " - " in task_text:
                    assignee, desc = task_text.split(" - ", 1)
                    new_tasks.append({
                        "assignee": assignee.strip().lower(),
                        "description": desc.strip(),
                    })

        return {
            "success": True,
            "action": action,
            "notes": notes[:1000],  # Truncate for storage
            "new_tasks": new_tasks,
            "files_written": files_written,
            "tool_calls": tool_calls,
        }

    except Exception as e:
        import traceback
        return {
            "success": False,
            "action": "error",
            "notes": f"{str(e)}\n{traceback.format_exc()}",
            "new_tasks": [],
            "files_written": [],
            "tool_calls": 0,
        }


# ============================================================================
# Orchestrator Loop
# ============================================================================

def is_operating_hours() -> bool:
    """Check if we're in operating hours."""
    now = datetime.now()

    # Check day (Monday=0, Sunday=6)
    if now.weekday() not in OPERATING_HOURS["days"]:
        # Allow Sunday for launch day (can be toggled)
        if os.environ.get("KOCHITOWN_ALLOW_SUNDAY") == "1":
            pass
        else:
            return False

    # Check time
    if now.hour < OPERATING_HOURS["start"] or now.hour >= OPERATING_HOURS["end"]:
        return False

    return True


async def tick(supabase: Client, verbose: bool = False):
    """One tick of the orchestrator."""

    # Get pending tasks
    tasks = get_pending_tasks(supabase)
    if not tasks:
        return

    # Group tasks by assignee
    tasks_by_agent: Dict[str, List[Dict]] = {}
    for task in tasks:
        assignee = task.get("assignee", "unknown")
        if assignee not in tasks_by_agent:
            tasks_by_agent[assignee] = []
        tasks_by_agent[assignee].append(task)

    print(f"[TICK] {len(tasks)} pending tasks across {len(tasks_by_agent)} agents")

    # Run agents concurrently (up to MAX_WORKERS)
    async_tasks = []
    task_info = []

    for agent_id, agent_tasks in tasks_by_agent.items():
        if len(async_tasks) >= MAX_WORKERS:
            break

        # Take the first pending task for each agent
        task = agent_tasks[0]

        print(f"[SPAWN] {agent_id} <- {task['description'][:50]}...")

        # Claim the task
        claim_task(supabase, task["key"])

        # Create async task
        async_tasks.append(run_agent(agent_id, task, supabase, verbose))
        task_info.append((agent_id, task))

    # Wait for all agents to complete
    results = await asyncio.gather(*async_tasks, return_exceptions=True)

    # Process results
    for i, result in enumerate(results):
        agent_id, task = task_info[i]

        if isinstance(result, Exception):
            block_task(supabase, task["key"], f"Exception: {str(result)}")
            print(f"[EXCEPTION] {agent_id} on {task['key']}: {result}")
            continue

        if result["success"]:
            files_info = f" (wrote {len(result.get('files_written', []))} files)" if result.get('files_written') else ""

            if result["action"] == "completed":
                complete_task(supabase, task["key"], result["notes"])
                log_activity(supabase, agent_id, "completed_task", f"{task['description'][:100]}{files_info}")
                print(f"[DONE] {agent_id} completed {task['key']}{files_info}")

                # Create any follow-up tasks
                for new_task in result.get("new_tasks", []):
                    new_key = create_task(
                        supabase,
                        new_task["description"],
                        new_task["assignee"],
                        game=task.get("game"),
                        created_by=agent_id,
                    )
                    print(f"[NEW TASK] {new_key} for {new_task['assignee']}")

            elif result["action"] == "blocked":
                block_task(supabase, task["key"], result["notes"][:500])
                log_activity(supabase, agent_id, "blocked_task", task["description"][:100])
                print(f"[BLOCKED] {agent_id} blocked on {task['key']}")
        else:
            block_task(supabase, task["key"], f"Error: {result['notes'][:500]}")
            print(f"[ERROR] {agent_id} failed on {task['key']}: {result['notes'][:100]}")


async def run_single_task(supabase: Client, verbose: bool = False) -> bool:
    """Run a single task for testing. Returns True if a task was found and run."""
    tasks = get_pending_tasks(supabase)
    if not tasks:
        print("[TEST] No pending tasks found")
        return False

    task = tasks[0]
    agent_id = task.get("assignee", "unknown")

    print(f"[TEST] Running single task: {task['key']}")
    print(f"[TEST] Agent: {agent_id}")
    print(f"[TEST] Description: {task['description'][:100]}...")

    # Claim and run
    claim_task(supabase, task["key"])
    result = await run_agent(agent_id, task, supabase, verbose)

    print(f"\n[TEST] Result: {result['action']}")
    print(f"[TEST] Tool calls: {result.get('tool_calls', 0)}")
    print(f"[TEST] Files written: {result.get('files_written', [])}")

    if result["success"]:
        if result["action"] == "completed":
            complete_task(supabase, task["key"], result["notes"])
            log_activity(supabase, agent_id, "completed_task", task["description"][:100])
            print(f"[TEST] Task completed successfully")
        else:
            block_task(supabase, task["key"], result["notes"][:500])
            print(f"[TEST] Task blocked: {result['notes'][:200]}")
    else:
        block_task(supabase, task["key"], f"Error: {result['notes'][:500]}")
        print(f"[TEST] Task failed: {result['notes'][:200]}")

    return True


async def main_loop(supabase: Client, verbose: bool = False):
    """Main orchestrator loop (async)."""
    # Log startup
    log_activity(supabase, "orchestrator", "startup", "Orchestrator started")

    try:
        while True:
            if is_operating_hours():
                try:
                    await tick(supabase, verbose)
                except Exception as e:
                    print(f"[ERROR] Tick failed: {e}")
                    import traceback
                    traceback.print_exc()
            else:
                print(f"[SLEEP] Outside operating hours ({datetime.now().strftime('%H:%M')})")

            await asyncio.sleep(TICK_INTERVAL)

    except KeyboardInterrupt:
        print("\n[SHUTDOWN] Orchestrator stopping...")
        log_activity(supabase, "orchestrator", "shutdown", "Orchestrator stopped (keyboard interrupt)")


def main():
    """Entry point with argument parsing."""
    parser = argparse.ArgumentParser(description="Pixelpit Game Studio Orchestrator")
    parser.add_argument("--test", action="store_true", help="Run a single task then exit (test mode)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed agent output")
    parser.add_argument("--force", action="store_true", help="Run outside operating hours")
    args = parser.parse_args()

    print("=" * 60)
    print("PIXELPIT GAME STUDIO ORCHESTRATOR")
    print("=" * 60)
    print(f"Model: {AGENT_MODEL}")
    print(f"Max workers: {MAX_WORKERS}")
    print(f"Games output: {GAMES_OUTPUT_PATH}")
    if not args.test:
        print(f"Tick interval: {TICK_INTERVAL}s")
        print(f"Operating hours: {OPERATING_HOURS['start']}:00 - {OPERATING_HOURS['end']}:00")
    print("=" * 60)

    # Allow running outside hours with --force
    if args.force:
        os.environ["KOCHITOWN_ALLOW_SUNDAY"] = "1"
        OPERATING_HOURS["start"] = 0
        OPERATING_HOURS["end"] = 24
        OPERATING_HOURS["days"] = [0, 1, 2, 3, 4, 5, 6]

    # Initialize
    supabase = get_supabase()

    if args.test:
        # Test mode: run single task
        print("[TEST MODE] Running single task...")
        result = asyncio.run(run_single_task(supabase, args.verbose))
        sys.exit(0 if result else 1)
    else:
        # Continuous mode
        asyncio.run(main_loop(supabase, args.verbose))


if __name__ == "__main__":
    main()
