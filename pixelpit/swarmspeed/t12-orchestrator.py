#!/usr/bin/env python3
"""
T12 FIREFLY REINTERPRETATION SWARM

Takes Amber's FIREFLY game and creates 10 arcade-style reinterpretations.

Each agent gets:
  1. The original FIREFLY code as reference
  2. A specific "twist" direction
  3. Instructions to make it MORE fun/playful/arcade-like

Pipeline:
  Phase 1: GENERATION - 10 agents reinterpret FIREFLY (gpt-oss-20b)
  Phase 2: JUDGING - Claude Vision rates each game screenshot
  Phase 3: SELECTION - Dither picks the winner
  Phase 4: PRODUCTION - Opus polishes the winner

Usage:
  python t12-orchestrator.py

Output:
  web/public/pixelpit/swarm/t12/index.html      # Dashboard
  web/public/pixelpit/swarm/t12/game_N.html     # Games (0-9)
  web/public/pixelpit/swarm/t12/production/     # Final polished game
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
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "t12"
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
GENERATION_MODEL = "openai/gpt-oss-20b"
JUDGE_MODEL = "claude-sonnet-4-20250514"
SELECTION_MODEL = "claude-sonnet-4-20250514"
PRODUCTION_MODEL = "claude-opus-4-5-20251101"

NUM_AGENTS = 10
MAX_TOKENS = 8000  # More tokens for full game rewrites
SCREENSHOT_DELAY = 4  # Seconds to let game run before screenshot
MAX_PRODUCTION_ITERATIONS = 8

STATUS_FILE = OUTPUT_DIR / "status.json"
status_lock = threading.Lock()

# =============================================================================
# THE 10 FIREFLY TWISTS
# =============================================================================

TWISTS = [
    {
        "id": "chain_combo",
        "name": "CHAIN COMBO",
        "tagline": "Build massive combos",
        "desc": """Catch multiple glowing fireflies in quick succession for multipliers.
Each catch within 1 second of the last increases your combo: 2x, 3x, 4x, 5x...
Miss once or wait too long, combo resets to 1x.
Display combo counter prominently. Make combo breaks feel devastating.
High combos should feel AMAZING - screen effects, sounds, the works.""",
        "color": "#00ff88",
    },
    {
        "id": "color_match",
        "name": "COLOR MATCH",
        "tagline": "Match the target color",
        "desc": """Multiple colored fireflies (red, blue, green, yellow).
A TARGET COLOR indicator at the top shows which color to catch.
Tap the matching color = points. Tap wrong color = lose life.
Target color changes every 5-8 seconds with a warning flash.
Bonus points for catching the exact moment the color changes.""",
        "color": "#ff6b6b",
    },
    {
        "id": "size_hunt",
        "name": "SIZE HUNT",
        "tagline": "Bigger risk, bigger reward",
        "desc": """Fireflies come in 3 sizes: Tiny, Medium, Large.
Tiny = 1 point, always glowing, easy to catch.
Medium = 3 points, normal glow cycle.
Large = 5 points, but glows for only a brief moment - blink and you miss it.
Risk/reward: go for the big ones or play it safe?""",
        "color": "#ffd700",
    },
    {
        "id": "gravity_fall",
        "name": "GRAVITY FALL",
        "tagline": "Catch before they drop",
        "desc": """Fireflies spawn at the top and FALL downward.
Catch them before they hit the bottom of the screen.
Each one that escapes = lose a life.
Speed increases over time. Some fall faster than others.
Add a "danger zone" glow at the bottom when one is about to escape.""",
        "color": "#ff4466",
    },
    {
        "id": "hold_charge",
        "name": "HOLD TO CHARGE",
        "tagline": "Timing is everything",
        "desc": """Instead of tap, HOLD your finger on a firefly.
A charge meter fills up while you hold.
Release at PEAK charge (when fully glowing) = max points.
Release too early = partial points. Hold too long = it escapes and you lose a life.
The sweet spot window gets smaller as difficulty increases.""",
        "color": "#a855f7",
    },
    {
        "id": "swarm_drag",
        "name": "SWARM DRAG",
        "tagline": "Sweep through the swarm",
        "desc": """LOTS of tiny fireflies everywhere (20-30 on screen).
Drag your finger through them to catch many at once.
Glowing ones = points. Dark ones = damage.
Leave a trail effect as you drag. Satisfying swoosh sounds.
Combo based on how many you catch in a single drag.""",
        "color": "#00ddff",
    },
    {
        "id": "zone_score",
        "name": "ZONE MULTIPLIER",
        "tagline": "Position is power",
        "desc": """Screen divided into zones with different multipliers.
