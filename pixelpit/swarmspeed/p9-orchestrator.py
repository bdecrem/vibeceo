#!/usr/bin/env python3
"""
P9 PRODUCTION ORCHESTRATOR (Multi-Round)

Full pipeline from exploration to shipped game:
  Phase 1: EXPLORATION - Up to 3 rounds of 10 Makers each (gpt-oss-20b, parallel)
           Loops until 4+ viable games (SHIP/NEEDS_WORK) or max rounds hit
  Phase 2: SELECTION - Dither reviews ALL prototypes, picks winner (single API call)
  Phase 3: PRODUCTION - Production Builder creates real game (Opus 4.5 + Agent SDK)

Usage:
  python p9-orchestrator.py

Output:
  web/public/pixelpit/swarm/p9/index.html      # Dashboard
  web/public/pixelpit/swarm/p9/agent_N.html    # Prototypes (0-29)
  web/public/pixelpit/swarm/p9/production/     # Final game
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
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "p9"
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

# Models
EXPLORATION_MODEL = "openai/gpt-oss-20b"  # Fast, cheap for prototypes
JUDGE_MODEL = "claude-sonnet-4-20250514"   # Vision for judging
SELECTION_MODEL = "claude-sonnet-4-20250514"  # Dither picks winner
PRODUCTION_MODEL = "claude-opus-4-5-20251101"  # Best model for production

NUM_AGENTS = 10
MAX_TOKENS = 3000
SCREENSHOT_DELAY = 5
MIN_VIABLE_GAMES = 4  # Need at least this many SHIP or NEEDS_WORK before moving to selection
MAX_EXPLORATION_ROUNDS = 3  # Max rounds of 10 agents each
MAX_PRODUCTION_ITERATIONS = 10  # Auto-finish production after this many iterations

STATUS_FILE = OUTPUT_DIR / "status.json"
status_lock = threading.Lock()

# =============================================================================
# GAME CONFIG
# =============================================================================

REFERENCE_CODE = '''<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Catch Game</title>
<style>body{margin:0;background:#111;overflow:hidden;touch-action:none}canvas{display:block}</style>
</head><body><canvas id=c></canvas>
<script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
let W,H;function resize(){W=c.width=innerWidth;H=c.height=innerHeight}resize();onresize=resize;
let score=0,drops=[],paddle={x:W/2,w:80,h:20};
function spawn(){drops.push({x:Math.random()*(W-40)+20,y:-30,r:15,speed:2+Math.random()*2,color:'#44aaff'});}
function update(){
  drops.forEach(d=>d.y+=d.speed);
  drops=drops.filter(d=>{
    if(d.y>H-50&&d.y<H-20&&Math.abs(d.x-paddle.x)<paddle.w/2+d.r){score++;return false;}
    return d.y<H+50;
  });
  if(Math.random()<0.02)spawn();
}
function draw(){
  ctx.fillStyle='#111';ctx.fillRect(0,0,W,H);
  drops.forEach(d=>{ctx.fillStyle=d.color;ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#fff';ctx.fillRect(paddle.x-paddle.w/2,H-40,paddle.w,paddle.h);
  ctx.fillStyle='#fff';ctx.font='24px sans-serif';ctx.fillText('Score: '+score,20,40);
}
function move(x){paddle.x=Math.max(paddle.w/2,Math.min(W-paddle.w/2,x));}
c.onmousemove=e=>move(e.clientX);
c.ontouchmove=e=>{e.preventDefault();move(e.touches[0].clientX);};
c.ontouchstart=e=>{e.preventDefault();move(e.touches[0].clientX);};
function loop(){update();draw();requestAnimationFrame(loop)}loop();
</script></body></html>'''

MAKERS = [
    {"name": "AmyThe1st", "avatar": "/pixelpit/amy.png"},
    {"name": "BobThe2nd", "avatar": "/pixelpit/bob.png"},
    {"name": "ChetThe3rd", "avatar": "/pixelpit/chet.png"},
    {"name": "DaleThe4th", "avatar": "/pixelpit/dale.png"},
    {"name": "EarlThe5th", "avatar": "/pixelpit/earl.png"},
    {"name": "FranThe6th", "avatar": "/pixelpit/fran.png"},
    {"name": "GusThe7th", "avatar": "/pixelpit/gus.png"},
    {"name": "HankThe8th", "avatar": "/pixelpit/hank.png"},
    {"name": "IdaThe9th", "avatar": "/pixelpit/ida.png"},
    {"name": "JoanThe10th", "avatar": "/pixelpit/joan.png"},
]

TRAITS = [
    {"name": "SPARKLY", "desc": "Add particles, glitter, shine effects, twinkles on everything"},
    {"name": "SMOOTH", "desc": "Fluid animations, calm easing, gentle transitions, relaxed motion"},
    {"name": "CHAOTIC", "desc": "Unpredictable motion, wild effects, random sizes, energetic chaos"},
    {"name": "MINIMAL", "desc": "Clean and simple, few effects, precise shapes, lots of whitespace"},
    {"name": "RETRO", "desc": "Limited color palette, chunky pixels, nostalgic 8-bit feel"},
    {"name": "COLORFUL", "desc": "Bold saturated colors, gradients everywhere, rainbow accents"},
    {"name": "SOLID", "desc": "Thick shapes, sturdy forms, grounded weight, bold outlines"},
    {"name": "DETAILED", "desc": "Extra polish, small touches, subtle animations, refined edges"},
    {"name": "GLOWY", "desc": "Bloom effects, halos, luminescent objects, soft light trails"},
    {"name": "POLISHED", "desc": "Professional balance, complete feel, smooth UI, ship-ready quality"},
]

THEMES = [
    {"name": "RAINDROPS", "color": "#4488ff", "desc": "Blue rain falling into a wooden bucket"},
    {"name": "FALLING STARS", "color": "#ffdd44", "desc": "Golden shooting stars caught in a magic net"},
    {"name": "AUTUMN LEAVES", "color": "#ff6622", "desc": "Red and orange leaves drifting into a basket"},
    {"name": "GOLD COINS", "color": "#ffcc00", "desc": "Pirate treasure falling into a chest"},
    {"name": "SNOWFLAKES", "color": "#eeffff", "desc": "Delicate snow crystals caught on mittens"},
    {"name": "SUSHI DROP", "color": "#ff6b6b", "desc": "Sushi pieces falling onto a plate"},
    {"name": "MUSIC NOTES", "color": "#cc66ff", "desc": "Colorful notes falling into a speaker"},
    {"name": "GEMSTONES", "color": "#00ffaa", "desc": "Sparkling gems falling into a jewel box"},
    {"name": "LOVE HEARTS", "color": "#ff4488", "desc": "Floating hearts caught in a love jar"},
    {"name": "PIXEL FOOD", "color": "#88ff44", "desc": "8-bit burgers and fries into a lunchbox"},
]

# =============================================================================
# STATUS MANAGEMENT
# =============================================================================

def init_status():
    status = {
        "started": datetime.now().isoformat(),
        "completed": None,
        "phase": "exploration",
        "round": 0,
        "winner": None,
        "winner_reason": None,
        "production_status": None,
        "agents": []  # Will be populated as rounds progress
    }
    STATUS_FILE.write_text(json.dumps(status, indent=2))
    return status


def add_round_agents(round_num: int):
    """Add 10 new agents for a new exploration round."""
    with status_lock:
        status = json.loads(STATUS_FILE.read_text())
        base_id = round_num * NUM_AGENTS

        for i in range(NUM_AGENTS):
            agent_id = base_id + i
            status["agents"].append({
                "id": agent_id,
                "round": round_num,
                "maker": MAKERS[i]["name"],
                "avatar": MAKERS[i]["avatar"],
                "theme": THEMES[i]["name"],
                "color": THEMES[i]["color"],
                "desc": THEMES[i]["desc"],
                "trait": TRAITS[i]["name"],
                "trait_desc": TRAITS[i]["desc"],
                "status": "pending",
                "time": None,
                "tokens": None,
                "url": None,
                "screenshot": None,
                "scores": None,
            })

        status["round"] = round_num
        STATUS_FILE.write_text(json.dumps(status, indent=2))


def count_viable_games() -> int:
    """Count games that are SHIP or NEEDS_WORK."""
    status = json.loads(STATUS_FILE.read_text())
    viable = 0
    for agent in status["agents"]:
        verdict = agent.get("scores", {}).get("verdict", "")
        if verdict in ["SHIP", "NEEDS_WORK"]:
            viable += 1
    return viable


def update_status(agent_id=None, updates=None, global_updates=None):
    with status_lock:
        status = json.loads(STATUS_FILE.read_text())
        if agent_id is not None and updates:
            status["agents"][agent_id].update(updates)
        if global_updates:
            status.update(global_updates)
        STATUS_FILE.write_text(json.dumps(status, indent=2))
        return status


# =============================================================================
# PHASE 1: EXPLORATION
# =============================================================================

EXPLORATION_PROMPT = """Reskin this "catch falling objects" game with the theme and style below. Keep the EXACT same mechanics.

