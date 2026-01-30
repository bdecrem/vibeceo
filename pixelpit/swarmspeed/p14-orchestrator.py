#!/usr/bin/env python3
"""
P14 EXPERIMENT: Discover → Build Pipeline

Round 1: Discover 10 unique hyper-casual games (same as t10)
Round 2: Build fresh versions of each — same mechanic, new theme/visuals, mobile web

Usage:
  python p13-orchestrator.py

Output:
  web/public/pixelpit/swarm/p14/index.html       # Dashboard
  web/public/pixelpit/swarm/p14/game-0/          # Built games
  web/public/pixelpit/swarm/p14/game-1/
  ...
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Setup paths
REPO_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "p14"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Load environment
from dotenv import load_dotenv
env_path = REPO_ROOT / "sms-bot" / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
    print(f"[ENV] Loaded from {env_path}")

from together import Together
from tools import search_with_ai

# Config
MODEL = "openai/gpt-oss-20b"
NUM_AGENTS = 10
MAX_RETRIES_PER_AGENT = 5
EARLY_STOP_THRESHOLD = 8
FINAL_RETRIES = 2

STATUS_FILE = OUTPUT_DIR / "status.json"
HISTORY_FILE = OUTPUT_DIR / "game_history.json"
MAX_HISTORY = 200

status_lock = threading.Lock()
history_lock = threading.Lock()


def count_successes(phase: str = "discovery") -> int:
    """Count how many agents have succeeded in a phase."""
    with status_lock:
        if STATUS_FILE.exists():
            status = json.loads(STATUS_FILE.read_text())
            agents = status.get("agents", [])
            if phase == "discovery":
                return sum(1 for a in agents if a.get("discovery_status") == "done")
            else:
                return sum(1 for a in agents if a.get("build_status") == "done")
    return 0


def load_history() -> list[str]:
    """Load blurbs from persistent history."""
    if HISTORY_FILE.exists():
        try:
            data = json.loads(HISTORY_FILE.read_text())
            return data.get("blurbs", [])[-MAX_HISTORY:]
        except:
            return []
    return []


def save_to_history(blurb: str):
    """Add a blurb to persistent history."""
    with history_lock:
        history = load_history()
        history.append(blurb)
        history = history[-MAX_HISTORY:]
        HISTORY_FILE.write_text(json.dumps({"blurbs": history}, indent=2))


def ai_is_unique(client: Together, blurb: str, history: list[str], agent_id: int = -1) -> bool:
    """AI check: is this blurb describing a unique game vs history?"""
    if not history:
        return True

    history_text = "\n".join([f"{i+1}. {h[:150]}" for i, h in enumerate(history[-30:])])

    prompt = f"""Compare the NEW GAME to the EXISTING GAMES list.
Only answer DUPLICATE if it's literally the SAME game (same name).
Different games with similar mechanics are still UNIQUE.

NEW GAME:
{blurb[:400]}

EXISTING GAMES:
{history_text}

Is this the exact same game as one in the list? Answer: UNIQUE or DUPLICATE"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You compare games. Only say DUPLICATE if they have the same name. Similar games are UNIQUE."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=30,
            temperature=0.1,
        )
        answer = (response.choices[0].message.content or "").strip()
        print(f"[Agent {agent_id}] AI response: '{answer[:50]}' | History: {len(history)} games")
        is_dup = "DUPLICATE" in answer.upper()
        return not is_dup
    except Exception as e:
        print(f"[Agent {agent_id}] Uniqueness check error: {e}")
        return True


def init_status():
    status = {
        "started": datetime.now().isoformat(),
        "completed": None,
        "phase": "discovery",
        "agents": [
            {
                "id": i,
                "discovery_status": "pending",
                "discovery_attempts": 0,
                "blurb": None,
                "build_status": "pending",
                "build_attempts": 0,
                "theme": None,
                "game_url": None,
            }
            for i in range(NUM_AGENTS)
        ]
    }
    STATUS_FILE.write_text(json.dumps(status, indent=2))


def update_status(agent_id=None, updates=None, global_updates=None):
    with status_lock:
        status = json.loads(STATUS_FILE.read_text())
        if agent_id is not None and updates:
            status["agents"][agent_id].update(updates)
        if global_updates:
            status.update(global_updates)
        STATUS_FILE.write_text(json.dumps(status, indent=2))


