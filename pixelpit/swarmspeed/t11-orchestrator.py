#!/usr/bin/env python3
"""
T11 HYPER-CASUAL GAME ORCHESTRATOR

Generates playable hyper-casual mobile games with scoreboards.

Pipeline:
  Phase 1: GENERATION - 10 agents build games in parallel (gpt-oss-20b)
  Phase 2: JUDGING - Claude Vision rates each game screenshot
  Phase 3: SELECTION - Dither picks the winner
  Phase 4: PRODUCTION - Opus polishes the winner

Usage:
  python t11-orchestrator.py

Output:
  web/public/pixelpit/swarm/t11/index.html      # Dashboard
  web/public/pixelpit/swarm/t11/game_N.html     # Games (0-9)
  web/public/pixelpit/swarm/t11/production/     # Final polished game
"""

import os
import sys
import json
import time
import base64
import asyncio
import subprocess
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Setup paths
REPO_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "t11"
SCREENSHOT_DIR = OUTPUT_DIR / "screenshots"
PRODUCTION_DIR = OUTPUT_DIR / "production"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)
PRODUCTION_DIR.mkdir(parents=True, exist_ok=True)

# Load environment
from dotenv import load_dotenv
env_path = REPO_ROOT / "sms-bot" / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
    print(f"[ENV] Loaded from {env_path}")

from together import Together
import anthropic

# Import our prompts
from prompts import (
    build_game_prompt,
    build_production_prompt,
    get_config_by_index,
    JUDGE_PROMPT,
    MECHANIC_SEEDS,
    VISUAL_THEMES,
    STYLE_TRAITS,
)

# Models
GENERATION_MODEL = "openai/gpt-oss-20b"  # Fast, cheap for prototypes
JUDGE_MODEL = "claude-sonnet-4-20250514"  # Vision for judging
SELECTION_MODEL = "claude-sonnet-4-20250514"  # Dither picks winner
PRODUCTION_MODEL = "claude-opus-4-5-20251101"  # Best model for production

NUM_AGENTS = 10
MAX_TOKENS = 4000  # Games need more tokens than simple reskins
SCREENSHOT_DELAY = 3  # Seconds to wait before screenshot
MAX_PRODUCTION_ITERATIONS = 8

STATUS_FILE = OUTPUT_DIR / "status.json"
status_lock = threading.Lock()

# =============================================================================
# MAKERS — The agents that build games
# =============================================================================

MAKERS = [
    {"name": "Amy", "avatar": "/pixelpit/amy.png"},
    {"name": "Bob", "avatar": "/pixelpit/bob.png"},
    {"name": "Chet", "avatar": "/pixelpit/chet.png"},
    {"name": "Dale", "avatar": "/pixelpit/dale.png"},
    {"name": "Earl", "avatar": "/pixelpit/earl.png"},
    {"name": "Fran", "avatar": "/pixelpit/fran.png"},
    {"name": "Gus", "avatar": "/pixelpit/gus.png"},
    {"name": "Hank", "avatar": "/pixelpit/hank.png"},
    {"name": "Ida", "avatar": "/pixelpit/ida.png"},
    {"name": "Joan", "avatar": "/pixelpit/joan.png"},
]

# =============================================================================
# STATUS MANAGEMENT
# =============================================================================

def init_status():
    """Initialize the status file."""
    status = {
        "started": datetime.now().isoformat(),
        "completed": None,
        "phase": "generation",
        "winner": None,
        "winner_reason": None,
        "production_status": None,
        "agents": []
    }

    # Initialize agents with their configs
    for i in range(NUM_AGENTS):
        config = get_config_by_index(i)
        status["agents"].append({
            "id": i,
            "maker": MAKERS[i]["name"],
            "avatar": MAKERS[i]["avatar"],
            "mechanic": config["mechanic"]["name"],
            "mechanic_desc": config["mechanic"]["desc"],
            "theme": config["theme"]["name"],
            "theme_colors": config["theme"]["colors"],
            "theme_bg": config["theme"]["bg"],
            "style": config["style"]["name"],
            "style_desc": config["style"]["desc"],
            "status": "pending",
            "time": None,
            "tokens": None,
            "url": None,
            "screenshot": None,
            "scores": None,
        })

    STATUS_FILE.write_text(json.dumps(status, indent=2))
    return status