REFERENCE CODE:
```html
{reference}
```

THEME: {theme_name} — {theme_desc}
ARTIST STYLE: {trait_name} — {trait_desc}

Apply the THEME to what things look like (objects, catcher, background).
Apply the ARTIST STYLE to how things move and feel (effects, animations, polish level).

Change ONLY visuals: background, falling object appearance, paddle/catcher appearance, catch effects, score style.
Keep: spawn rate, fall speed, paddle movement, collision detection, scoring.

OUTPUT: Complete HTML file. No explanation. Start with <!DOCTYPE html>
"""


def run_exploration_agent(agent_id: int, client: Together) -> dict:
    """Phase 1: Single maker generates a prototype."""
    # agent_id is absolute (0, 1, ... 29), index into themes/makers is agent_id % 10
    index = agent_id % NUM_AGENTS
    maker = MAKERS[index]["name"]
    theme = THEMES[index]
    trait = TRAITS[index]
    update_status(agent_id, {"status": "running"})

    prompt = EXPLORATION_PROMPT.format(
        reference=REFERENCE_CODE,
        theme_name=theme["name"],
        theme_desc=theme["desc"],
        trait_name=trait["name"],
        trait_desc=trait["desc"],
    )

    filename = f"agent_{agent_id}.html"
    output_path = OUTPUT_DIR / filename

    round_num = agent_id // NUM_AGENTS
    round_label = f"R{round_num + 1}" if round_num > 0 else ""
    print(f"[{maker}]{round_label} Starting: {theme['name']} + {trait['name']}")
    start_time = time.time()

    try:
        response = client.chat.completions.create(
            model=EXPLORATION_MODEL,
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

        print(f"[{maker}]{round_label} Built in {elapsed}s")

        update_status(agent_id, {
            "status": "done",
            "time": elapsed,
            "tokens": tokens,
            "url": filename,
        })

        return {"success": True, "agent_id": agent_id, "maker": maker}

    except Exception as e:
        print(f"[{maker}]{round_label} Error: {str(e)[:80]}")
        update_status(agent_id, {"status": "error"})
        return {"success": False, "agent_id": agent_id, "maker": maker, "error": str(e)}


def take_screenshot(agent_id: int) -> str | None:
    """Take screenshot of a game using Puppeteer."""
    game_url = f"file://{OUTPUT_DIR}/agent_{agent_id}.html"
    screenshot_path = SCREENSHOT_DIR / f"agent_{agent_id}.png"

    script = f'''
    const puppeteer = require('puppeteer');
    (async () => {{
        const browser = await puppeteer.launch({{ headless: true }});
        const page = await browser.newPage();
        await page.setViewport({{ width: 400, height: 300 }});
        await page.goto('{game_url}', {{ waitUntil: 'domcontentloaded' }});
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
            return f"agent_{agent_id}.png"
        return None
    except:
        return None


def judge_game(agent_id: int, client: anthropic.Anthropic) -> dict | None:
    """Judge a single game with Claude Vision."""
    screenshot_path = SCREENSHOT_DIR / f"agent_{agent_id}.png"
    index = agent_id % NUM_AGENTS
    theme = THEMES[index]

    if not screenshot_path.exists():
        return None

    with open(screenshot_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    prompt = f"""Rate this game screenshot. Theme: "{theme['name']}" ({theme['desc']}).