# =============================================================================
# ROUND 1: DISCOVERY (same as t10)
# =============================================================================

def run_discovery_agent(agent_id: int, client: Together) -> dict:
    """Agent searches for a unique hyper-casual game blurb."""
    update_status(agent_id, {"discovery_status": "searching"})

    prompts = [
        "Find a hyper-casual mobile game from early 2024. Describe it in 2-3 sentences: name, what you do, why it's fun.",
        "What hyper-casual game was trending about 12 months ago on iOS or Android? Describe the game briefly.",
        "Search for a simple one-tap mobile game from 2024. Tell me the name and core mechanic in a few sentences.",
        "Find a hyper-casual game that went viral in early 2024. Describe what makes it addictive.",
        "What simple pick-up-and-play mobile game from a year ago was popular? Describe it briefly.",
        "Search for a minimalist casual game from 2024. Name it and explain the gameplay in 2-3 sentences.",
        "Find a hyper-casual puzzle or arcade game from early 2024. What is it and how does it play?",
        "What successful hyper-casual game was on the App Store a year ago? Describe the game.",
        "Search for a casual game with simple controls from early 2024. Tell me about it.",
        "Find a free-to-play hyper-casual game from 2024 with satisfying gameplay. Describe it.",
    ]

    prompt = prompts[agent_id % len(prompts)]

    for attempt in range(MAX_RETRIES_PER_AGENT):
        successes = count_successes("discovery")
        if successes >= EARLY_STOP_THRESHOLD and attempt >= FINAL_RETRIES:
            print(f"[Agent {agent_id}] Stopping early — {successes} games found")
            break

        update_status(agent_id, {"discovery_attempts": attempt + 1})
        print(f"[Discovery {agent_id}] Attempt {attempt + 1}/{MAX_RETRIES_PER_AGENT}")

        try:
            result = search_with_ai(
                client=client,
                query=prompt,
                system_prompt="You are a hyper-casual game researcher. Search and describe games briefly (2-3 sentences). Focus on the game name and core mechanic.",
                model=MODEL,
            )

            blurb = result.get("content", "").strip()

            if not blurb or len(blurb) < 30:
                print(f"[Discovery {agent_id}] Empty response, retrying...")
                continue

            history = load_history()

            if ai_is_unique(client, blurb, history, agent_id):
                save_to_history(blurb)
                update_status(agent_id, {"discovery_status": "done", "blurb": blurb})
                print(f"[Discovery {agent_id}] ✓ Found unique game")
                return {"success": True, "agent_id": agent_id, "blurb": blurb}
            else:
                print(f"[Discovery {agent_id}] Duplicate, retrying...")
                prompt = f"Find a DIFFERENT hyper-casual game from 2024, not the one you just mentioned. Describe it briefly."

        except Exception as e:
            print(f"[Discovery {agent_id}] Error: {str(e)[:60]}")

    update_status(agent_id, {"discovery_status": "failed"})
    print(f"[Discovery {agent_id}] Failed after {MAX_RETRIES_PER_AGENT} attempts")
    return {"success": False, "agent_id": agent_id}


# =============================================================================
# TESTING: Static Checks (A) + AI Review (B)
# =============================================================================

def static_check(code: str) -> dict:
    """
    Test A: Static checks for required game elements.
    Returns: {"passed": bool, "issues": [...]}
    """
    issues = []

    if "<canvas" not in code:
        issues.append("Missing <canvas> element")

    if "requestAnimationFrame" not in code and "setInterval" not in code:
        issues.append("Missing game loop (requestAnimationFrame or setInterval)")

    if "touchstart" not in code and "click" not in code and "mousedown" not in code:
        issues.append("Missing touch/click event handlers")

    if "score" not in code.lower():
        issues.append("Missing score tracking")

    # Check for balanced braces (crude truncation detection)
    opens = code.count("{")
    closes = code.count("}")
    if opens != closes:
        issues.append(f"Unbalanced braces: {opens} open, {closes} close (possible truncation)")

    # Check for game over / restart
    if "game" not in code.lower() or ("over" not in code.lower() and "end" not in code.lower()):
        issues.append("Missing game over state")

    if "restart" not in code.lower() and "reset" not in code.lower():
        issues.append("Missing restart functionality")

    return {"passed": len(issues) == 0, "issues": issues}


