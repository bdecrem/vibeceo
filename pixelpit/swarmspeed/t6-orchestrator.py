#!/usr/bin/env python3
"""
T6 EXPERIMENT: Visual QA - AI Judge Reviews Each Game

Same as T5 (live dashboard with 10 themed reskins), but adds a judge phase:
1. Generate 10 games in parallel
2. Screenshot each at 6 seconds
3. Claude Vision rates: ALIVE, THEME, POLISH
4. Dashboard shows scores + color-coded verdicts

Usage:
  python t6-orchestrator.py

Output:
  web/public/pixelpit/swarm/t6/index.html (dashboard with scores)
  web/public/pixelpit/swarm/t6/status.json (live status + ratings)
  web/public/pixelpit/swarm/t6/agent_N.html (game files)
  web/public/pixelpit/swarm/t6/screenshots/agent_N.png (screenshots)
"""

import os
import sys
import json
import time
import base64
import subprocess
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

REPO_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "t6"
SCREENSHOT_DIR = OUTPUT_DIR / "screenshots"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

from dotenv import load_dotenv
env_path = REPO_ROOT / "sms-bot" / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
    print(f"[ENV] Loaded from {env_path}")

from together import Together
import anthropic

MODEL = "openai/gpt-oss-20b"
JUDGE_MODEL = "claude-sonnet-4-20250514"
NUM_AGENTS = 10
MAX_TOKENS = 3000
SCREENSHOT_DELAY = 6  # seconds

# Status file for live updates
STATUS_FILE = OUTPUT_DIR / "status.json"
status_lock = threading.Lock()

# Reference code - simple pop game
REFERENCE_CODE = '''<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Pop Game</title>
<style>body{margin:0;background:#111;overflow:hidden}canvas{display:block}</style>
</head><body><canvas id=c></canvas>
<script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
let W,H;function resize(){W=c.width=innerWidth;H=c.height=innerHeight}resize();onresize=resize;
let score=0, targets=[];
function spawn(){targets.push({x:Math.random()*W, y:H+50, r:30, speed:1+Math.random()*2, color:'#ff4466'});}
function update(){targets.forEach(t=>t.y-=t.speed);targets=targets.filter(t=>t.y>-50);if(Math.random()<0.03)spawn();}
function draw(){ctx.fillStyle='#111';ctx.fillRect(0,0,W,H);targets.forEach(t=>{ctx.fillStyle=t.color;ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();});ctx.fillStyle='#fff';ctx.font='24px sans-serif';ctx.fillText('Score: '+score,20,40);}
function pop(x,y){for(let i=targets.length-1;i>=0;i--){const t=targets[i];if(Math.hypot(x-t.x,y-t.y)<t.r){targets.splice(i,1);score++;return;}}}
c.onclick=e=>pop(e.clientX,e.clientY);
c.ontouchstart=e=>{e.preventDefault();pop(e.touches[0].clientX,e.touches[0].clientY)};
function loop(){update();draw();requestAnimationFrame(loop)}loop();
</script></body></html>'''

# Themes with colors for the dashboard
THEMES = [
    {"name": "SOAP BUBBLES", "color": "#88ddff", "desc": "Iridescent bubbles with rainbow shimmer"},
    {"name": "FIREFLIES", "color": "#aaff44", "desc": "Glowing bugs in a dark forest"},
    {"name": "SPACE ROCKS", "color": "#888899", "desc": "Asteroids with explosions"},
    {"name": "CANDY POP", "color": "#ff66aa", "desc": "Lollipops and gummies"},
    {"name": "GHOSTS", "color": "#ddddff", "desc": "Cute spooky spirits"},
    {"name": "DEEP SEA", "color": "#00ffcc", "desc": "Bioluminescent jellyfish"},
    {"name": "NEON SIGNS", "color": "#ff00ff", "desc": "Electric glowing shapes"},
    {"name": "FRUIT SPLASH", "color": "#ffaa00", "desc": "Juicy fruits splattering"},
    {"name": "EMOJI MADNESS", "color": "#ffdd00", "desc": "Random emoji faces"},
    {"name": "PIXEL RETRO", "color": "#00ff00", "desc": "8-bit arcade style"},
]