Score 1-10:
- ALIVE: Visible activity/movement? (1=blank, 10=lots happening)
- THEME: Matches "{theme['name']}"? (1=wrong, 10=perfect)
- POLISH: Visual quality? (1=ugly, 10=polished)

Verdict: SHIP (avg>=7), NEEDS_WORK (avg 4-6), BROKEN (avg<4)

Format:
ALIVE: [score]
THEME: [score]
POLISH: [score]
VERDICT: [SHIP/NEEDS_WORK/BROKEN]"""

    try:
        response = client.messages.create(
            model=JUDGE_MODEL,
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_data}},
                    {"type": "text", "text": prompt}
                ],
            }],
        )

        text = response.content[0].text
        scores = {"alive": 0, "theme": 0, "polish": 0, "verdict": "BROKEN"}

        for line in text.split("\n"):
            line = line.strip().upper()
            if line.startswith("ALIVE:"):
                try: scores["alive"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line.startswith("THEME:"):
                try: scores["theme"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line.startswith("POLISH:"):
                try: scores["polish"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
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


def run_exploration_phase(together_client: Together, anthropic_client: anthropic.Anthropic):
    """Phase 1: Generate and judge prototypes. Loops until MIN_VIABLE_GAMES reached or MAX_ROUNDS hit."""
    print("\n" + "=" * 60)
    print("PHASE 1: EXPLORATION")
    print("=" * 60 + "\n")

    for round_num in range(MAX_EXPLORATION_ROUNDS):
        # Add agents for this round
        add_round_agents(round_num)
        base_id = round_num * NUM_AGENTS

        # Generate in parallel
        round_label = f"Round {round_num + 1}/{MAX_EXPLORATION_ROUNDS}"
        print(f"[{round_label}] Generating 10 prototypes...\n")

        with ThreadPoolExecutor(max_workers=NUM_AGENTS) as executor:
            agent_ids = list(range(base_id, base_id + NUM_AGENTS))
            futures = [executor.submit(run_exploration_agent, aid, together_client) for aid in agent_ids]
            for f in as_completed(futures):
                f.result()

        # Judge this round's prototypes
        print(f"\n[{round_label}] Judging prototypes...\n")
        update_status(global_updates={"phase": "judging"})

        status = json.loads(STATUS_FILE.read_text())
        # Only judge agents from this round that are done
        to_judge = [a for a in status["agents"] if a["id"] >= base_id and a["status"] == "done" and not a.get("scores")]

        for agent in to_judge:
            agent_id = agent["id"]
            index = agent_id % NUM_AGENTS
            maker = MAKERS[index]["name"]
            theme = THEMES[index]

            update_status(agent_id, {"status": "judging"})
            print(f"[Dither] Reviewing {maker}'s {theme['name']}...")

            screenshot = take_screenshot(agent_id)
            if screenshot:
                update_status(agent_id, {"screenshot": screenshot})
                scores = judge_game(agent_id, anthropic_client)
                if scores:
                    update_status(agent_id, {"scores": scores, "status": "done"})
                    print(f"  -> A={scores['alive']} T={scores['theme']} P={scores['polish']} = {scores['verdict']}")
                else:
                    update_status(agent_id, {"status": "done"})
            else:
                update_status(agent_id, {"status": "done"})

        # Check if we have enough viable games
        viable = count_viable_games()
        total = (round_num + 1) * NUM_AGENTS
        print(f"\n[{round_label}] Viable games: {viable}/{total} (need {MIN_VIABLE_GAMES})")

        if viable >= MIN_VIABLE_GAMES:
            print(f"[Exploration] Sufficient viable games. Moving to selection.\n")
            break
        elif round_num < MAX_EXPLORATION_ROUNDS - 1:
            print(f"[Exploration] Not enough viable games. Starting another round...\n")
        else:
            print(f"[Exploration] Max rounds reached. Proceeding with {viable} viable games.\n")


# =============================================================================
# PHASE 2: SELECTION
# =============================================================================

DITHER_SYSTEM_PROMPT = """You are Dither, Creative Head at Pixelpit game studio.

