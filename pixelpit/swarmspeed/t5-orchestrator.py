#!/usr/bin/env python3
"""
T5 EXPERIMENT: Live Dashboard - Watch Agents Work

Creates a live-updating dashboard. As each agent completes,
their box fills in and becomes clickable.

Usage:
  python t5-orchestrator.py

Output:
  web/public/pixelpit/swarm/t5/index.html (dashboard)
  web/public/pixelpit/swarm/t5/status.json (live status)
  web/public/pixelpit/swarm/t5/agent_N.html (artifacts)
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

REPO_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "t5"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

from dotenv import load_dotenv
env_path = REPO_ROOT / "sms-bot" / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
    print(f"[ENV] Loaded from {env_path}")

from together import Together

MODEL = "openai/gpt-oss-20b"
NUM_AGENTS = 10
MAX_TOKENS = 3000

# Status file for live updates
STATUS_FILE = OUTPUT_DIR / "status.json"
status_lock = threading.Lock()

# Reference code
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
            }
            for i in range(NUM_AGENTS)
        ]
    }
    STATUS_FILE.write_text(json.dumps(status, indent=2))
    return status


def update_status(agent_id, updates):
    """Thread-safe status update."""
    with status_lock:
        status = json.loads(STATUS_FILE.read_text())
        status["agents"][agent_id].update(updates)
        STATUS_FILE.write_text(json.dumps(status, indent=2))


def finalize_status():
    """Mark experiment as complete."""
    with status_lock:
        status = json.loads(STATUS_FILE.read_text())
        status["completed"] = datetime.now().isoformat()
        STATUS_FILE.write_text(json.dumps(status, indent=2))


def create_dashboard():
    """Create the dashboard HTML."""
    html = '''<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SWARM T5 - Live Dashboard</title>
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
.status.running { color: #ffaa00; }
.status.done { color: #00ff88; }
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
  max-width: 1200px;
}
.card {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 20px;
  border: 2px solid #333;
  transition: all 0.3s ease;
  cursor: default;
}
.card.pending {
  opacity: 0.4;
}
.card.running {
  border-color: #ffaa00;
  animation: pulse 1s infinite;
}
.card.done {
  cursor: pointer;
  border-color: var(--color);
  box-shadow: 0 0 20px var(--color-dim);
}
.card.done:hover {
  transform: translateY(-3px);
  box-shadow: 0 5px 30px var(--color-dim);
}
.card.error {
  border-color: #ff4444;
  opacity: 0.6;
}
@keyframes pulse {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.card-name {
  font-weight: 600;
  font-size: 14px;
}
.card-id {
  color: #666;
  font-size: 12px;
}
.card-desc {
  color: #888;
  font-size: 12px;
  margin-bottom: 10px;
}
.card-status {
  font-size: 11px;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
}
.card.pending .card-status { background: #333; color: #666; }
.card.running .card-status { background: #332200; color: #ffaa00; }
.card.done .card-status { background: #003322; color: #00ff88; }
.card.error .card-status { background: #330000; color: #ff4444; }
.preview {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.9);
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
<h1>🐝 SWARM T5 — Live Dashboard</h1>
<div class="status" id="status">Loading...</div>
<div class="grid" id="grid"></div>

<div class="preview" id="preview">
  <div class="preview-header">
    <span class="preview-title" id="preview-title"></span>
    <button class="preview-close" onclick="closePreview()">✕ Close</button>
  </div>
  <iframe id="preview-iframe"></iframe>
</div>

<script>
const grid = document.getElementById('grid');
const statusEl = document.getElementById('status');
let lastData = null;

function render(data) {
  // Update status
  const pending = data.agents.filter(a => a.status === 'pending').length;
  const running = data.agents.filter(a => a.status === 'running').length;
  const done = data.agents.filter(a => a.status === 'done').length;
  const errors = data.agents.filter(a => a.status === 'error').length;

  if (data.completed) {
    statusEl.className = 'status done';
    statusEl.textContent = `✓ Complete — ${done} succeeded, ${errors} failed`;
  } else if (running > 0) {
    statusEl.className = 'status running';
    statusEl.textContent = `⟳ Running — ${done} done, ${running} in progress, ${pending} pending`;
  } else {
    statusEl.className = 'status';
    statusEl.textContent = 'Waiting for agents...';
  }

  // Update grid
  grid.innerHTML = data.agents.map(a => `
    <div class="card ${a.status}"
         style="--color: ${a.color}; --color-dim: ${a.color}44"
         ${a.status === 'done' ? `onclick="openPreview('${a.name}', '${a.url}')"` : ''}>
      <div class="card-header">
        <span class="card-name">${a.name}</span>
        <span class="card-id">#${a.id}</span>
      </div>
      <div class="card-desc">${a.desc}</div>
      <span class="card-status">
        ${a.status === 'pending' ? '○ Pending' : ''}
        ${a.status === 'running' ? '◐ Running...' : ''}
        ${a.status === 'done' ? `● ${a.time}s` : ''}
        ${a.status === 'error' ? '✕ Error' : ''}
      </span>
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
    print(f"[Dashboard] Created: http://localhost:3000/pixelpit/swarm/t5/")


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
    theme = THEMES[agent_id]

    update_status(agent_id, {"status": "running"})

    prompt = PROMPT_TEMPLATE.format(
        reference=REFERENCE_CODE,
        theme_name=theme["name"],
        theme_desc=theme["desc"],
    )

    filename = f"agent_{agent_id}.html"
    output_path = OUTPUT_DIR / filename
    url = f"agent_{agent_id}.html"

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

        print(f"[Agent {agent_id}] Done in {elapsed}s - {tokens} tokens")

        update_status(agent_id, {
            "status": "done",
            "time": elapsed,
            "tokens": tokens,
            "url": url,
        })

        return {"success": True, "agent_id": agent_id}

    except Exception as e:
        print(f"[Agent {agent_id}] Error: {str(e)[:50]}")
        update_status(agent_id, {"status": "error"})
        return {"success": False, "agent_id": agent_id, "error": str(e)}


def main():
    api_key = os.environ.get("TOGETHER_API_KEY")
    if not api_key:
        print("ERROR: TOGETHER_API_KEY not found")
        sys.exit(1)

    client = Together(api_key=api_key)

    print("=" * 60)
    print("T5 EXPERIMENT: Live Dashboard")
    print("=" * 60)
    print(f"Model: {MODEL}")
    print(f"Agents: {NUM_AGENTS}")
    print()

    # Setup
    create_dashboard()
    init_status()

    print(f"[Dashboard] Open: http://localhost:3000/pixelpit/swarm/t5/")
    print("=" * 60)
    print()

    start_time = time.time()

    with ThreadPoolExecutor(max_workers=NUM_AGENTS) as executor:
        futures = [executor.submit(run_agent, i, client) for i in range(NUM_AGENTS)]
        for f in as_completed(futures):
            f.result()

    finalize_status()

    total_time = time.time() - start_time
    print()
    print("=" * 60)
    print(f"COMPLETE in {total_time:.1f}s")
    print(f"Dashboard: http://localhost:3000/pixelpit/swarm/t5/")
    print("=" * 60)


if __name__ == "__main__":
    main()