def init_status():
    """Initialize status file with all agents pending."""
    status = {
        "started": datetime.now().isoformat(),
        "completed": None,
        "phase": "generating",  # generating -> judging -> done
        "agents": [
            {
                "id": i,
                "name": THEMES[i]["name"],
                "color": THEMES[i]["color"],
                "desc": THEMES[i]["desc"],
                "status": "pending",
                "time": None,
                "tokens": None,
                "url": None,
                "screenshot": None,
                "scores": None,  # {alive, theme, polish, verdict}
            }
            for i in range(NUM_AGENTS)
        ]
    }
    STATUS_FILE.write_text(json.dumps(status, indent=2))
    return status


def update_status(agent_id=None, updates=None, global_updates=None):
    """Thread-safe status update."""
    with status_lock:
        status = json.loads(STATUS_FILE.read_text())
        if agent_id is not None and updates:
            status["agents"][agent_id].update(updates)
        if global_updates:
            status.update(global_updates)
        STATUS_FILE.write_text(json.dumps(status, indent=2))


def finalize_status():
    """Mark experiment as complete."""
    update_status(global_updates={"completed": datetime.now().isoformat(), "phase": "done"})


def create_dashboard():
    """Create the dashboard HTML with scoring display."""
    html = '''<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SWARM T6 - Visual QA Dashboard</title>
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
.status.generating { color: #ffaa00; }
.status.judging { color: #ff66aa; }
.status.done { color: #00ff88; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 15px;
  max-width: 1400px;
}
.card {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 15px;
  border: 2px solid #333;
  transition: all 0.3s ease;
  cursor: default;
  position: relative;
}
.card.pending { opacity: 0.4; }
.card.running {
  border-color: #ffaa00;
  animation: pulse 1s infinite;
}
.card.done { cursor: pointer; }
.card.ship {
  border-color: #00ff88;
  box-shadow: 0 0 20px #00ff8844;
}
.card.needs_work {
  border-color: #ffaa00;
  box-shadow: 0 0 15px #ffaa0033;
}
.card.broken {
  border-color: #ff4444;
  box-shadow: 0 0 15px #ff444433;
}
.card.judging {
  border-color: #ff66aa;
  animation: judgePulse 1.5s infinite;
}
.card:hover { transform: translateY(-3px); }
@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@keyframes judgePulse {
  0%, 100% { border-color: #ff66aa; }
  50% { border-color: #aa44ff; }
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.card-name { font-weight: 600; font-size: 13px; }
.card-id { color: #666; font-size: 11px; }
.card-desc { color: #888; font-size: 11px; margin-bottom: 10px; }
.card-status {
  font-size: 10px;
  padding: 3px 6px;
  border-radius: 4px;
  display: inline-block;
  margin-bottom: 8px;
}
.card.pending .card-status { background: #333; color: #666; }
.card.running .card-status { background: #332200; color: #ffaa00; }
.card.done .card-status,
.card.ship .card-status { background: #003322; color: #00ff88; }
.card.needs_work .card-status { background: #332200; color: #ffaa00; }
.card.broken .card-status { background: #330000; color: #ff4444; }
.card.judging .card-status { background: #331133; color: #ff66aa; }
.scores {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
  margin-top: 8px;
  font-size: 10px;
}
.score-item {
  background: #0f0f1a;
  padding: 4px;
  border-radius: 4px;
  text-align: center;
}
.score-label { color: #666; display: block; }
.score-value { color: #fff; font-weight: 600; font-size: 14px; }
.verdict {
  position: absolute;
  top: 10px;
  right: 10px;
  font-size: 16px;
}
.screenshot-thumb {
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: 6px;
  margin-top: 8px;
  opacity: 0.8;
}
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
}
.preview-title { font-weight: 600; }
.preview-close {
  background: #ff4466;
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}
.preview iframe {
  flex: 1;
  border: none;
  background: #000;
}
</style>
</head>
<body>
<h1>SWARM T6 — Visual QA Dashboard</h1>
<div class="status" id="status">Loading...</div>
<div class="grid" id="grid"></div>

<div class="preview" id="preview">
  <div class="preview-header">
    <span class="preview-title" id="preview-title"></span>
    <button class="preview-close" onclick="closePreview()">Close</button>
  </div>
  <iframe id="preview-iframe"></iframe>
</div>

<script>
const grid = document.getElementById('grid');
const statusEl = document.getElementById('status');
let lastData = null;

function getVerdict(scores) {
  if (!scores) return '';
  const v = scores.verdict?.toUpperCase() || '';
  if (v.includes('SHIP')) return '✅';
  if (v.includes('BROKEN')) return '💀';
  if (v.includes('NEEDS')) return '⚠️';
  return '❓';
}

function getCardClass(agent) {
  if (agent.status === 'pending') return 'pending';
  if (agent.status === 'running') return 'running';
  if (agent.status === 'judging') return 'judging';
  if (agent.scores) {
    const v = agent.scores.verdict?.toUpperCase() || '';
    if (v.includes('SHIP')) return 'ship';
    if (v.includes('BROKEN')) return 'broken';
    if (v.includes('NEEDS')) return 'needs_work';
  }
  return 'done';
}

function render(data) {
  const pending = data.agents.filter(a => a.status === 'pending').length;
  const running = data.agents.filter(a => a.status === 'running').length;
  const done = data.agents.filter(a => a.status === 'done' || a.scores).length;
  const judging = data.agents.filter(a => a.status === 'judging').length;
  const shipped = data.agents.filter(a => a.scores?.verdict?.toUpperCase().includes('SHIP')).length;

  statusEl.className = 'status ' + data.phase;
  if (data.phase === 'done') {
    statusEl.textContent = `✓ Complete — ${shipped} shipped, ${done - shipped} need work`;
  } else if (data.phase === 'judging') {
    statusEl.textContent = `🔍 Judging — ${done - judging} rated, ${judging} in review...`;
  } else if (running > 0) {
    statusEl.textContent = `⟳ Generating — ${done} done, ${running} building, ${pending} pending`;
  } else {
    statusEl.textContent = 'Waiting...';
  }

  grid.innerHTML = data.agents.map(a => `
    <div class="card ${getCardClass(a)}"
         ${a.url ? `onclick="openPreview('${a.name}', '${a.url}')"` : ''}>
      <span class="verdict">${getVerdict(a.scores)}</span>
      <div class="card-header">
        <span class="card-name">${a.name}</span>
        <span class="card-id">#${a.id}</span>
      </div>
      <div class="card-desc">${a.desc}</div>
      <span class="card-status">
        ${a.status === 'pending' ? '○ Pending' : ''}
        ${a.status === 'running' ? '◐ Building...' : ''}
        ${a.status === 'done' && !a.scores ? '● Built' : ''}
        ${a.status === 'judging' ? '🔍 Judging...' : ''}
        ${a.scores ? `● ${a.time}s` : ''}
      </span>
      ${a.scores ? `
        <div class="scores">
          <div class="score-item">
            <span class="score-label">ALIVE</span>
            <span class="score-value">${a.scores.alive}</span>
          </div>
          <div class="score-item">
            <span class="score-label">THEME</span>
            <span class="score-value">${a.scores.theme}</span>
          </div>
          <div class="score-item">
            <span class="score-label">POLISH</span>
            <span class="score-value">${a.scores.polish}</span>
          </div>
        </div>
      ` : ''}
      ${a.screenshot ? `<img class="screenshot-thumb" src="screenshots/${a.screenshot}" />` : ''}
    </div>
  `).join('');
}

function openPreview(name, url) {
  document.getElementById('preview-title').textContent = name;
  document.getElementById('preview-iframe').src = url;
  document.getElementById('preview').classList.add('active');
}

function closePreview() {
  document.getElementById('preview').classList.remove('active');
  document.getElementById('preview-iframe').src = '';
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closePreview();
});

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
    print(f"[Dashboard] Created: http://localhost:3000/pixelpit/swarm/t6/index.html")


PROMPT_TEMPLATE = """Reskin this "pop the targets" game with the theme below. Keep the EXACT same mechanics.

REFERENCE CODE:
```html
{reference}
```

THEME: {theme_name}
STYLE: {theme_desc}

Change ONLY visuals: background, target appearance, pop effects, score style.
Keep: spawn rate, float speed, tap detection, scoring.

OUTPUT: Complete HTML file. No explanation. Start with <!DOCTYPE html>
"""


def run_agent(agent_id: int, client: Together) -> dict:
    """Generate a themed game variant."""
    theme = THEMES[agent_id]
    update_status(agent_id, {"status": "running"})

    prompt = PROMPT_TEMPLATE.format(
        reference=REFERENCE_CODE,
        theme_name=theme["name"],
        theme_desc=theme["desc"],
    )

    filename = f"agent_{agent_id}.html"
    output_path = OUTPUT_DIR / filename

    print(f"[Agent {agent_id}] Starting: {theme['name']}")
    start_time = time.time()

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=MAX_TOKENS,
            temperature=0.8,
        )

        content = response.choices[0].message.content

        # Extract HTML from response
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

        print(f"[Agent {agent_id}] Built in {elapsed}s - {tokens} tokens")

        update_status(agent_id, {
            "status": "done",
            "time": elapsed,
            "tokens": tokens,
            "url": filename,
        })

        return {"success": True, "agent_id": agent_id, "time": elapsed}

    except Exception as e:
        print(f"[Agent {agent_id}] Error: {str(e)[:80]}")
        update_status(agent_id, {"status": "error"})
        return {"success": False, "agent_id": agent_id, "error": str(e)}


def take_screenshot(agent_id: int) -> str | None:
    """Take a screenshot of a game using Puppeteer."""
    game_url = f"file://{OUTPUT_DIR}/agent_{agent_id}.html"
    screenshot_path = SCREENSHOT_DIR / f"agent_{agent_id}.png"

    # Use node to run puppeteer inline
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
        console.log('OK');
    }})();
    '''

    try:
        result = subprocess.run(
            ['node', '-e', script],
            capture_output=True,
            text=True,
            timeout=30,
            cwd=REPO_ROOT / "web"  # puppeteer is in web/node_modules
        )
        if result.returncode == 0:
            return f"agent_{agent_id}.png"
        else:
            print(f"[Screenshot {agent_id}] Error: {result.stderr[:100]}")
            return None
    except Exception as e:
        print(f"[Screenshot {agent_id}] Exception: {str(e)[:50]}")
        return None