Your job: Pick ONE prototype to send to production.

Criteria (in order of importance):
1. SPARK — Does it have something special? A vibe? Even broken games can have the best ideas.
2. POTENTIAL — Can this become a great game with polish? Look for ambitious attempts.
3. THEME — Does the visual match the assigned theme?

IMPORTANT: Don't just pick the highest scores. BROKEN games often have the boldest, most creative ideas — they just failed execution. A broken game with spark is better than a boring game that works.

Reply with EXACTLY this format:
WINNER: [agent ID number]
REASON: [1-2 sentences explaining why this prototype has the most potential]
"""


def run_selection_phase(anthropic_client: anthropic.Anthropic) -> int:
    """Phase 2: Dither reviews all 10 and picks winner."""
    print("\n" + "=" * 60)
    print("PHASE 2: SELECTION")
    print("=" * 60 + "\n")

    update_status(global_updates={"phase": "selection"})

    status = json.loads(STATUS_FILE.read_text())

    # Build content with all screenshots and context
    content = []
    context_lines = []

    for agent in status["agents"]:
        agent_id = agent["id"]
        screenshot_path = SCREENSHOT_DIR / f"agent_{agent_id}.png"

        # Add screenshot if exists
        if screenshot_path.exists():
            with open(screenshot_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")
            content.append({
                "type": "image",
                "source": {"type": "base64", "media_type": "image/png", "data": image_data}
            })

        # Add context
        scores = agent.get("scores", {})
        context_lines.append(f"""