Center zone = 1x, middle ring = 2x, outer edges = 3x.
OR: Moving "hot zones" that give bonus points.
Fireflies drift around - wait for them to enter good zones.
Visual indicators showing zone boundaries and current multipliers.""",
        "color": "#f97316",
    },
    {
        "id": "rhythm_tap",
        "name": "RHYTHM FIREFLY",
        "tagline": "Feel the beat",
        "desc": """Fireflies pulse to a steady beat (around 120 BPM).
Tap exactly ON the beat = PERFECT (full points).
Slightly off = GOOD (partial points).
Way off = MISS (lose life).
Show a beat indicator. Play a rhythmic backing track.
Chain perfect taps for bonus multiplier.""",
        "color": "#ec4899",
    },
    {
        "id": "predator_mode",
        "name": "PREDATOR HUNT",
        "tagline": "Protect the swarm",
        "desc": """Red "hunter" fireflies spawn and chase the golden ones.
Tap hunters to destroy them before they catch the good fireflies.
If a hunter catches a firefly, you lose points.
Hunters get faster and more numerous over time.
Good fireflies you save = bonus points at end.""",
        "color": "#ef4444",
    },
    {
        "id": "powerup_chaos",
        "name": "POWER-UP FRENZY",
        "tagline": "Catch the power",
        "desc": """Special rainbow/sparkly fireflies grant temporary powers:
- SLOW-MO: Everything slows for 3 seconds
- MAGNET: Nearby fireflies auto-caught for 3 seconds
- SHIELD: Can't lose lives for 3 seconds
- 2X POINTS: Double points for 5 seconds
- BOMB: Catches ALL currently glowing fireflies
Make power-ups feel impactful with visual/audio effects.""",
        "color": "#8b5cf6",
    },
]

# =============================================================================
# MAKERS
# =============================================================================

MAKERS = [
    {"name": "Amy", "avatar": "/pixelpit/avatars/amy.png"},
    {"name": "Bob", "avatar": "/pixelpit/avatars/bob.png"},
    {"name": "Chet", "avatar": "/pixelpit/avatars/chet.png"},
    {"name": "Dale", "avatar": "/pixelpit/avatars/dale.png"},
    {"name": "Earl", "avatar": "/pixelpit/avatars/earl.png"},
    {"name": "Fran", "avatar": "/pixelpit/avatars/fran.png"},
    {"name": "Gus", "avatar": "/pixelpit/avatars/gus.png"},
    {"name": "Hank", "avatar": "/pixelpit/avatars/hank.png"},
    {"name": "Ida", "avatar": "/pixelpit/avatars/ida.png"},
    {"name": "Joan", "avatar": "/pixelpit/avatars/joan.png"},
]

# =============================================================================
# FIREFLY SOURCE CODE (Reference for agents)
# =============================================================================

FIREFLY_SOURCE = Path(REPO_ROOT / "web" / "public" / "amber" / "firefly.html").read_text()

# =============================================================================
# PROMPTS
# =============================================================================

def build_reinterpret_prompt(twist: dict, maker_name: str) -> str:
    """Build the prompt for a FIREFLY reinterpretation."""
    return f"""You are {maker_name}, a game developer at Pixelpit studio.

## YOUR MISSION

Take this FIREFLY game and create an arcade-style REINTERPRETATION with a specific twist.

---

## THE ORIGINAL GAME: FIREFLY

Here's Amber's original FIREFLY game. Study it to understand the vibe:
- Tap floating fireflies, but ONLY when they're glowing
- Tap while NOT glowing = lose a life
- 30 seconds, 5 lives, high score tracking
- Cozy/magical aesthetic with music and particles

```html
{FIREFLY_SOURCE}
```

---

## YOUR TWIST: {twist['name']}

**{twist['tagline']}**

{twist['desc']}

---

## REQUIREMENTS

Your reinterpretation MUST have:

### 1. PLAYABLE
- Working game loop with clear win/lose conditions
- The core mechanic from your twist fully implemented
- Instant start — tap to begin, no complex menus

### 2. SCOREBOARD
- Score displayed during gameplay
- Final score on game over screen
- High score saved to localStorage

### 3. MOBILE-FIRST
- Touch controls ONLY (tap, hold, or drag based on your twist)
- Touch targets at least 44px
- Works on phone screens (390x844 viewport)

### 4. ARCADE FEEL
- Make it MORE energetic than the original
- Satisfying feedback on every action (sound + visual)
- Difficulty that ramps up
- That "one more try" feeling

### 5. KEEP THE MAGIC
- Dark background with glowing elements
- Particle effects
- Web Audio for sounds
- Smooth 60fps animation

---

## COLOR PALETTE