def ai_review(client: Together, code: str, agent_id: int) -> dict:
    """
    Test B: AI reviews code for bugs.
    Returns: {"passed": bool, "issues": [...]}
    """
    prompt = f"""Review this HTML/JS game code for bugs. List only CRITICAL issues that would prevent the game from working.

Check for:
1. Variables used before defined
2. Functions called that don't exist
3. Collision detection that's obviously wrong
4. Game loop that doesn't run
5. Touch handlers that won't work

CODE:
{code[:6000]}

List up to 3 critical bugs, one per line. If no critical bugs, say "NO ISSUES".
"""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a code reviewer. List only critical bugs that break the game. Be concise."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=200,
            temperature=0.2,
        )

        answer = (response.choices[0].message.content or "").strip()
        print(f"[Build {agent_id}] AI review: {answer[:100]}")

        if "NO ISSUES" in answer.upper() or "NO CRITICAL" in answer.upper():
            return {"passed": True, "issues": []}

        # Parse issues (one per line)
        issues = [line.strip() for line in answer.split("\n") if line.strip() and not line.startswith("#")]
        issues = issues[:3]  # Max 3

        return {"passed": len(issues) == 0, "issues": issues}

    except Exception as e:
        print(f"[Build {agent_id}] AI review error: {e}")
        return {"passed": True, "issues": []}  # Assume OK on error


# =============================================================================
# ROUND 2: BUILD
# =============================================================================

VISUAL_THEMES = [
    "neon cyberpunk with glowing edges",
    "cute kawaii with pastel colors",
    "pixel art retro 8-bit style",
    "minimalist black and white",
    "underwater ocean theme",
    "space and stars cosmic theme",
    "jungle and nature theme",
    "candy and sweets colorful theme",
    "spooky halloween theme",
    "winter snow and ice theme",
]


def extract_html(code: str) -> str | None:
    """Extract HTML from response, handling markdown wrappers."""
    # Extract HTML if wrapped in markdown
    if "```html" in code:
        code = code.split("```html")[1].split("```")[0]
    elif "```" in code:
        code = code.split("```")[1].split("```")[0]

    code = code.strip()

    # Find start of HTML
    if not code.startswith("<!DOCTYPE") and not code.startswith("<html"):
        if "<!DOCTYPE" in code:
            code = code[code.index("<!DOCTYPE"):]
        elif "<html" in code:
            code = code[code.index("<html"):]
        else:
            return None

    return code


def generate_game(client: Together, prompt: str, agent_id: int) -> str | None:
    """Generate game code from prompt."""
    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a game developer. Output only valid HTML code for a complete mobile web game. No explanations."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=16000,
            temperature=0.7,
        )
        code = response.choices[0].message.content or ""
        return extract_html(code)
    except Exception as e:
        print(f"[Build {agent_id}] Generation error: {str(e)[:60]}")
        return None