Game {agent_id}: {agent['theme']} by {agent['maker']} ({agent['trait']})
Scores: Alive={scores.get('alive', '?')}, Theme={scores.get('theme', '?')}, Polish={scores.get('polish', '?')}
Verdict: {scores.get('verdict', 'UNKNOWN')}
""")

    # Add text summary
    content.append({
        "type": "text",
        "text": f"Here are 10 prototypes for a 'catch falling objects' game:\n{''.join(context_lines)}\n\nReview all screenshots and pick the ONE with the most potential for production."
    })

    print("[Dither] Reviewing all 10 prototypes...")

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

        # Clamp to valid agent ID range
        max_agent_id = len(status["agents"]) - 1
        winner = max(0, min(max_agent_id, winner))

        update_status(global_updates={
            "winner": winner,
            "winner_reason": reason,
        })

        winner_index = winner % NUM_AGENTS
        winner_theme = THEMES[winner_index]["name"]
        winner_maker = MAKERS[winner_index]["name"]
        print(f"[Dither] Selected: Game {winner} ({winner_theme} by {winner_maker})")
        print(f"[Dither] Reason: {reason}")

        return winner

    except Exception as e:
        print(f"[Selection] Error: {str(e)[:80]}")
        # Fallback: pick highest-scoring
        best = max(status["agents"], key=lambda a: sum([
            a.get("scores", {}).get("alive", 0),
            a.get("scores", {}).get("theme", 0),
            a.get("scores", {}).get("polish", 0),
        ]))
        update_status(global_updates={"winner": best["id"], "winner_reason": "Fallback: highest score"})
        return best["id"]


# =============================================================================
# PHASE 3: PRODUCTION (Claude Agent SDK)
# =============================================================================

async def run_production_phase(winner_id: int, anthropic_client: anthropic.Anthropic):
    """Phase 3: Production Builder creates the real game."""
    print("\n" + "=" * 60)
    print("PHASE 3: PRODUCTION")
    print("=" * 60 + "\n")

    update_status(global_updates={"phase": "production", "production_status": "starting"})

    status = json.loads(STATUS_FILE.read_text())
    # Find winner by ID (not list index)
    winner = next((a for a in status["agents"] if a["id"] == winner_id), None)
    if not winner:
        print(f"[Production] ERROR: Winner ID {winner_id} not found")
        return

    prototype_path = OUTPUT_DIR / f"agent_{winner_id}.html"
    prototype_code = prototype_path.read_text() if prototype_path.exists() else REFERENCE_CODE

    # Import Agent SDK
    try:
        from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, tool, create_sdk_mcp_server
    except ImportError:
        print("[Production] ERROR: claude-agent-sdk not installed")
        print("  Run: pip install claude-agent-sdk==0.1.6")
        update_status(global_updates={"production_status": "error_no_sdk"})
        return

    # Track iterations
    iteration = [0]
    final_game = [None]

    # ==========================================================================
    # PRODUCTION TOOLS
    # ==========================================================================

    @tool(
        "save_and_test",
        "Save your HTML game code and get a visual test report. Returns feedback on: visual_activity, has_catcher, has_falling_objects, theme_match, and suggestions.",
        {"html_code": str}
    )
    async def save_and_test_tool(args: dict) -> dict:
        """Save game, screenshot, analyze with vision."""
        iteration[0] += 1
        iter_num = iteration[0]

        html_code = args.get("html_code", "")
        game_path = PRODUCTION_DIR / f"iteration_{iter_num}.html"
        screenshot_path = PRODUCTION_DIR / f"iteration_{iter_num}.png"

        # Save HTML
        game_path.write_text(html_code)
        print(f"[Production] Iteration {iter_num}: Saved game")

        update_status(global_updates={"production_status": f"iteration_{iter_num}_testing"})

        # Take screenshot
        script = f'''
        const puppeteer = require('puppeteer');
        (async () => {{
            const browser = await puppeteer.launch({{ headless: true }});
            const page = await browser.newPage();
            await page.setViewport({{ width: 400, height: 600 }});
            await page.goto('file://{game_path}', {{ waitUntil: 'domcontentloaded' }});
            await new Promise(r => setTimeout(r, 5000));
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

            vision_prompt = f"""Analyze this game screenshot. Theme: "{winner['theme']}" ({winner['desc']}).

Answer each with YES, NO, or PARTIAL plus brief explanation:
1. VISUAL_ACTIVITY: Is there visible movement/animation?
2. HAS_CATCHER: Is there a paddle/bucket/catcher at the bottom?
3. FALLING_OBJECTS: Are objects falling from the top?
4. THEME_MATCH: Does it look like "{winner['theme']}"?
5. MOBILE_READY: Would this work well on a phone screen?