Primary accent for your twist: {twist['color']}
Keep the dark background (#0a0a12 or similar)
Gold/amber (#D4A574, #FFD700) for fireflies
Use your accent color for UI and special effects

---

## OUTPUT

Return a COMPLETE, WORKING HTML file.
- Single file with all CSS and JS inline
- No external dependencies
- Start with <!DOCTYPE html>, end with </html>

**Make it FUN. Make it ADDICTIVE. Make someone want to beat their high score.**
"""


def build_judge_prompt(twist: dict) -> str:
    """Build the judge prompt for a specific twist."""
    return f"""Rate this FIREFLY reinterpretation screenshot.

This game's twist: **{twist['name']}** — {twist['tagline']}
Expected mechanic: {twist['desc'][:200]}...

Score 1-10 for each:
- TWIST_IMPLEMENTED: Does it show the specific twist mechanic? (combo counter, colors, zones, etc.)
- PLAYABLE: Does it look like a working game with score and gameplay elements?
- ARCADE_FEEL: Does it feel energetic and fun? Good feedback and effects?
- POLISH: Visual quality, particles, glow effects?

Verdict:
- SHIP (avg >= 7) — Ready for players
- NEEDS_WORK (avg 4-6) — Has potential, needs polish
- BROKEN (avg < 4) — Twist not implemented or game broken

Format:
TWIST_IMPLEMENTED: [score]
PLAYABLE: [score]
ARCADE_FEEL: [score]
POLISH: [score]
VERDICT: [SHIP/NEEDS_WORK/BROKEN]
NOTES: [One sentence on what works or what's missing]
"""


def build_production_prompt(prototype_code: str, twist: dict) -> str:
    """Build the production polish prompt."""
    return f"""You are the Production Builder at Pixelpit studio.

## YOUR MISSION

Polish this FIREFLY reinterpretation into a production-ready arcade game.

## THE TWIST: {twist['name']}

{twist['tagline']}

{twist['desc']}

## PROTOTYPE CODE

```html
{prototype_code}
```

## PRODUCTION CHECKLIST

### Must Have
- [ ] The twist mechanic works perfectly
- [ ] Score displayed during gameplay
- [ ] Game over screen with final score
- [ ] Restart button that works
- [ ] High score saved to localStorage
- [ ] Touch controls (no keyboard required)
- [ ] Smooth 60fps animation

### Should Have
- [ ] Difficulty increases over time
- [ ] Visual feedback on every action (particles, flash, shake)
- [ ] Audio feedback (Web Audio API — tones on actions)
- [ ] The twist mechanic has clear visual indicators

### Nice to Have
- [ ] Screen shake on important moments
- [ ] Combo/chain visual effects
- [ ] Progressive difficulty curve
- [ ] Satisfying game over animation

## TECHNICAL REQUIREMENTS

1. **Mobile Audio**: Create AudioContext on first user tap
2. **Touch Events**: Prevent default to stop scrolling
3. **Viewport**: Include mobile viewport meta tag
4. **High Score**: Save to localStorage with key 'firefly-{twist['id']}-high'

## OUTPUT

Return the polished, production-ready HTML file.
Focus on making the TWIST feel satisfying and the game feel ADDICTIVE.
"""


# =============================================================================
# STATUS MANAGEMENT
# =============================================================================

def init_status():
    """Initialize the status file."""
    status = {
        "started": datetime.now().isoformat(),
        "completed": None,
        "phase": "generation",
        "base_game": "FIREFLY by Amber",
        "winner": None,
        "winner_reason": None,
        "production_status": None,
        "agents": []
    }

    for i in range(NUM_AGENTS):
        twist = TWISTS[i]
        status["agents"].append({
            "id": i,
            "maker": MAKERS[i]["name"],
            "avatar": MAKERS[i]["avatar"],
            "twist_id": twist["id"],
            "twist_name": twist["name"],
            "twist_tagline": twist["tagline"],
            "twist_desc": twist["desc"].split('\n')[0][:150],  # First line, truncated
            "twist_color": twist["color"],
            "status": "pending",
            "time": None,
            "tokens": None,
            "url": None,
            "screenshot": None,
            "scores": None,
            "notes": None,
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
    """Generate a FIREFLY reinterpretation."""
    maker = MAKERS[agent_id]
    twist = TWISTS[agent_id]

    update_status(agent_id, {"status": "running"})

    prompt = build_reinterpret_prompt(twist, maker["name"])

    filename = f"game_{agent_id}.html"
    output_path = OUTPUT_DIR / filename

    print(f"[{maker['name']}] Starting: {twist['name']} — {twist['tagline']}")
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

        print(f"[{maker['name']}] Built {twist['name']} in {elapsed}s ({tokens} tokens)")

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
        return {"success": False, "agent_id": agent_id, "error": str(e)}


def run_generation_phase(together_client: Together):
    """Phase 1: Generate all reinterpretations in parallel."""
    print("\n" + "=" * 60)
    print("PHASE 1: GENERATION — 10 FIREFLY Reinterpretations")
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
    game_path = OUTPUT_DIR / f"game_{agent_id}.html"
    game_url = f"file://{game_path}"
    screenshot_path = SCREENSHOT_DIR / f"game_{agent_id}.png"

    script = f'''
    const puppeteer = require('puppeteer');
    (async () => {{
        const browser = await puppeteer.launch({{ headless: true }});
        const page = await browser.newPage();
        await page.setViewport({{ width: 390, height: 844 }});
        await page.goto('{game_url}', {{ waitUntil: 'domcontentloaded' }});

        // Wait for initial load
        await new Promise(r => setTimeout(r, 1000));

        // Try to start the game (click start button or tap screen)
        try {{
            await page.click('button');
        }} catch (e) {{
            await page.mouse.click(195, 422);
        }}

        // Wait for game to run
        await new Promise(r => setTimeout(r, 500));

        // Simulate some gameplay taps
        for (let i = 0; i < 5; i++) {{
            await page.mouse.click(100 + Math.random() * 190, 200 + Math.random() * 400);
            await new Promise(r => setTimeout(r, 300));
        }}

        // Wait for effects
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
    twist = TWISTS[agent_id]

    if not screenshot_path.exists():
        return None

    with open(screenshot_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    prompt = build_judge_prompt(twist)

    try:
        response = client.messages.create(
            model=JUDGE_MODEL,
            max_tokens=400,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": "image/png", "data": image_data}},
                    {"type": "text", "text": prompt}
                ],
            }],
        )

        text = response.content[0].text
        scores = {"twist": 0, "playable": 0, "arcade": 0, "polish": 0, "verdict": "BROKEN"}
        notes = ""

        for line in text.split("\n"):
            line_upper = line.strip().upper()
            if line_upper.startswith("TWIST"):
                try: scores["twist"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line_upper.startswith("PLAYABLE"):
                try: scores["playable"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line_upper.startswith("ARCADE"):
                try: scores["arcade"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line_upper.startswith("POLISH"):
                try: scores["polish"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except: pass
            elif line_upper.startswith("VERDICT"):
                v = line.split(":")[1].strip().upper()
                if "SHIP" in v: scores["verdict"] = "SHIP"
                elif "NEEDS" in v or "WORK" in v: scores["verdict"] = "NEEDS_WORK"
                else: scores["verdict"] = "BROKEN"
            elif line_upper.startswith("NOTES"):
                notes = line.split(":", 1)[1].strip() if ":" in line else ""

        return {"scores": scores, "notes": notes}
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
        twist = TWISTS[agent_id]

        update_status(agent_id, {"status": "judging"})
        print(f"[Dither] Reviewing {twist['name']}...")

        screenshot = take_screenshot(agent_id)
        if screenshot:
            update_status(agent_id, {"screenshot": screenshot})
            result = judge_game(agent_id, anthropic_client)
            if result:
                scores = result["scores"]
                avg = (scores["twist"] + scores["playable"] + scores["arcade"] + scores["polish"]) / 4
                update_status(agent_id, {"scores": scores, "notes": result["notes"], "status": "done"})
                print(f"  -> T={scores['twist']} P={scores['playable']} A={scores['arcade']} Po={scores['polish']} (avg {avg:.1f}) = {scores['verdict']}")
            else:
                update_status(agent_id, {"status": "done"})
        else:
            update_status(agent_id, {"status": "done"})

    print("\n[Judging] Complete")


# =============================================================================
# PHASE 3: SELECTION
# =============================================================================

DITHER_SYSTEM_PROMPT = """You are Dither, Creative Head at Pixelpit game studio.

You're reviewing 10 reinterpretations of FIREFLY, each with a unique twist.

Your job: Pick the ONE game that best combines:
1. TWIST EXECUTION — Did they actually implement their assigned mechanic well?
2. FUN FACTOR — Does it look addictive and satisfying?
3. ARCADE FEEL — Is it more energetic than the original?
4. POLISH — Visual quality, effects, juice?

Pick the game that would make someone say "one more try!"

Reply with EXACTLY this format:
WINNER: [agent ID number]
REASON: [1-2 sentences on why this reinterpretation wins]
"""


def run_selection_phase(anthropic_client: anthropic.Anthropic) -> int:
    """Phase 3: Dither picks the winner."""
    print("\n" + "=" * 60)
    print("PHASE 3: SELECTION")
    print("=" * 60 + "\n")

    update_status(global_updates={"phase": "selection"})

    status = json.loads(STATUS_FILE.read_text())

    content = []
    context_lines = []

    for agent in status["agents"]:
        agent_id = agent["id"]
        twist = TWISTS[agent_id]
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
Game {agent_id}: {twist['name']} — {twist['tagline']}
Maker: {agent['maker']}
Scores: Twist={scores.get('twist', '?')}, Playable={scores.get('playable', '?')}, Arcade={scores.get('arcade', '?')}, Polish={scores.get('polish', '?')}
Verdict: {scores.get('verdict', 'UNKNOWN')}
Notes: {agent.get('notes', '')}
""")

    content.append({
        "type": "text",
        "text": f"Here are 10 FIREFLY reinterpretations:\n{''.join(context_lines)}\n\nPick the ONE with the best combination of twist execution and fun factor."
    })

    print("[Dither] Reviewing all reinterpretations...")

    try:
        response = anthropic_client.messages.create(
            model=SELECTION_MODEL,
            system=DITHER_SYSTEM_PROMPT,
            max_tokens=300,
            messages=[{"role": "user", "content": content}],
        )

        text = response.content[0].text
        print(f"\n[Dither] Response:\n{text}\n")

        winner = 0
        reason = ""
        for line in text.split("\n"):
            line_stripped = line.strip()
            if line_stripped.upper().startswith("WINNER:"):
                try:
                    winner = int(''.join(filter(str.isdigit, line_stripped.split(":")[1][:3])))
                except:
                    pass
            elif line_stripped.upper().startswith("REASON:"):
                reason = line_stripped.split(":", 1)[1].strip()

        winner = max(0, min(NUM_AGENTS - 1, winner))

        update_status(global_updates={"winner": winner, "winner_reason": reason})

        winner_twist = TWISTS[winner]
        print(f"[Dither] Selected: Game {winner} ({winner_twist['name']})")
        print(f"[Dither] Reason: {reason}")

        return winner

    except Exception as e:
        print(f"[Selection] Error: {str(e)[:80]}")
        best = max(status["agents"], key=lambda a: sum([
            a.get("scores", {}).get("twist", 0),
            a.get("scores", {}).get("playable", 0),
            a.get("scores", {}).get("arcade", 0),
            a.get("scores", {}).get("polish", 0),
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

    twist = TWISTS[winner_id]

    prototype_path = OUTPUT_DIR / f"game_{winner_id}.html"
    prototype_code = prototype_path.read_text() if prototype_path.exists() else ""

    if not prototype_code:
        print("[Production] ERROR: No prototype code found")
        return

    try:
        from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, tool, create_sdk_mcp_server
    except ImportError:
        print("[Production] ERROR: claude-agent-sdk not installed")
        update_status(global_updates={"production_status": "error_no_sdk"})
        return

    iteration = [0]
    final_game = [None]

    @tool(
        "save_and_test",
        "Save your HTML game code and get a visual test report.",
        {"html_code": str}
    )
    async def save_and_test_tool(args: dict) -> dict:
        iteration[0] += 1
        iter_num = iteration[0]

        html_code = args.get("html_code", "")
        game_path = PRODUCTION_DIR / f"iteration_{iter_num}.html"
        screenshot_path = PRODUCTION_DIR / f"iteration_{iter_num}.png"

        game_path.write_text(html_code)
        print(f"[Production] Iteration {iter_num}: Saved game")

        update_status(global_updates={"production_status": f"iteration_{iter_num}_testing"})

        script = f'''
        const puppeteer = require('puppeteer');
        (async () => {{
            const browser = await puppeteer.launch({{ headless: true }});
            const page = await browser.newPage();
            await page.setViewport({{ width: 390, height: 844 }});
            await page.goto('file://{game_path}', {{ waitUntil: 'domcontentloaded' }});
            await new Promise(r => setTimeout(r, 1000));
            try {{ await page.click('button'); }} catch (e) {{ await page.mouse.click(195, 422); }}
            await new Promise(r => setTimeout(r, 500));
            for (let i = 0; i < 3; i++) {{
                await page.mouse.click(100 + Math.random() * 190, 200 + Math.random() * 400);
                await new Promise(r => setTimeout(r, 300));
            }}
            await new Promise(r => setTimeout(r, 2000));
            await page.screenshot({{ path: '{screenshot_path}' }});
            await browser.close();
        }})();
        '''

        try:
            subprocess.run(['node', '-e', script], capture_output=True, timeout=30, cwd=REPO_ROOT / "web")
        except:
            pass

        if screenshot_path.exists():
            with open(screenshot_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")

            vision_prompt = f"""Analyze this FIREFLY reinterpretation screenshot.

Twist: {twist['name']} — {twist['tagline']}

Answer YES, NO, or PARTIAL for each:
1. TWIST_VISIBLE: Is the {twist['name']} mechanic visible? (combo counter, colors, zones, etc.)
2. SCORE_VISIBLE: Is there a score display?
3. GAME_ACTIVE: Does it look like gameplay is happening?
4. EFFECTS_PRESENT: Are there particles/glow/visual effects?
5. MOBILE_FRIENDLY: Would it work on a phone?

SUGGESTIONS: What would make this more fun?"""

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
            except Exception as e:
                feedback = f"Error: {str(e)[:50]}"
        else:
            feedback = "Could not take screenshot."

        if iter_num >= MAX_PRODUCTION_ITERATIONS:
            final_path = PRODUCTION_DIR / "game.html"
            final_path.write_text(html_code)
            final_game[0] = str(final_path)
            update_status(global_updates={"production_status": "done_max_iterations"})
            return {"content": [{"type": "text", "text": f"=== TEST REPORT ===\n\n{feedback}\n\n⚠️ MAX ITERATIONS REACHED."}]}

        return {"content": [{"type": "text", "text": f"=== TEST REPORT (Iteration {iter_num}) ===\n\n{feedback}"}]}

    @tool(
        "finish_production",
        "Call when the game is production-ready.",
        {"confidence": str, "final_notes": str}
    )
    async def finish_production_tool(args: dict) -> dict:
        confidence = args.get("confidence", "medium")

        latest = PRODUCTION_DIR / f"iteration_{iteration[0]}.html"
        final_path = PRODUCTION_DIR / "game.html"

        if latest.exists():
            final_path.write_text(latest.read_text())
            final_game[0] = str(final_path)

        update_status(global_updates={"production_status": f"done_{confidence}"})
        return {"content": [{"type": "text", "text": f"Production complete. Saved to {final_path}"}]}

    server = create_sdk_mcp_server(
        name="production",
        version="1.0.0",
        tools=[save_and_test_tool, finish_production_tool]
    )

    options = ClaudeAgentOptions(
        model=PRODUCTION_MODEL,
        permission_mode="acceptEdits",
        mcp_servers={"prod": server},
        allowed_tools=["mcp__prod__save_and_test", "mcp__prod__finish_production"]
    )

    production_prompt = build_production_prompt(prototype_code, twist)

    print(f"[Production] Polishing: {twist['name']}")
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
                            print(f"[Production] Tool: {getattr(block, 'name', 'unknown')}")

    except Exception as e:
        print(f"[Production] Error: {str(e)}")
        update_status(global_updates={"production_status": f"error: {str(e)[:50]}"})

    print(f"\n[Production] Complete. Iterations: {iteration[0]}")


# =============================================================================
# DASHBOARD
# =============================================================================

def create_dashboard():
    """Create the T12 dashboard HTML."""
    html = '''<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>T12 — FIREFLY Reinterpretations</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0; padding: 20px;
  background: #0a0a12; color: #fff;
  font-family: -apple-system, sans-serif;
  min-height: 100vh;
}
h1 { margin: 0 0 5px; font-size: 24px; color: #D4A574; }
.subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
.status { color: #888; margin-bottom: 20px; font-size: 14px; }

.phase-bar {
  display: flex; gap: 0; margin-bottom: 20px;
  background: #111118; border-radius: 8px; overflow: hidden;
}
.phase {
  padding: 10px 20px; font-size: 11px;
  text-transform: uppercase; letter-spacing: 1px;
  color: #444; border-bottom: 2px solid transparent;
}
.phase.active { color: #D4A574; border-bottom-color: #D4A574; background: #0a0a12; }
.phase.complete { color: #666; }

.concepts {
  background: #111118; border-radius: 8px; padding: 15px;
  margin-bottom: 20px; max-width: 1400px;
}
.concepts summary {
  cursor: pointer; font-size: 14px; color: #D4A574;
  font-weight: 600; margin-bottom: 10px;
}
.concepts-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 8px; font-size: 12px;
}
.concept { color: #888; padding: 6px 0; border-bottom: 1px solid #222; }

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 15px; max-width: 1400px;
}

.card {
  background: #111118; border-radius: 12px; padding: 15px;
  border: 2px solid #222; cursor: pointer; transition: all 0.2s;
}
.card:hover { transform: translateY(-2px); border-color: #333; }
.card.winner { border-color: #D4A574 !important; box-shadow: 0 0 20px rgba(212,165,116,0.3); }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.twist-name { font-weight: 600; font-size: 16px; }
.twist-tagline { color: #888; font-size: 12px; margin-bottom: 8px; }
.twist-desc { color: #555; font-size: 11px; line-height: 1.5; margin-bottom: 10px; max-height: 60px; overflow: hidden; }

.verdict { font-size: 10px; padding: 4px 8px; border-radius: 4px; font-weight: 600; }
.verdict.ship { background: #00ff8833; color: #00ff88; }
.verdict.needs-work { background: #ffaa0033; color: #ffaa00; }
.verdict.broken { background: #ff446633; color: #ff4466; }

.scores { display: flex; gap: 6px; font-size: 10px; margin-bottom: 10px; flex-wrap: wrap; }
.score { background: #0a0a12; padding: 3px 8px; border-radius: 4px; color: #888; }
.score span { color: #fff; font-weight: 600; }

.screenshot { width: 100%; height: 180px; object-fit: cover; border-radius: 8px; background: #0a0a12; }
.maker { font-size: 11px; color: #666; margin-top: 8px; }
.notes { font-size: 11px; color: #888; margin-top: 6px; font-style: italic; }

.card-status { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
.card-status.running { color: #D4A574; }

.production-box {
  margin-top: 20px; padding: 20px;
  background: #111118; border: 2px solid #D4A57444;
  border-radius: 12px; max-width: 600px;
}
.production-box h3 { margin: 0 0 12px; font-size: 14px; color: #D4A574; text-transform: uppercase; }
.production-link {
  display: inline-block; margin-top: 12px; padding: 10px 20px;
  background: #D4A574; color: #000; text-decoration: none;
  border-radius: 6px; font-size: 13px; font-weight: 600;
}

.preview {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.95); display: none; z-index: 100;
}
.preview.active { display: flex; flex-direction: column; }
.preview-header {
  padding: 15px 20px; background: #1a1a2e;
  display: flex; justify-content: space-between; align-items: center;
}
.preview-close { background: #ff4466; border: none; color: #fff; padding: 8px 16px; border-radius: 6px; cursor: pointer; }
.preview iframe { flex: 1; border: none; background: #000; }
</style>
</head>
<body>
<h1>T12 — FIREFLY Reinterpretations</h1>
<div class="subtitle">10 arcade-style twists on Amber's FIREFLY</div>
<div class="status" id="status">Loading...</div>

<div class="phase-bar">
  <div class="phase" id="phase-generation">1. Generation</div>
  <div class="phase" id="phase-judging">2. Judging</div>
  <div class="phase" id="phase-selection">3. Selection</div>
  <div class="phase" id="phase-production">4. Production</div>
</div>

<details class="concepts" open>
  <summary>📋 THE 10 TWISTS</summary>
  <div class="concepts-grid">
    <div class="concept"><span style="color:#00ff88">1. CHAIN COMBO</span> — Catch quickly for 2x, 3x, 4x multipliers. Miss once, chain resets.</div>
    <div class="concept"><span style="color:#ff6b6b">2. COLOR MATCH</span> — Only tap the target color shown at top. Wrong color = lose life. Changes every 5-8s.</div>
    <div class="concept"><span style="color:#ffd700">3. SIZE HUNT</span> — Tiny=1pt (easy), Medium=3pt, Large=5pt (brief glow). Risk/reward.</div>
    <div class="concept"><span style="color:#ff4466">4. GRAVITY FALL</span> — Fireflies fall from top. Catch before bottom or lose life.</div>
    <div class="concept"><span style="color:#a855f7">5. HOLD TO CHARGE</span> — Hold on firefly, release at peak glow for max points. Too late = escapes.</div>
    <div class="concept"><span style="color:#00ddff">6. SWARM DRAG</span> — Drag through many tiny fireflies. Glowing = points, dark = damage.</div>
    <div class="concept"><span style="color:#f97316">7. ZONE MULTIPLIER</span> — Screen zones give 1x/2x/3x. Wait for fireflies to drift into good zones.</div>
    <div class="concept"><span style="color:#ec4899">8. RHYTHM FIREFLY</span> — Tap on the beat. Perfect timing = full points. Off-beat = miss.</div>
    <div class="concept"><span style="color:#ef4444">9. PREDATOR HUNT</span> — Red hunters chase fireflies. Tap hunters to save them.</div>
    <div class="concept"><span style="color:#8b5cf6">10. POWER-UP FRENZY</span> — Special fireflies grant slow-mo, magnet, shield, 2x, bomb.</div>
  </div>
</details>

<div class="grid" id="grid"></div>

<div class="production-box" id="production-box" style="display:none">
  <h3>🎮 Production Build</h3>
  <div id="production-status">Waiting...</div>
  <a class="production-link" id="production-link" href="#" style="display:none">PLAY FINAL GAME</a>
</div>

<div class="preview" id="preview">
  <div class="preview-header">
    <span id="preview-title"></span>
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
    <div class="card ${verdictClass} ${isWinner ? 'winner' : ''}" onclick="openPreview(${a.id})" style="border-left: 3px solid ${a.twist_color}">
      <div class="card-header">
        <span class="twist-name" style="color: ${a.twist_color}">${a.twist_name}</span>
        ${scores.verdict ? `<span class="verdict ${verdictClass}">${scores.verdict}</span>` : ''}
      </div>
      <div class="twist-tagline">${a.twist_tagline}</div>
      <div class="twist-desc">${a.twist_desc || ''}</div>
      ${scores.twist !== undefined ? `
        <div class="scores">
          <span class="score">Twist <span>${scores.twist}</span></span>
          <span class="score">Play <span>${scores.playable}</span></span>
          <span class="score">Arcade <span>${scores.arcade}</span></span>
          <span class="score">Polish <span>${scores.polish}</span></span>
        </div>
      ` : ''}
      ${a.screenshot ? `<img class="screenshot" src="screenshots/${a.screenshot}">` : ''}
      ${!a.scores ? `<div class="card-status ${a.status}">${a.status}...</div>` : ''}
      <div class="maker">by ${a.maker}${isWinner ? ' ★ WINNER' : ''}</div>
      ${a.notes ? `<div class="notes">"${a.notes}"</div>` : ''}
    </div>
  `;
}

function render(data) {
  const phase = data.phase;
  const done = data.agents.filter(a => a.scores).length;

  document.getElementById('status').textContent = phase === 'done'
    ? '✓ Complete'
    : phase === 'production' ? '🏭 Production...'
    : phase === 'selection' ? '🎯 Selecting winner...'
    : phase === 'judging' ? `🔍 Judging ${done}/10...`
    : '⚡ Generating...';

  ['generation', 'judging', 'selection', 'production'].forEach((p, i) => {
    const el = document.getElementById('phase-' + p);
    el.className = 'phase';
    const phases = ['generation', 'judging', 'selection', 'production'];
    if (phase === p) el.classList.add('active');
    else if (phases.indexOf(p) < phases.indexOf(phase)) el.classList.add('complete');
  });

  document.getElementById('grid').innerHTML = data.agents.map(a => renderCard(a, data.winner)).join('');

  const prodBox = document.getElementById('production-box');
  const prodLink = document.getElementById('production-link');

  if (data.winner !== null) {
    prodBox.style.display = 'block';
    const winner = data.agents[data.winner];
    document.getElementById('production-status').textContent = data.production_status?.startsWith('done')
      ? `Complete! ${winner.twist_name}`
      : data.production_status || `Selected: ${winner.twist_name}`;
    if (data.production_status?.startsWith('done')) {
      prodLink.style.display = 'inline-block';
      prodLink.href = 'production/game.html';
    }
  }
}

function openPreview(id) {
  const a = lastData.agents[id];
  document.getElementById('preview-title').textContent = a.twist_name + ' by ' + a.maker;
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
    lastData = await res.json();
    render(lastData);
  } catch (e) {}
  setTimeout(poll, 500);
}
poll();
</script>
</body></html>'''

    (OUTPUT_DIR / "index.html").write_text(html)
    print(f"[Dashboard] http://localhost:3000/pixelpit/swarm/t12/index.html")


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
    print("T12 FIREFLY REINTERPRETATION SWARM")
    print("=" * 60)
    print(f"Base: FIREFLY by Amber")
    print(f"Twists: {', '.join(t['name'] for t in TWISTS)}")
    print()

    create_dashboard()
    init_status()

    start_time = time.time()

    run_generation_phase(together_client)
    run_judging_phase(anthropic_client)
    winner_id = run_selection_phase(anthropic_client)
    asyncio.run(run_production_phase(winner_id, anthropic_client))

    update_status(global_updates={"completed": datetime.now().isoformat(), "phase": "done"})

    total_time = time.time() - start_time
    winner_twist = TWISTS[winner_id]

    print()
    print("=" * 60)
    print(f"COMPLETE in {total_time:.1f}s")
    print(f"Winner: {winner_twist['name']} — {winner_twist['tagline']}")
    print(f"Dashboard: http://localhost:3000/pixelpit/swarm/t12/index.html")
    print(f"Final game: http://localhost:3000/pixelpit/swarm/t12/production/game.html")
    print("=" * 60)


if __name__ == "__main__":
    main()