def run_build_agent(agent_id: int, client: Together, blurb: str) -> dict:
    """
    Agent builds a mobile web game with Build → Test → Fix loop.
    v1: Initial build
    v2: After static check feedback (if needed)
    v3: After AI review feedback (if needed)
    """
    update_status(agent_id, {"build_status": "building"})

    theme = VISUAL_THEMES[agent_id % len(VISUAL_THEMES)]
    update_status(agent_id, {"theme": theme})

    base_prompt = f"""Create a hyper-casual mobile web game based on this original game:

ORIGINAL: {blurb}

YOUR TASK:
1. Keep the SAME core mechanic
2. Change the theme/visuals to: {theme}
3. Make it work on mobile (touch controls, responsive)
4. Single HTML file with embedded CSS and JavaScript
5. Use canvas for rendering
6. Include a score counter and game over screen with "Tap to restart"

Output ONLY the complete HTML code, nothing else. Start with <!DOCTYPE html>"""

    game_dir = OUTPUT_DIR / f"game-{agent_id}"
    game_dir.mkdir(exist_ok=True)

    # === BUILD v1 ===
    print(f"[Build {agent_id}] v1 — Initial build")
    update_status(agent_id, {"build_attempts": 1})
    code = generate_game(client, base_prompt, agent_id)

    if not code:
        update_status(agent_id, {"build_status": "failed"})
        print(f"[Build {agent_id}] Failed v1 — no valid HTML")
        return {"success": False, "agent_id": agent_id}

    # === TEST A: Static Check ===
    print(f"[Build {agent_id}] Running static check...")
    check_a = static_check(code)

    if not check_a["passed"]:
        print(f"[Build {agent_id}] Static issues: {check_a['issues']}")

        # === BUILD v2 ===
        print(f"[Build {agent_id}] v2 — Fixing static issues")
        update_status(agent_id, {"build_attempts": 2})

        fix_prompt = f"""{base_prompt}

IMPORTANT: Your previous attempt had these issues:
{chr(10).join('- ' + issue for issue in check_a['issues'])}

Fix these issues in your new version."""

        code_v2 = generate_game(client, fix_prompt, agent_id)
        if code_v2:
            code = code_v2

    # === TEST B: AI Review ===
    print(f"[Build {agent_id}] Running AI review...")
    check_b = ai_review(client, code, agent_id)

    if not check_b["passed"]:
        print(f"[Build {agent_id}] AI found issues: {check_b['issues']}")

        # === BUILD v3 ===
        print(f"[Build {agent_id}] v3 — Fixing AI-found bugs")
        update_status(agent_id, {"build_attempts": 3})

        fix_prompt = f"""{base_prompt}

IMPORTANT: Code review found these bugs:
{chr(10).join('- ' + issue for issue in check_b['issues'])}

Fix these bugs in your new version."""

        code_v3 = generate_game(client, fix_prompt, agent_id)
        if code_v3:
            code = code_v3

    # === SAVE FINAL VERSION ===
    (game_dir / "index.html").write_text(code)
    game_url = f"/pixelpit/swarm/p14/game-{agent_id}/index.html"
    update_status(agent_id, {"build_status": "done", "game_url": game_url})
    print(f"[Build {agent_id}] ✓ Game saved: {game_url}")

    return {"success": True, "agent_id": agent_id, "game_url": game_url}


# =============================================================================
# DASHBOARD
# =============================================================================

def create_dashboard():
    html = '''<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>P14 - Discover & Build</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0; padding: 20px;
  background: #0a0a0f; color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
h1 { margin: 0 0 5px; font-size: 24px; color: #00ff88; }
h2 { margin: 20px 0 10px; font-size: 16px; color: #888; }
.status { color: #888; margin-bottom: 15px; }
.status.discovery { color: #ffaa00; }
.status.building { color: #00ddff; }
.status.done { color: #00ff88; }

.agents {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

.card {
  background: #111118;
  border-radius: 8px;
  padding: 12px;
  border: 2px solid #333;
}
.card.done { border-color: #00ff8844; }
.card.building { border-color: #00ddff44; }
.card.searching { border-color: #ffaa0044; }
.card.failed { border-color: #ff446644; }

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}
.phase-tag {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 10px;
}
.phase-tag.discovery { background: #ffaa0022; color: #ffaa00; }
.phase-tag.build { background: #00ddff22; color: #00ddff; }
.phase-tag.done { background: #00ff8822; color: #00ff88; }
.phase-tag.failed { background: #ff446622; color: #ff4466; }

.blurb { font-size: 13px; color: #aaa; line-height: 1.4; margin-bottom: 8px; }
.theme { font-size: 11px; color: #00ddff; margin-bottom: 6px; }
.play-link { font-size: 12px; }
.play-link a { color: #00ff88; }
</style>
</head>
<body>
<h1>P14 — Discover & Build</h1>
<div class="status" id="status">Loading...</div>

<div class="agents" id="agents"></div>

<script>
const statusEl = document.getElementById('status');
const agentsEl = document.getElementById('agents');

function render(data) {
  const discovered = data.agents.filter(a => a.discovery_status === 'done').length;
  const built = data.agents.filter(a => a.build_status === 'done').length;

  statusEl.className = 'status ' + data.phase;
  if (data.phase === 'done') {
    statusEl.textContent = `✓ Complete — ${built} games built`;
  } else if (data.phase === 'building') {
    statusEl.textContent = `⚙ Building — ${built}/${discovered} games`;
  } else {
    statusEl.textContent = `⟳ Discovering — ${discovered}/10 games found`;
  }

  agentsEl.innerHTML = data.agents.map(a => {
    let cardClass = 'card';
    let phaseText = '';
    let phaseClass = '';

    if (a.build_status === 'done') {
      cardClass += ' done';
      phaseText = '✓ Built';
      phaseClass = 'done';
    } else if (a.build_status === 'building') {
      cardClass += ' building';
      phaseText = 'Building...';
      phaseClass = 'build';
    } else if (a.build_status === 'failed') {
      cardClass += ' failed';
      phaseText = 'Build failed';
      phaseClass = 'failed';
    } else if (a.discovery_status === 'done') {
      cardClass += ' done';
      phaseText = 'Discovered';
      phaseClass = 'discovery';
    } else if (a.discovery_status === 'searching') {
      cardClass += ' searching';
      phaseText = 'Searching...';
      phaseClass = 'discovery';
    } else if (a.discovery_status === 'failed') {
      cardClass += ' failed';
      phaseText = 'Discovery failed';
      phaseClass = 'failed';
    } else {
      phaseText = 'Pending';
      phaseClass = 'discovery';
    }

    return `
      <div class="${cardClass}">
        <div class="card-header">
          <span>Agent ${a.id}</span>
          <span class="phase-tag ${phaseClass}">${phaseText}</span>
        </div>
        ${a.blurb ? `<div class="blurb">${a.blurb.slice(0, 200)}${a.blurb.length > 200 ? '...' : ''}</div>` : ''}
        ${a.theme ? `<div class="theme">🎨 ${a.theme}</div>` : ''}
        ${a.game_url ? `<div class="play-link"><a href="${a.game_url}" target="_blank">▶ Play Game</a></div>` : ''}
      </div>
    `;
  }).join('');
}

async function poll() {
  try {
    const data = await (await fetch('status.json?' + Date.now())).json();
    render(data);
  } catch (e) {}
  setTimeout(poll, 500);
}
poll();
</script>
</body></html>'''
    (OUTPUT_DIR / "index.html").write_text(html)
    print(f"[Dashboard] http://localhost:3000/pixelpit/swarm/p14/index.html")