Then provide:
6. SUGGESTIONS: What specific improvements would make this production-ready?

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

        # Check if we've hit max iterations
        if iter_num >= MAX_PRODUCTION_ITERATIONS:
            # Auto-finish: copy current iteration as final
            final_path = PRODUCTION_DIR / "game.html"
            final_path.write_text(html_code)
            final_game[0] = str(final_path)
            update_status(global_updates={"production_status": "done_max_iterations"})
            print(f"[Production] Max iterations ({MAX_PRODUCTION_ITERATIONS}) reached. Auto-finishing.")

            return {
                "content": [{
                    "type": "text",
                    "text": f"=== TEST REPORT (Iteration {iter_num}) ===\n\n{feedback}\n\n⚠️ MAX ITERATIONS REACHED ({MAX_PRODUCTION_ITERATIONS}). Production auto-finished. Your game has been saved as the final version."
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

        # Copy latest iteration as final
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
    # RUN AGENT
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

    production_prompt = f"""You are the Production Builder at Pixelpit game studio.

Your job: Take this rough prototype and make it into a polished, production-ready game.

## PROTOTYPE INFO
Theme: {winner['theme']} — {winner['desc']}
Style: {winner['trait']} — {winner['trait_desc']}
Maker: {winner['maker']}

## PROTOTYPE CODE
```html
{prototype_code}
```

## YOUR MISSION
1. Start by improving the prototype code
2. Use save_and_test to check your work visually
3. Read the feedback carefully and fix any issues
4. Iterate until you have a polished game that:
   - Has smooth, visible animations
   - Clearly matches the "{winner['theme']}" theme
   - Works well on mobile (touch controls)
   - Has satisfying catch feedback (particles, sounds, score pop)
   - Looks professional and polished
5. Call finish_production when ready

Focus on QUALITY over speed. Take 3-5 iterations if needed. Make it beautiful.
"""

    print(f"[Production] Starting build for: {winner['theme']} by {winner['maker']}")
    print(f"[Production] Model: {PRODUCTION_MODEL}")
    update_status(global_updates={"production_status": "building"})

    tool_calls = 0

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(production_prompt)

            async for message in client.receive_response():
                msg_type = type(message).__name__

                # Check for tool calls
                content = getattr(message, "content", None)
                if isinstance(content, list):
                    for block in content:
                        if type(block).__name__ == "ToolUseBlock":
                            tool_calls += 1
                            tool_name = getattr(block, "name", "unknown")
                            print(f"[Production] Tool: {tool_name}")

                # Check for text output
                if msg_type == "AssistantMessage" and content:
                    for block in content:
                        if type(block).__name__ == "TextBlock":
                            text = getattr(block, "text", "")
                            if text and len(text) > 50:
                                print(f"[Production] Agent: {text[:100]}...")

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
    """Create the P9 dashboard HTML - T7 triage style with profile pics."""
    html = '''<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>P9 Production Pipeline (Multi-Round)</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0; padding: 20px;
  background: #0a0a0f; color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  min-height: 100vh;
}
h1 { margin: 0 0 10px; font-size: 24px; color: #00ff88; }
.status { color: #888; margin-bottom: 20px; font-size: 14px; }
.status.exploration { color: #ffaa00; }
.status.judging { color: #ff66aa; }
.status.selection { color: #00ddff; }
.status.production { color: #ff66aa; }
.status.done { color: #00ff88; }

.phase-bar {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  background: #111118;
  border-radius: 8px;
  overflow: hidden;
}
.phase {
  padding: 10px 20px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #444;
  border-bottom: 2px solid transparent;
}
.phase.active { color: #00ff88; border-bottom-color: #00ff88; background: #0a0a0f; }
.phase.done { color: #666; }

.triage {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 20px;
  max-width: 1400px;
}
.column {
  background: #111118;
  border-radius: 12px;
  padding: 15px;
  min-height: 400px;
}
.column h2 {
  margin: 0 0 15px;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 2px;
  padding-bottom: 10px;
  border-bottom: 2px solid;
}
.column.green h2 { color: #00ff88; border-color: #00ff88; }
.column.yellow h2 { color: #ffaa00; border-color: #ffaa00; }
.column.red h2 { color: #ff4466; border-color: #ff4466; }

.cards { display: flex; flex-direction: column; gap: 10px; }

.card {
  background: #1a1a2e;
  border-radius: 10px;
  padding: 12px;
  border: 2px solid #333;
  cursor: pointer;
  transition: all 0.2s;
}
.card:hover { transform: translateX(5px); }
.card.winner {
  border-color: #00ff88 !important;
  box-shadow: 0 0 15px #00ff8844;
}
.card.winner::before {
  content: "★ WINNER";
  display: block;
  font-size: 9px;
  color: #00ff88;
  margin-bottom: 6px;
  letter-spacing: 1px;
  font-weight: 600;
}

.column.green .card { border-color: #00ff8844; }
.column.yellow .card { border-color: #ffaa0044; }
.column.red .card { border-color: #ff446644; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.card-name { font-weight: 600; font-size: 12px; }
.card-round {
  font-size: 9px;
  color: #666;
  background: #0a0a0f;
  padding: 2px 6px;
  border-radius: 3px;
}
.card-maker {
  font-size: 10px;
  color: #888;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.maker-info {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
.maker-avatar {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid #333;
  transition: all 0.15s;
}
.maker-info:hover .maker-avatar {
  border-color: #00ff88;
  transform: scale(1.1);
}
.maker-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.maker-name {
  transition: color 0.15s;
}
.maker-info:hover .maker-name {
  color: #00ff88;
}

/* Hover card */
.maker-hover-card {
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 8px;
  background: #1a1a2e;
  border: 2px solid #00ff88;
  border-radius: 12px;
  padding: 14px;
  width: 220px;
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: all 0.2s ease;
  z-index: 50;
  box-shadow: 0 8px 32px rgba(0, 255, 136, 0.15);
  pointer-events: none;
}
.maker-info:hover .maker-hover-card {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.hover-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}
.hover-card-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid #00ff88;
}
.hover-card-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}
.hover-card-role {
  font-size: 10px;
  color: #00ff88;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.hover-card-trait {
  font-size: 11px;
  color: #888;
  line-height: 1.4;
  padding-top: 10px;
  border-top: 1px solid #333;
}
.hover-card-trait strong {
  color: #ffaa00;
  font-weight: 600;
}

.scores {
  display: flex;
  gap: 8px;
  font-size: 10px;
  color: #888;
}
.score { background: #0f0f1a; padding: 2px 6px; border-radius: 3px; }

.screenshot-thumb {
  width: 100%;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  margin-top: 8px;
  opacity: 0.7;
}

/* Pending area */
.pending-area {
  margin-bottom: 20px;
  padding: 15px;
  background: #111118;
  border-radius: 12px;
}
.pending-area h3 {
  margin: 0 0 10px;
  font-size: 12px;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.pending-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.pending-chip {
  background: #1a1a2e;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;
  color: #666;
  border: 1px solid #333;
}
.pending-chip.running {
  color: #ffaa00;
  border-color: #ffaa00;
  animation: pulse 1s infinite;
}
.pending-chip.judging {
  color: #ff66aa;
  border-color: #ff66aa;
}
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Production box */
.production-box {
  margin-top: 20px;
  padding: 20px;
  background: #111118;
  border: 2px solid #00ff8844;
  border-radius: 12px;
}
.production-box h3 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #00ff88;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.production-status { font-size: 13px; color: #888; }
.production-link {
  display: inline-block;
  margin-top: 12px;
  padding: 10px 20px;
  background: #00ff88;
  color: #000;
  text-decoration: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}
.production-link:hover { background: #00dd77; }

.preview {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.95);
  display: none;
  z-index: 100;
}
.preview.active { display: flex; flex-direction: column; }
.preview-header {
  padding: 15px 20px;
  background: #1a1a2e;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 15px;
}
.preview-title { font-weight: 600; }
.preview-btn {
  background: #333;
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.preview-btn.close { background: #ff4466; }
.preview iframe {
  flex: 1;
  border: none;
  background: #000;
}
</style>
</head>
<body>
<h1>P9 — Multi-Round Production Pipeline</h1>
<div class="status" id="status">Loading...</div>

<div class="phase-bar">
  <div class="phase" id="phase-exploration">1. Exploration</div>
  <div class="phase" id="phase-selection">2. Selection</div>
  <div class="phase" id="phase-production">3. Production</div>
</div>

<div class="pending-area" id="pending-area" style="display:none">
  <h3>In Progress</h3>
  <div class="pending-grid" id="pending-grid"></div>
</div>

<div class="triage">
  <div class="column green">
    <h2>Ship</h2>
    <div class="cards" id="green-cards"></div>
  </div>
  <div class="column yellow">
    <h2>Needs Work</h2>
    <div class="cards" id="yellow-cards"></div>
  </div>
  <div class="column red">
    <h2>Broken</h2>
    <div class="cards" id="red-cards"></div>
  </div>
</div>

<div class="production-box" id="production-box" style="display:none">
  <h3>Production Build</h3>
  <div class="production-status" id="production-status">Waiting for selection...</div>
  <a class="production-link" id="production-link" href="#" style="display:none">Play Final Game</a>
</div>

<div class="preview" id="preview">
  <div class="preview-header">
    <span class="preview-title" id="preview-title"></span>
    <button class="preview-btn close" onclick="closePreview()">Close</button>
  </div>
  <iframe id="preview-iframe"></iframe>
</div>

<script>
const statusEl = document.getElementById('status');
const pendingArea = document.getElementById('pending-area');
const pendingGrid = document.getElementById('pending-grid');
const greenCards = document.getElementById('green-cards');
const yellowCards = document.getElementById('yellow-cards');
const redCards = document.getElementById('red-cards');
let lastData = null;

function getVerdict(a) {
  if (!a.scores) return null;
  const v = a.scores.verdict?.toUpperCase() || '';
  if (v.includes('SHIP')) return 'green';
  if (v.includes('NEEDS') || v.includes('WORK')) return 'yellow';
  return 'red';
}

function renderCard(a, winnerId) {
  const isWinner = winnerId === a.id;
  const roundLabel = a.round > 0 ? `R${a.round + 1}` : '';
  return `
    <div class="card ${isWinner ? 'winner' : ''}" onclick="openPreview(${a.id})">
      <div class="card-header">
        <span class="card-name">${a.theme}</span>
        ${roundLabel ? `<span class="card-round">${roundLabel}</span>` : ''}
      </div>
      <div class="card-maker">
        <div class="maker-info" onclick="event.stopPropagation()">
          <div class="maker-avatar">
            <img src="${a.avatar}" alt="${a.maker}" />
          </div>
          <span class="maker-name">${a.maker}</span>
          <div class="maker-hover-card">
            <div class="hover-card-header">
              <img class="hover-card-avatar" src="${a.avatar}" alt="${a.maker}" />
              <div>
                <div class="hover-card-name">${a.maker}</div>
                <div class="hover-card-role">Maker</div>
              </div>
            </div>
            <div class="hover-card-trait">
              <strong>${a.trait}:</strong> ${a.trait_desc}
            </div>
          </div>
        </div>
        <span style="color:#666">· <em>${a.trait}</em></span>
      </div>
      ${a.scores ? `
        <div class="scores">
          <span class="score">A:${a.scores.alive}</span>
          <span class="score">T:${a.scores.theme}</span>
          <span class="score">P:${a.scores.polish}</span>
        </div>
      ` : ''}
      ${a.screenshot ? `<img class="screenshot-thumb" src="screenshots/${a.screenshot}" />` : ''}
    </div>
  `;
}

function render(data) {
  // Status line
  const phase = data.phase;
  const total = data.agents.length;
  const judged = data.agents.filter(a => a.scores).length;
  const viable = data.agents.filter(a => {
    const v = a.scores?.verdict?.toUpperCase() || '';
    return v.includes('SHIP') || v.includes('NEEDS') || v.includes('WORK');
  }).length;

  statusEl.className = 'status ' + phase;
  if (phase === 'done') {
    statusEl.textContent = `✓ Complete — ${total} prototypes, ${viable} viable`;
  } else if (phase === 'production') {
    statusEl.textContent = `🏭 Production — building final game...`;
  } else if (phase === 'selection') {
    statusEl.textContent = `🎯 Selection — Dither choosing winner...`;
  } else if (phase === 'judging') {
    statusEl.textContent = `🔍 Judging — ${judged}/${total} rated`;
  } else {
    const round = (data.round || 0) + 1;
    statusEl.textContent = `⟳ Exploration Round ${round} — generating prototypes...`;
  }

  // Phase bar
  document.getElementById('phase-exploration').className = 'phase ' +
    (phase === 'exploration' || phase === 'judging' ? 'active' : 'done');
  document.getElementById('phase-selection').className = 'phase ' +
    (phase === 'selection' ? 'active' : (data.winner !== null ? 'done' : ''));
  document.getElementById('phase-production').className = 'phase ' +
    (phase === 'production' ? 'active' : (data.production_status?.startsWith('done') ? 'done' : ''));

  // Pending chips
  const pending = data.agents.filter(a => !a.scores);
  if (pending.length > 0) {
    pendingArea.style.display = 'block';
    pendingGrid.innerHTML = pending.map(a => {
      let cls = 'pending-chip';
      let label = a.maker;
      const roundLabel = a.round > 0 ? ` (R${a.round + 1})` : '';
      if (a.status === 'running') { cls += ' running'; label += ' (building)' + roundLabel; }
      else if (a.status === 'judging') { cls += ' judging'; label += ' (judging)' + roundLabel; }
      else { label += roundLabel; }
      return `<div class="${cls}">${label}</div>`;
    }).join('');
  } else {
    pendingArea.style.display = 'none';
  }

  // Triage columns
  const greens = data.agents.filter(a => getVerdict(a) === 'green');
  const yellows = data.agents.filter(a => getVerdict(a) === 'yellow');
  const reds = data.agents.filter(a => getVerdict(a) === 'red');

  greenCards.innerHTML = greens.map(a => renderCard(a, data.winner)).join('');
  yellowCards.innerHTML = yellows.map(a => renderCard(a, data.winner)).join('');
  redCards.innerHTML = reds.map(a => renderCard(a, data.winner)).join('');

  // Production box
  const prodBox = document.getElementById('production-box');
  const prodStatus = document.getElementById('production-status');
  const prodLink = document.getElementById('production-link');

  if (data.winner !== null) {
    prodBox.style.display = 'block';
    const winner = data.agents.find(a => a.id === data.winner);

    if (data.production_status?.startsWith('done')) {
      prodStatus.textContent = `Complete! Built ${winner?.theme} by ${winner?.maker}`;
      prodLink.style.display = 'inline-block';
      prodLink.href = 'production/game.html';
    } else if (data.production_status) {
      prodStatus.textContent = `Building: ${data.production_status}`;
    } else {
      prodStatus.textContent = `Selected: ${winner?.theme} by ${winner?.maker}. ${data.winner_reason || ''}`;
    }
  }
}

function openPreview(id) {
  const a = lastData.agents.find(agent => agent.id === id);
  if (!a) return;
  document.getElementById('preview-title').textContent = a.theme + ' by ' + a.maker;
  document.getElementById('preview-iframe').src = a.url || `agent_${id}.html`;
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
    print(f"[Dashboard] http://localhost:3000/pixelpit/swarm/p9/index.html")


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
    print("P9 PRODUCTION ORCHESTRATOR")
    print("=" * 60)
    print(f"Phase 1: Exploration ({EXPLORATION_MODEL})")
    print(f"Phase 2: Selection ({SELECTION_MODEL})")
    print(f"Phase 3: Production ({PRODUCTION_MODEL})")
    print()

    create_dashboard()
    init_status()

    start_time = time.time()

    # Phase 1: Exploration
    run_exploration_phase(together_client, anthropic_client)

    # Phase 2: Selection
    winner_id = run_selection_phase(anthropic_client)

    # Phase 3: Production
    asyncio.run(run_production_phase(winner_id, anthropic_client))

    # Done
    update_status(global_updates={"completed": datetime.now().isoformat(), "phase": "done"})

    total_time = time.time() - start_time
    print()
    print("=" * 60)
    print(f"PIPELINE COMPLETE in {total_time:.1f}s")
    print(f"Winner: Game {winner_id} ({THEMES[winner_id % NUM_AGENTS]['name']})")
    print(f"Dashboard: http://localhost:3000/pixelpit/swarm/p9/index.html")
    print(f"Final game: http://localhost:3000/pixelpit/swarm/p9/production/game.html")
    print("=" * 60)


if __name__ == "__main__":
    main()