def update_status(agent_id=None, updates=None, global_updates=None):
    """Update status file (thread-safe)."""
    with status_lock:
        status = json.loads(STATUS_FILE.read_text())
        if agent_id is not None and updates:
            status["agents"][agent_id].update(updates)
        if global_updates:
            status.update(global_updates)
        STATUS_FILE.write_text(json.dumps(status, indent=2))
        return status


# =============================================================================
# PHASE 1: GENERATION
# =============================================================================

def run_generation_agent(agent_id: int, client: Together) -> dict:
    """Generate a game using the prompt system."""
    maker = MAKERS[agent_id]
    config = get_config_by_index(agent_id)

    update_status(agent_id, {"status": "running"})

    # Build the prompt
    prompt = build_game_prompt(
        mechanic=config["mechanic"],
        theme=config["theme"],
        style=config["style"],
        maker_name=maker["name"],
        include_reference=True,
    )

    filename = f"game_{agent_id}.html"
    output_path = OUTPUT_DIR / filename

    print(f"[{maker['name']}] Starting: {config['mechanic']['name']} + {config['theme']['name']} + {config['style']['name']}")
    start_time = time.time()

    try:
        response = client.chat.completions.create(
            model=GENERATION_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=MAX_TOKENS,
            temperature=0.8,
        )

        content = response.choices[0].message.content

        # Extract HTML
        if "<!DOCTYPE" in content:
            html_start = content.find("<!DOCTYPE")
            html_end = content.rfind("</html>") + 7
            if html_end > html_start:
                content = content[html_start:html_end]
        elif "<html" in content:
            html_start = content.find("<html")
            html_end = content.rfind("</html>") + 7
            if html_end > html_start:
                content = content[html_start:html_end]

        output_path.write_text(content)

        elapsed = round(time.time() - start_time, 1)
        tokens = response.usage.completion_tokens if response.usage else 0

        print(f"[{maker['name']}] Built in {elapsed}s ({tokens} tokens)")

        update_status(agent_id, {
            "status": "done",
            "time": elapsed,
            "tokens": tokens,
            "url": filename,
        })

        return {"success": True, "agent_id": agent_id, "maker": maker["name"]}

    except Exception as e:
        print(f"[{maker['name']}] Error: {str(e)[:80]}")
        update_status(agent_id, {"status": "error"})
        return {"success": False, "agent_id": agent_id, "maker": maker["name"], "error": str(e)}


def run_generation_phase(together_client: Together):
    """Phase 1: Generate all games in parallel."""
    print("\n" + "=" * 60)
    print("PHASE 1: GENERATION")
    print("=" * 60 + "\n")

    with ThreadPoolExecutor(max_workers=NUM_AGENTS) as executor:
        futures = [executor.submit(run_generation_agent, i, together_client) for i in range(NUM_AGENTS)]
        for f in as_completed(futures):
            f.result()

    print("\n[Generation] All agents complete")


# =============================================================================
# PHASE 2: JUDGING
# =============================================================================

def take_screenshot(agent_id: int) -> str | None:
    """Take screenshot of a game using Puppeteer."""
    game_url = f"file://{OUTPUT_DIR}/game_{agent_id}.html"
    screenshot_path = SCREENSHOT_DIR / f"game_{agent_id}.png"

    # Puppeteer script - interact with the game a bit
    script = f'''
    const puppeteer = require('puppeteer');
    (async () => {{
        const browser = await puppeteer.launch({{ headless: true }});
        const page = await browser.newPage();
        await page.setViewport({{ width: 390, height: 844 }}); // iPhone 14 size
        await page.goto('{game_url}', {{ waitUntil: 'domcontentloaded' }});

        // Wait for game to initialize
        await new Promise(r => setTimeout(r, 1000));

        // Simulate some taps to start the game
        await page.mouse.click(195, 600);
        await new Promise(r => setTimeout(r, 500));
        await page.mouse.click(195, 500);
        await new Promise(r => setTimeout(r, 500));
        await page.mouse.click(150, 600);
        await new Promise(r => setTimeout(r, 500));
        await page.mouse.click(250, 600);

        // Wait for game action
        await new Promise(r => setTimeout(r, {SCREENSHOT_DELAY * 1000}));

        await page.screenshot({{ path: '{screenshot_path}' }});
        await browser.close();
    }})();
    '''

    try:
        result = subprocess.run(
            ['node', '-e', script],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=REPO_ROOT / "web"
        )
        if result.returncode == 0:
            return f"game_{agent_id}.png"
        return None
    except Exception as e:
        print(f"[Screenshot {agent_id}] Error: {str(e)[:50]}")
        return None