# =============================================================================
# MAIN
# =============================================================================

def main():
    together_key = os.environ.get("TOGETHER_API_KEY")
    brave_key = os.environ.get("BRAVE_API_KEY")

    if not together_key:
        print("ERROR: TOGETHER_API_KEY not found")
        sys.exit(1)
    if not brave_key:
        print("ERROR: BRAVE_API_KEY not found")
        sys.exit(1)

    client = Together(api_key=together_key)

    print("=" * 50)
    print("P14: Discover & Build Pipeline")
    print("=" * 50)

    create_dashboard()
    init_status()

    start_time = time.time()

    # ROUND 1: Discovery
    print("\n[ROUND 1] Discovering games...\n")
    update_status(global_updates={"phase": "discovery"})

    with ThreadPoolExecutor(max_workers=NUM_AGENTS) as executor:
        futures = [executor.submit(run_discovery_agent, i, client) for i in range(NUM_AGENTS)]
        for f in as_completed(futures):
            f.result()

    # Get discovered games
    status = json.loads(STATUS_FILE.read_text())
    discovered = [(a["id"], a["blurb"]) for a in status["agents"] if a["discovery_status"] == "done" and a["blurb"]]

    print(f"\n[ROUND 1 COMPLETE] {len(discovered)} games discovered\n")

    if not discovered:
        print("No games discovered. Exiting.")
        return

    # ROUND 2: Build
    print("[ROUND 2] Building games...\n")
    update_status(global_updates={"phase": "building"})

    with ThreadPoolExecutor(max_workers=min(5, len(discovered))) as executor:
        futures = [executor.submit(run_build_agent, agent_id, client, blurb) for agent_id, blurb in discovered]
        for f in as_completed(futures):
            f.result()

    # Finalize
    update_status(global_updates={"completed": datetime.now().isoformat(), "phase": "done"})

    status = json.loads(STATUS_FILE.read_text())
    built = sum(1 for a in status["agents"] if a["build_status"] == "done")

    print()
    print("=" * 50)
    print(f"COMPLETE in {time.time() - start_time:.1f}s")
    print(f"  Discovered: {len(discovered)}")
    print(f"  Built: {built}")
    print()
    print("Games:")
    for a in status["agents"]:
        if a["build_status"] == "done":
            print(f"  - Game {a['id']}: {a['theme']} → {a['game_url']}")
    print()
    print(f"Dashboard: http://localhost:3000/pixelpit/swarm/p14/index.html")
    print("=" * 50)


if __name__ == "__main__":
    main()
