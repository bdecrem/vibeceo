#!/usr/bin/env python3
"""
T10 EXPERIMENT: Hyper-Casual Game Discovery

10 agents search for unique hyper-casual game blurbs.
Each blurb is checked against history for uniqueness.
Retry until 10 unique games found.

Usage:
  python t10-orchestrator.py

Output:
  web/public/pixelpit/swarm/t10/index.html      # Dashboard
  web/public/pixelpit/swarm/t10/status.json     # Results
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
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "t10"
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

STATUS_FILE = OUTPUT_DIR / "status.json"
HISTORY_FILE = OUTPUT_DIR / "game_history.json"
MAX_HISTORY = 200
EARLY_STOP_THRESHOLD = 8  # Once we hit this many, remaining agents get limited retries
FINAL_RETRIES = 2  # Max retries for stragglers after threshold hit

status_lock = threading.Lock()
history_lock = threading.Lock()


def count_successes() -> int:
    """Count how many agents have succeeded."""
    with status_lock:
        if STATUS_FILE.exists():
            status = json.loads(STATUS_FILE.read_text())
            return sum(1 for a in status["agents"] if a["status"] == "done")
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

        # Be lenient - only mark duplicate if explicitly says so
        answer_upper = answer.upper()
        is_dup = "DUPLICATE" in answer_upper
        return not is_dup
    except Exception as e:
        print(f"[Agent {agent_id}] Uniqueness check error: {e}")
        return True  # Assume unique on error


def init_status():
    status = {
        "started": datetime.now().isoformat(),
        "completed": None,
        "phase": "searching",
        "agents": [
            {"id": i, "status": "pending", "attempts": 0, "blurb": None}
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


def run_agent(agent_id: int, client: Together) -> dict:
    """Agent searches for a unique hyper-casual game blurb."""
    update_status(agent_id, {"status": "searching"})

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
        # Check if we should stop early (8+ found, only 2 more tries for stragglers)
        successes = count_successes()
        if successes >= EARLY_STOP_THRESHOLD and attempt >= FINAL_RETRIES:
            print(f"[Agent {agent_id}] Stopping early — {successes} games found, enough tries")
            break

        update_status(agent_id, {"attempts": attempt + 1})
        print(f"[Agent {agent_id}] Attempt {attempt + 1}/{MAX_RETRIES_PER_AGENT}")

        try:
            result = search_with_ai(
                client=client,
                query=prompt,
                system_prompt="You are a hyper-casual game researcher. Search and describe games briefly (2-3 sentences). Focus on the game name and core mechanic.",
                model=MODEL,
            )

            blurb = result.get("content", "").strip()

            if not blurb or len(blurb) < 30:
                print(f"[Agent {agent_id}] Empty or too short response, retrying...")
                continue

            # Check uniqueness
            history = load_history()

            if ai_is_unique(client, blurb, history, agent_id):
                # Success!
                save_to_history(blurb)
                update_status(agent_id, {"status": "done", "blurb": blurb})
                print(f"[Agent {agent_id}] ✓ Found unique game")
                return {"success": True, "agent_id": agent_id}
            else:
                print(f"[Agent {agent_id}] Duplicate, retrying...")
                prompt = f"Find a DIFFERENT hyper-casual game from 2024, not the one you just mentioned. Describe it briefly."

        except Exception as e:
            print(f"[Agent {agent_id}] Error: {str(e)[:60]}")

    update_status(agent_id, {"status": "failed"})
    print(f"[Agent {agent_id}] Failed after {MAX_RETRIES_PER_AGENT} attempts")
    return {"success": False, "agent_id": agent_id}


def create_dashboard():
    html = '''<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>T10 - Game Discovery</title>
<style>
* { box-sizing: border-box; }
body {
  margin: 0; padding: 20px;
  background: #0a0a0f; color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
}
h1 { margin: 0 0 10px; font-size: 24px; color: #00ff88; }
.status { color: #888; margin-bottom: 20px; }
.status.searching { color: #ffaa00; }
.status.done { color: #00ff88; }

.games {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}

.card {
  background: #111118;
  border-radius: 10px;
  padding: 14px;
  border: 2px solid #333;
}
.card.done { border-color: #00ff8844; }
.card.searching { border-color: #ffaa0044; animation: pulse 1s infinite; }
.card.failed { border-color: #ff446644; }

@keyframes pulse {
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
}

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}
.card-id { font-size: 11px; color: #666; }
.card-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
}
.card-status.done { background: #00ff8822; color: #00ff88; }
.card-status.searching { background: #ffaa0022; color: #ffaa00; }
.card-status.failed { background: #ff446622; color: #ff4466; }
.card-status.pending { background: #33333344; color: #666; }

.blurb {
  font-size: 14px;
  color: #ccc;
  line-height: 1.5;
}
.attempts { font-size: 10px; color: #555; margin-top: 8px; }
</style>
</head>
<body>
<h1>T10 — Hyper-Casual Game Discovery</h1>
<div class="status" id="status">Loading...</div>
<div class="games" id="games"></div>

<script>
const statusEl = document.getElementById('status');
const gamesEl = document.getElementById('games');

function render(data) {
  const done = data.agents.filter(a => a.status === 'done').length;
  const searching = data.agents.filter(a => a.status === 'searching').length;

  statusEl.className = 'status ' + data.phase;
  statusEl.textContent = data.phase === 'done'
    ? `✓ Complete — ${done} unique games`
    : `⟳ Searching — ${done}/10 found, ${searching} active`;

  gamesEl.innerHTML = data.agents.map(a => `
    <div class="card ${a.status}">
      <div class="card-header">
        <span class="card-id">Agent ${a.id}</span>
        <span class="card-status ${a.status}">${a.status}</span>
      </div>
      <div class="blurb">${a.blurb || '<span style="color:#555">Searching...</span>'}</div>
      <div class="attempts">Attempts: ${a.attempts || 0}</div>
    </div>
  `).join('');
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
    print(f"[Dashboard] http://localhost:3000/pixelpit/swarm/t10/index.html")


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
    print("T10: Hyper-Casual Game Discovery")
    print("=" * 50)

    create_dashboard()
    init_status()

    start_time = time.time()

    with ThreadPoolExecutor(max_workers=NUM_AGENTS) as executor:
        futures = [executor.submit(run_agent, i, client) for i in range(NUM_AGENTS)]
        for f in as_completed(futures):
            f.result()

    update_status(global_updates={"completed": datetime.now().isoformat(), "phase": "done"})

    status = json.loads(STATUS_FILE.read_text())
    successful = sum(1 for a in status["agents"] if a["status"] == "done")

    print()
    print("=" * 50)
    print(f"COMPLETE in {time.time() - start_time:.1f}s — {successful}/10 unique games")
    print("=" * 50)


if __name__ == "__main__":
    main()