def judge_game(agent_id: int, client: anthropic.Anthropic) -> dict | None:
    """Judge a single game with Claude Vision."""
    screenshot_path = SCREENSHOT_DIR / f"game_{agent_id}.png"
    config = get_config_by_index(agent_id)

    if not screenshot_path.exists():
        return None

    with open(screenshot_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    prompt = f"""Rate this hyper-casual game screenshot.

Game type: {config['mechanic']['name']} — {config['mechanic']['desc']}
Theme: {config['theme']['name']}
Style: {config['style']['name']}

{JUDGE_PROMPT}"""

    try:
        response = client.messages.create(
            model=JUDGE_MODEL,
            max_tokens=300,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_data}},
                    {"type": "text", "text": prompt}
                ],
            }],
        )

        text = response.content[0].text
        scores = {"playable": 0, "mobile": 0, "polish": 0, "fun": 0, "verdict": "BROKEN"}

        for line in text.split("\n"):
            line = line.strip().upper()
            if line.startswith("PLAYABLE:"):
                try: scores["playable"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line.startswith("MOBILE:"):
                try: scores["mobile"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line.startswith("POLISH:"):
                try: scores["polish"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line.startswith("FUN:"):
                try: scores["fun"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line.startswith("VERDICT:"):
                v = line.split(":")[1].strip()
                if "SHIP" in v: scores["verdict"] = "SHIP"
                elif "NEEDS" in v or "WORK" in v: scores["verdict"] = "NEEDS_WORK"
                else: scores["verdict"] = "BROKEN"

        return scores
    except Exception as e:
        print(f"[Judge {agent_id}] Error: {str(e)[:50]}")
        return None


def run_judging_phase(anthropic_client: anthropic.Anthropic):
    """Phase 2: Screenshot and judge all games."""
    print("\n" + "=" * 60)
    print("PHASE 2: JUDGING")
    print("=" * 60 + "\n")

    update_status(global_updates={"phase": "judging"})

    status = json.loads(STATUS_FILE.read_text())

    for agent in status["agents"]:
        if agent["status"] != "done":
            continue

        agent_id = agent["id"]
        maker = MAKERS[agent_id]["name"]

        update_status(agent_id, {"status": "judging"})
        print(f"[Dither] Reviewing {maker}'s {agent['mechanic']}...")

        screenshot = take_screenshot(agent_id)
        if screenshot:
            update_status(agent_id, {"screenshot": screenshot})
            scores = judge_game(agent_id, anthropic_client)
            if scores:
                avg = (scores["playable"] + scores["mobile"] + scores["polish"] + scores["fun"]) / 4
                update_status(agent_id, {"scores": scores, "status": "done"})
                print(f"  -> P={scores['playable']} M={scores['mobile']} Po={scores['polish']} F={scores['fun']} (avg {avg:.1f}) = {scores['verdict']}")
            else:
                update_status(agent_id, {"status": "done"})
        else:
            update_status(agent_id, {"status": "done"})

    print("\n[Judging] Complete")


# =============================================================================
# PHASE 3: SELECTION
# =============================================================================

DITHER_SYSTEM_PROMPT = """You are Dither, Creative Head at Pixelpit game studio.

Your job: Pick ONE game to send to production.

Criteria (in order of importance):
1. PLAYABLE — Does it actually look like a working game? Score, player, objects?
2. FUN — Would someone tap this for 30 seconds? Does it look satisfying?
3. MOBILE — Would it work well on a phone screen?
4. POLISH — Is it visually appealing?

IMPORTANT: Pick the game that looks most FUN and PLAYABLE. A working simple game beats a broken ambitious one.

Reply with EXACTLY this format:
WINNER: [agent ID number]
REASON: [1-2 sentences explaining why this game wins]
"""


def run_selection_phase(anthropic_client: anthropic.Anthropic) -> int:
    """Phase 3: Dither reviews all games and picks winner."""
    print("\n" + "=" * 60)
    print("PHASE 3: SELECTION")
    print("=" * 60 + "\n")

    update_status(global_updates={"phase": "selection"})

    status = json.loads(STATUS_FILE.read_text())

    # Build content with all screenshots
    content = []
    context_lines = []

    for agent in status["agents"]:
        agent_id = agent["id"]
        screenshot_path = SCREENSHOT_DIR / f"game_{agent_id}.png"

        if screenshot_path.exists():
            with open(screenshot_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": image_data}
            })

        scores = agent.get("scores", {})
        context_lines.append(f"""
Game {agent_id}: {agent['mechanic']} by {agent['maker']} ({agent['style']})
Theme: {agent['theme']}
Scores: Playable={scores.get('playable', '?')}, Mobile={scores.get('mobile', '?')}, Polish={scores.get('polish', '?')}, Fun={scores.get('fun', '?')}
Verdict: {scores.get('verdict', 'UNKNOWN')}
""")

    content.append({
        "type": "text",
        "text": f"Here are {NUM_AGENTS} hyper-casual game prototypes:\n{''.join(context_lines)}\n\nReview all screenshots and pick the ONE with the best combination of playability and fun."
    })

    print("[Dither] Reviewing all games...")

    try:
        response = anthropic_client.messages.create(
            model=SELECTION_MODEL,
            system=DITHER_SYSTEM_PROMPT,
            max_tokens=300,
            messages=[{"role": "user", "content": content}],
        )

        text = response.content[0].text
        print(f"\n[Dither] Response:\n{text}\n")

        # Parse winner
        winner = 0
        reason = ""
        for line in text.split("\n"):
            line = line.strip()
            if line.upper().startswith("WINNER:"):
                try:
                    winner = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except:
                    pass
            elif line.upper().startswith("REASON:"):
                reason = line.split(":", 1)[1].strip()

        winner = max(0, min(NUM_AGENTS - 1, winner))

        update_status(global_updates={
            "winner": winner,
            "winner_reason": reason,
        })

        winner_agent = status["agents"][winner]
        print(f"[Dither] Selected: Game {winner} ({winner_agent['mechanic']} by {winner_agent['maker']})")
        print(f"[Dither] Reason: {reason}")

        return winner

    except Exception as e:
        print(f"[Selection] Error: {str(e)[:80]}")
        # Fallback: pick highest average score
        best = max(status["agents"], key=lambda a: sum([
            a.get("scores", {}).get("playable", 0),
            a.get("scores", {}).get("mobile", 0),
            a.get("scores", {}).get("polish", 0),
            a.get("scores", {}).get("fun", 0),
        ]))
        update_status(global_updates={"winner": best["id"], "winner_reason": "Fallback: highest score"})
        return best["id"]


# =============================================================================
# PHASE 4: PRODUCTION
# =============================================================================

async def run_production_phase(winner_id: int, anthropic_client: anthropic.Anthropic):
    """Phase 4: Polish the winning game."""
    print("\n" + "=" * 60)
    print("PHASE 4: PRODUCTION")
    print("=" * 60 + "\n")

    update_status(global_updates={"phase": "production", "production_status": "starting"})

    status = json.loads(STATUS_FILE.read_text())
    winner = status["agents"][winner_id]
    config = get_config_by_index(winner_id)

    prototype_path = OUTPUT_DIR / f"game_{winner_id}.html"
    prototype_code = prototype_path.read_text() if prototype_path.exists() else ""

    if not prototype_code:
        print("[Production] ERROR: No prototype code found")
        return

    # Import Agent SDK
    try:
        from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, tool, create_sdk_mcp_server
    except ImportError:
        print("[Production] ERROR: claude-agent-sdk not installed")
        print("  Run: pip install claude-agent-sdk==0.1.6")
        update_status(global_updates={"production_status": "error_no_sdk"})
        return

    iteration = [0]
    final_game = [None]

    # ==========================================================================
    # PRODUCTION TOOLS
    # ==========================================================================

    @tool(
        "save_and_test",
        "Save your HTML game code and get a visual test report. Returns feedback on whether the game looks playable.",
        {"html_code": str}
    )
    async def save_and_test_tool(args: dict) -> dict:
        """Save game, screenshot, analyze with vision."""
        iteration[0] += 1
        iter_num = iteration[0]

        html_code = args.get("html_code", "")
        game_path = PRODUCTION_DIR / f"iteration_{iter_num}.html"
        screenshot_path = PRODUCTION_DIR / f"iteration_{iter_num}.png"

        game_path.write_text(html_code)
        print(f"[Production] Iteration {iter_num}: Saved game")

        update_status(global_updates={"production_status": f"iteration_{iter_num}_testing"})

        # Take screenshot with interaction
        script = f'''
        const puppeteer = require('puppeteer');
        (async () => {{
            const browser = await puppeteer.launch({{ headless: true }});
            const page = await browser.newPage();
            await page.setViewport({{ width: 390, height: 844 }});
            await page.goto('file://{game_path}', {{ waitUntil: 'domcontentloaded' }});
            await new Promise(r => setTimeout(r, 1000));
            await page.mouse.click(195, 600);
            await new Promise(r => setTimeout(r, 500));
            await page.mouse.click(195, 500);
            await new Promise(r => setTimeout(r, 2000));
            await page.screenshot({{ path: '{screenshot_path}' }});
            await browser.close();
        }})();
        '''

        try:
            subprocess.run(['node', '-e', script], capture_output=True, timeout=30, cwd=REPO_ROOT / "web")
        except:
            pass

        # Analyze with vision
        if screenshot_path.exists():
            with open(screenshot_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")

            vision_prompt = f"""Analyze this hyper-casual game screenshot.

Game type: {config['mechanic']['name']}

Answer each with YES, NO, or PARTIAL:
1. SCORE_VISIBLE: Is there a score display on screen?
2. PLAYER_VISIBLE: Is there a clear player/character?
3. OBJECTS_VISIBLE: Are there game objects (enemies, collectibles, obstacles)?
4. GAME_ACTIVE: Does it look like the game is running (not frozen)?
5. MOBILE_FRIENDLY: Would the UI work on a phone?

Then provide:
6. SUGGESTIONS: What specific improvements would make this more fun to play?

Format each answer on its own line."""

            try:
                response = anthropic_client.messages.create(
                    model=JUDGE_MODEL,
                    max_tokens=500,
                    messages=[{
                        "role": "user",
                        "content": [
                            {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_data}},
                            {"type": "text", "text": vision_prompt}
                        ],
                    }],
                )
                feedback = response.content[0].text
                print(f"[Production] Iteration {iter_num}: Got feedback")
            except Exception as e:
                feedback = f"Error getting visual feedback: {str(e)[:50]}"
        else:
            feedback = "Could not take screenshot. Check if the HTML is valid."

        # Check if max iterations
        if iter_num >= MAX_PRODUCTION_ITERATIONS:
            final_path = PRODUCTION_DIR / "game.html"
            final_path.write_text(html_code)
            final_game[0] = str(final_path)
            update_status(global_updates={"production_status": "done_max_iterations"})
            print(f"[Production] Max iterations ({MAX_PRODUCTION_ITERATIONS}) reached.")

            return {
                "content": [{
                    "type": "text",
                    "text": f"=== TEST REPORT (Iteration {iter_num}) ===\n\n{feedback}\n\n⚠️ MAX ITERATIONS REACHED. Production auto-finished."
                }]
            }

        return {
            "content": [{
                "type": "text",
                "text": f"=== TEST REPORT (Iteration {iter_num}) ===\n\n{feedback}"
            }]
        }

    @tool(
        "finish_production",
        "Call when the game is production-ready. This finalizes the build.",
        {"confidence": str, "final_notes": str}
    )
    async def finish_production_tool(args: dict) -> dict:
        """Finalize production."""
        confidence = args.get("confidence", "medium")
        notes = args.get("final_notes", "")

        latest = PRODUCTION_DIR / f"iteration_{iteration[0]}.html"
        final_path = PRODUCTION_DIR / "game.html"

        if latest.exists():
            final_path.write_text(latest.read_text())
            final_game[0] = str(final_path)
            print(f"[Production] Finalized: {final_path}")

        update_status(global_updates={"production_status": f"done_{confidence}"})

        return {
            "content": [{
                "type": "text",
                "text": f"Production complete. Confidence: {confidence}. Game saved to {final_path}"
            }]
        }

    # ==========================================================================
    # RUN PRODUCTION AGENT
    # ==========================================================================

    server = create_sdk_mcp_server(
        name="production",
        version="1.0.0",
        tools=[save_and_test_tool, finish_production_tool]
    )

    options = ClaudeAgentOptions(
        model=PRODUCTION_MODEL,
        permission_mode="acceptEdits",
        mcp_servers={"prod": server},
        allowed_tools=[
            "mcp__prod__save_and_test",
            "mcp__prod__finish_production"
        ]
    )

    production_prompt = build_production_prompt(
        prototype_code=prototype_code,
        mechanic=config["mechanic"],
        theme=config["theme"],
        style=config["style"],
    )

    print(f"[Production] Starting build for: {winner['mechanic']} by {winner['maker']}")
    print(f"[Production] Model: {PRODUCTION_MODEL}")
    update_status(global_updates={"production_status": "building"})

    tool_calls = 0

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(production_prompt)

            async for message in client.receive_response():
                content = getattr(message, "content", None)
                if isinstance(content, list):
                    for block in content:
                        if type(block).__name__ == "ToolUseBlock":
                            tool_calls += 1
                            tool_name = getattr(block, "name", "unknown")
                            print(f"[Production] Tool: {tool_name}")

    except Exception as e:
        print(f"[Production] Error: {str(e)}")
        update_status(global_updates={"production_status": f"error: {str(e)[:50]}"})

    print(f"\n[Production] Complete. Tool calls: {tool_calls}, Iterations: {iteration[0]}")

    if final_game[0]:
        print(f"[Production] Final game: {final_game[0]}")


# =============================================================================
# DASHBOARD
# =============================================================================

def create_dashboard():
    """Create the T11 dashboard HTML."""
    html = '''<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>T11 — Hyper-Casual Game Swarm</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0; padding: 20px;
  background: #0a0a0f; color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
}
h1 { margin: 0 0 10px; font-size: 24px; color: #00ff88; }
.subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
.status { color: #888; margin-bottom: 20px; font-size: 14px; }
.status.generation { color: #ffaa00; }
.status.judging { color: #ff66aa; }
.status.selection { color: #00ddff; }
.status.production { color: #ff66aa; }
.status.done { color: #00ff88; }

.phase-bar {
  display: flex; gap: 0; margin-bottom: 20px;
  background: #111118; border-radius: 8px; overflow: hidden;
}
.phase {
  padding: 10px 20px; font-size: 11px;
  text-transform: uppercase; letter-spacing: 1px;
  color: #444; border-bottom: 2px solid transparent;
}
.phase.active { color: #00ff88; border-bottom-color: #00ff88; background: #0a0a0f; }
.phase.complete { color: #666; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  max-width: 1400px;
}

.card {
  background: #111118;
  border-radius: 12px;
  padding: 15px;
  border: 2px solid #222;
  cursor: pointer;
  transition: all 0.2s;
}
.card:hover { transform: translateY(-2px); border-color: #333; }
.card.winner { border-color: #00ff88 !important; box-shadow: 0 0 20px #00ff8833; }
.card.ship { border-color: #00ff8844; }
.card.needs-work { border-color: #ffaa0044; }
.card.broken { border-color: #ff446644; }

.card-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 10px;
}
.card-maker {
  display: flex; align-items: center; gap: 10px;
}
.avatar {
  width: 32px; height: 32px; border-radius: 50%;
  border: 2px solid #333;
}
.maker-name { font-weight: 600; }
.verdict {
  font-size: 10px; padding: 4px 8px;
  border-radius: 4px; font-weight: 600;
}
.verdict.ship { background: #00ff8833; color: #00ff88; }
.verdict.needs-work { background: #ffaa0033; color: #ffaa00; }
.verdict.broken { background: #ff446633; color: #ff4466; }

.card-info { font-size: 12px; color: #888; margin-bottom: 10px; }
.mechanic { color: #00ddff; font-weight: 600; }
.theme { color: #ff66aa; }
.style { color: #ffaa00; }

.scores {
  display: flex; gap: 8px; font-size: 11px;
  margin-bottom: 10px;
}
.score {
  background: #0a0a0f; padding: 3px 8px;
  border-radius: 4px; color: #888;
}
.score span { color: #fff; font-weight: 600; }

.screenshot {
  width: 100%; height: 150px;
  object-fit: cover; border-radius: 8px;
  background: #0a0a0f;
}

.card-status {
  font-size: 11px; color: #666;
  text-transform: uppercase; letter-spacing: 1px;
}
.card-status.running { color: #ffaa00; }
.card-status.judging { color: #ff66aa; }

.production-box {
  margin-top: 20px; padding: 20px;
  background: #111118; border: 2px solid #00ff8844;
  border-radius: 12px; max-width: 600px;
}
.production-box h3 {
  margin: 0 0 12px; font-size: 14px;
  color: #00ff88; text-transform: uppercase; letter-spacing: 1px;
}
.production-status { font-size: 13px; color: #888; }
.production-link {
  display: inline-block; margin-top: 12px;
  padding: 10px 20px; background: #00ff88;
  color: #000; text-decoration: none;
  border-radius: 6px; font-size: 13px; font-weight: 600;
}
.production-link:hover { background: #00dd77; }

.preview {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.95); display: none; z-index: 100;
}
.preview.active { display: flex; flex-direction: column; }
.preview-header {
  padding: 15px 20px; background: #1a1a2e;
  display: flex; justify-content: space-between; align-items: center;
}
.preview-title { font-weight: 600; }
.preview-close {
  background: #ff4466; border: none; color: #fff;
  padding: 8px 16px; border-radius: 6px; cursor: pointer;
}
.preview iframe { flex: 1; border: none; background: #000; }
</style>
</head>
<body>
<h1>T11 — Hyper-Casual Game Swarm</h1>
<div class="subtitle">10 agents building playable mobile games with scoreboards</div>
<div class="status" id="status">Loading...</div>

<div class="phase-bar">
  <div class="phase" id="phase-generation">1. Generation</div>
  <div class="phase" id="phase-judging">2. Judging</div>
  <div class="phase" id="phase-selection">3. Selection</div>
  <div class="phase" id="phase-production">4. Production</div>
</div>

<div class="grid" id="grid"></div>

<div class="production-box" id="production-box" style="display:none">
  <h3>🎮 Production Build</h3>
  <div class="production-status" id="production-status">Waiting...</div>
  <a class="production-link" id="production-link" href="#" style="display:none">PLAY FINAL GAME</a>
</div>

<div class="preview" id="preview">
  <div class="preview-header">
    <span class="preview-title" id="preview-title"></span>
    <button class="preview-close" onclick="closePreview()">Close</button>
  </div>
  <iframe id="preview-iframe"></iframe>
</div>

<script>
let lastData = null;

function getVerdictClass(v) {
  if (!v) return '';
  const verdict = v.toUpperCase();
  if (verdict.includes('SHIP')) return 'ship';
  if (verdict.includes('NEEDS') || verdict.includes('WORK')) return 'needs-work';
  return 'broken';
}

function renderCard(a, winnerId) {
  const isWinner = winnerId === a.id;
  const verdictClass = getVerdictClass(a.scores?.verdict);
  const scores = a.scores || {};

  return `
    <div class="card ${verdictClass} ${isWinner ? 'winner' : ''}" onclick="openPreview(${a.id})">
      <div class="card-header">
        <div class="card-maker">
          <img class="avatar" src="${a.avatar}" alt="${a.maker}">
          <span class="maker-name">${a.maker}</span>
        </div>
        ${scores.verdict ? `<span class="verdict ${verdictClass}">${scores.verdict}</span>` : ''}
      </div>
      <div class="card-info">
        <span class="mechanic">${a.mechanic}</span> ·
        <span class="theme">${a.theme}</span> ·
        <span class="style">${a.style}</span>
      </div>
      ${scores.playable !== undefined ? `
        <div class="scores">
          <span class="score">Play <span>${scores.playable}</span></span>
          <span class="score">Mobile <span>${scores.mobile}</span></span>
          <span class="score">Polish <span>${scores.polish}</span></span>
          <span class="score">Fun <span>${scores.fun}</span></span>
        </div>
      ` : ''}
      ${a.screenshot ? `<img class="screenshot" src="screenshots/${a.screenshot}">` : ''}
      ${!a.scores ? `<div class="card-status ${a.status}">${a.status}...</div>` : ''}
      ${isWinner ? '<div style="color:#00ff88;font-size:11px;margin-top:8px">★ WINNER</div>' : ''}
    </div>
  `;
}

function render(data) {
  const phase = data.phase;
  const done = data.agents.filter(a => a.scores).length;

  document.getElementById('status').className = 'status ' + phase;
  if (phase === 'done') {
    document.getElementById('status').textContent = '✓ Complete — ' + done + ' games judged';
  } else if (phase === 'production') {
    document.getElementById('status').textContent = '🏭 Production — polishing winner...';
  } else if (phase === 'selection') {
    document.getElementById('status').textContent = '🎯 Selection — picking winner...';
  } else if (phase === 'judging') {
    document.getElementById('status').textContent = '🔍 Judging — ' + done + '/10 rated';
  } else {
    const running = data.agents.filter(a => a.status === 'running').length;
    document.getElementById('status').textContent = '⚡ Generating — ' + running + ' agents building...';
  }

  // Phase bar
  ['generation', 'judging', 'selection', 'production'].forEach(p => {
    const el = document.getElementById('phase-' + p);
    el.className = 'phase';
    if (phase === p) el.classList.add('active');
    else if (['generation', 'judging', 'selection', 'production'].indexOf(p) < ['generation', 'judging', 'selection', 'production'].indexOf(phase)) {
      el.classList.add('complete');
    }
  });

  // Grid
  document.getElementById('grid').innerHTML = data.agents.map(a => renderCard(a, data.winner)).join('');

  // Production box
  const prodBox = document.getElementById('production-box');
  const prodStatus = document.getElementById('production-status');
  const prodLink = document.getElementById('production-link');

  if (data.winner !== null) {
    prodBox.style.display = 'block';
    const winner = data.agents[data.winner];

    if (data.production_status?.startsWith('done')) {
      prodStatus.textContent = 'Complete! ' + winner.mechanic + ' by ' + winner.maker;
      prodLink.style.display = 'inline-block';
      prodLink.href = 'production/game.html';
    } else if (data.production_status) {
      prodStatus.textContent = 'Building: ' + data.production_status;
    } else {
      prodStatus.textContent = 'Selected: ' + winner.mechanic + ' by ' + winner.maker + '. ' + (data.winner_reason || '');
    }
  }
}

function openPreview(id) {
  const a = lastData.agents[id];
  document.getElementById('preview-title').textContent = a.mechanic + ' by ' + a.maker;
  document.getElementById('preview-iframe').src = a.url || 'game_' + id + '.html';
  document.getElementById('preview').classList.add('active');
}

function closePreview() {
  document.getElementById('preview').classList.remove('active');
  document.getElementById('preview-iframe').src = '';
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closePreview(); });

async function poll() {
  try {
    const res = await fetch('status.json?' + Date.now());
    const data = await res.json();
    if (JSON.stringify(data) !== JSON.stringify(lastData)) {
      lastData = data;
      render(data);
    }
  } catch (e) {}
  setTimeout(poll, 500);
}

poll();
</script>
</body></html>'''

    (OUTPUT_DIR / "index.html").write_text(html)
    print(f"[Dashboard] http://localhost:3000/pixelpit/swarm/t11/index.html")


# =============================================================================
# MAIN
# =============================================================================

def main():
    together_key = os.environ.get("TOGETHER_API_KEY")
    anthropic_key = os.environ.get("ANTHROPIC_API_KEY")

    if not together_key:
        print("ERROR: TOGETHER_API_KEY not found")
        sys.exit(1)
    if not anthropic_key:
        print("ERROR: ANTHROPIC_API_KEY not found")
        sys.exit(1)

    together_client = Together(api_key=together_key)
    anthropic_client = anthropic.Anthropic(api_key=anthropic_key)

    print("=" * 60)
    print("T11 HYPER-CASUAL GAME ORCHESTRATOR")
    print("=" * 60)
    print(f"Phase 1: Generation ({GENERATION_MODEL})")
    print(f"Phase 2: Judging ({JUDGE_MODEL})")
    print(f"Phase 3: Selection ({SELECTION_MODEL})")
    print(f"Phase 4: Production ({PRODUCTION_MODEL})")
    print()

    create_dashboard()
    init_status()

    start_time = time.time()

    # Phase 1: Generation
    run_generation_phase(together_client)

    # Phase 2: Judging
    run_judging_phase(anthropic_client)

    # Phase 3: Selection
    winner_id = run_selection_phase(anthropic_client)

    # Phase 4: Production
    asyncio.run(run_production_phase(winner_id, anthropic_client))

    # Done
    update_status(global_updates={"completed": datetime.now().isoformat(), "phase": "done"})

    total_time = time.time() - start_time
    status = json.loads(STATUS_FILE.read_text())
    winner = status["agents"][winner_id]

    print()
    print("=" * 60)
    print(f"PIPELINE COMPLETE in {total_time:.1f}s")
    print(f"Winner: Game {winner_id} ({winner['mechanic']} by {winner['maker']})")
    print(f"Dashboard: http://localhost:3000/pixelpit/swarm/t11/index.html")
    print(f"Final game: http://localhost:3000/pixelpit/swarm/t11/production/game.html")
    print("=" * 60)


if __name__ == "__main__":
    main()