def judge_game(agent_id: int, client: anthropic.Anthropic) -> dict | None:
    """Use Claude Vision to rate the game screenshot."""
    screenshot_path = SCREENSHOT_DIR / f"agent_{agent_id}.png"
    theme = THEMES[agent_id]

    if not screenshot_path.exists():
        return None

    # Read and encode image
    with open(screenshot_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")

    prompt = f"""Rate this game screenshot. The theme is "{theme['name']}" ({theme['desc']}).

Score each 1-10:
- ALIVE: Is there visible activity/movement? Objects on screen? (1=blank/broken, 10=lots happening)
- THEME: Does it match "{theme['name']}"? (1=wrong theme, 10=perfect match)
- POLISH: Visual quality and appeal? (1=ugly/broken, 10=polished)

Then give a verdict: SHIP (avg >= 7), NEEDS_WORK (avg 4-6), or BROKEN (avg < 4 or blank screen)

Respond in exactly this format:
ALIVE: [score]
THEME: [score]
POLISH: [score]
VERDICT: [SHIP/NEEDS_WORK/BROKEN]"""

    try:
        response = client.messages.create(
            model=JUDGE_MODEL,
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/png",
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": prompt,
                        }
                    ],
                }
            ],
        )

        text = response.content[0].text

        # Parse scores
        scores = {"alive": 0, "theme": 0, "polish": 0, "verdict": "BROKEN"}

        for line in text.split("\n"):
            line = line.strip().upper()
            if line.startswith("ALIVE:"):
                try:
                    scores["alive"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except:
                    pass
            elif line.startswith("THEME:"):
                try:
                    scores["theme"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except:
                    pass
            elif line.startswith("POLISH:"):
                try:
                    scores["polish"] = int(''.join(filter(str.isdigit, line.split(":")[1][:3])))
                except:
                    pass
            elif line.startswith("VERDICT:"):
                v = line.split(":")[1].strip()
                if "SHIP" in v:
                    scores["verdict"] = "SHIP"
                elif "NEEDS" in v or "WORK" in v:
                    scores["verdict"] = "NEEDS_WORK"
                else:
                    scores["verdict"] = "BROKEN"

        return scores

    except Exception as e:
        print(f"[Judge {agent_id}] Error: {str(e)[:80]}")
        return None


def run_judge_phase(anthropic_client: anthropic.Anthropic):
    """Screenshot and judge all completed games."""
    update_status(global_updates={"phase": "judging"})

    # Get list of completed agents
    status = json.loads(STATUS_FILE.read_text())
    completed = [a for a in status["agents"] if a["status"] == "done"]

    print(f"\n[Judge] Starting visual QA for {len(completed)} games...")
    print(f"[Judge] Taking screenshots at {SCREENSHOT_DELAY}s delay...\n")

    for agent in completed:
        agent_id = agent["id"]
        theme = THEMES[agent_id]

        update_status(agent_id, {"status": "judging"})
        print(f"[Judge {agent_id}] Screenshotting {theme['name']}...")

        # Take screenshot
        screenshot = take_screenshot(agent_id)
        if screenshot:
            update_status(agent_id, {"screenshot": screenshot})
            print(f"[Judge {agent_id}] Rating with Claude Vision...")

            # Judge with Claude
            scores = judge_game(agent_id, anthropic_client)
            if scores:
                update_status(agent_id, {"scores": scores, "status": "done"})
                print(f"[Judge {agent_id}] {theme['name']}: A={scores['alive']} T={scores['theme']} P={scores['polish']} -> {scores['verdict']}")
            else:
                update_status(agent_id, {"status": "done"})
                print(f"[Judge {agent_id}] Failed to get rating")
        else:
            update_status(agent_id, {"status": "done"})
            print(f"[Judge {agent_id}] Screenshot failed")


def main():
    # Check API keys
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
    print("T6 EXPERIMENT: Visual QA Dashboard")
    print("=" * 60)
    print(f"Generator: {MODEL}")
    print(f"Judge: {JUDGE_MODEL}")
    print(f"Agents: {NUM_AGENTS}")
    print(f"Screenshot delay: {SCREENSHOT_DELAY}s")
    print()

    # Setup
    create_dashboard()
    init_status()

    print(f"[Dashboard] http://localhost:3000/pixelpit/swarm/t6/index.html")
    print("=" * 60)
    print()

    # Phase 1: Generate games
    print("[Phase 1] Generating games...\n")
    start_time = time.time()

    with ThreadPoolExecutor(max_workers=NUM_AGENTS) as executor:
        futures = [executor.submit(run_agent, i, together_client) for i in range(NUM_AGENTS)]
        for f in as_completed(futures):
            f.result()

    gen_time = time.time() - start_time
    print(f"\n[Phase 1] Generation complete in {gen_time:.1f}s")

    # Phase 2: Judge games
    print("\n[Phase 2] Visual QA...\n")
    judge_start = time.time()

    run_judge_phase(anthropic_client)

    judge_time = time.time() - judge_start
    print(f"\n[Phase 2] Judging complete in {judge_time:.1f}s")

    # Finalize
    finalize_status()

    # Summary
    status = json.loads(STATUS_FILE.read_text())
    shipped = sum(1 for a in status["agents"] if a.get("scores", {}).get("verdict") == "SHIP")
    needs_work = sum(1 for a in status["agents"] if a.get("scores", {}).get("verdict") == "NEEDS_WORK")
    broken = sum(1 for a in status["agents"] if a.get("scores", {}).get("verdict") == "BROKEN")

    total_time = time.time() - start_time
    print()
    print("=" * 60)
    print(f"COMPLETE in {total_time:.1f}s")
    print(f"  ✅ SHIP: {shipped}")
    print(f"  ⚠️  NEEDS_WORK: {needs_work}")
    print(f"  💀 BROKEN: {broken}")
    print()
    print(f"Dashboard: http://localhost:3000/pixelpit/swarm/t6/index.html")
    print("=" * 60)


if __name__ == "__main__":
    main()
