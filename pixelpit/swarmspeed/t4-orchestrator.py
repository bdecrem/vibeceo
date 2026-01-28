#!/usr/bin/env python3
"""
T4 EXPERIMENT: Pop the Balloon - 10 Wild Reskins

Give agents working reference code, let them go wild on the theme.
Same mechanics, wildly different visuals.

Usage:
  python t4-orchestrator.py

Output: web/public/pixelpit/swarm/t4/agent_N.html
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

REPO_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "t4"
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

# Reference code - clean, working, easy to understand
REFERENCE_CODE = '''<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Pop Game</title>
<style>body{margin:0;background:#111;overflow:hidden}canvas{display:block}</style>
</head><body><canvas id=c></canvas>
<script>
const c=document.getElementById('c'),ctx=c.getContext('2d');
let W,H;function resize(){W=c.width=innerWidth;H=c.height=innerHeight}resize();onresize=resize;

let score=0, targets=[];

function spawn(){
  targets.push({x:Math.random()*W, y:H+50, r:30, speed:1+Math.random()*2, color:'#ff4466'});
}

function update(){
  targets.forEach(t=>t.y-=t.speed);
  targets=targets.filter(t=>t.y>-50);
  if(Math.random()<0.03)spawn();
}

function draw(){
  ctx.fillStyle='#111';ctx.fillRect(0,0,W,H);
  // Draw targets
  targets.forEach(t=>{
    ctx.fillStyle=t.color;
    ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();
  });
  // Draw score
  ctx.fillStyle='#fff';ctx.font='24px sans-serif';
  ctx.fillText('Score: '+score,20,40);
}

function pop(x,y){
  for(let i=targets.length-1;i>=0;i--){
    const t=targets[i];
    if(Math.hypot(x-t.x,y-t.y)<t.r){
      targets.splice(i,1);score++;return;
    }
  }
}

c.onclick=e=>pop(e.clientX,e.clientY);
c.ontouchstart=e=>{e.preventDefault();pop(e.touches[0].clientX,e.touches[0].clientY)};

function loop(){update();draw();requestAnimationFrame(loop)}
loop();
</script></body></html>'''

# 10 wildly different themes
THEMES = [
    ("SOAP BUBBLES", "Iridescent soap bubbles floating up. Rainbow shimmer, transparent, pop with a sparkle burst. Soft pastel background."),
    ("FIREFLIES", "Glowing fireflies in a dark forest at night. Yellow-green glow, twinkle effect, fade out when caught. Dark blue-green background with subtle trees."),
    ("SPACE ROCKS", "Asteroids tumbling through space. Rocky gray textures, rotation animation, explosion particles when destroyed. Starfield background."),
    ("CANDY POP", "Colorful lollipops and gummies rising up. Bright saturated colors, swirl patterns, sweet particle burst. Pink/purple candy land background."),
    ("GHOSTS", "Cute spooky ghosts floating up. White with simple faces, wobble animation, fade away when tapped. Dark purple haunted background."),
    ("DEEP SEA", "Bioluminescent jellyfish rising from the deep. Glowing tentacles, pulse animation, dissolve effect. Dark ocean gradient background."),
    ("NEON SIGNS", "Glowing neon shapes floating up. Electric pink/cyan/yellow, flicker effect, shatter into light. Dark city night background."),
    ("FRUIT SPLASH", "Fresh fruits bouncing up. Oranges, apples, lemons - juice splatter when tapped. Light kitchen/garden background."),
    ("EMOJI MADNESS", "Random emoji faces floating up. Different expressions, spin animation, burst into smaller emojis. Gradient party background."),
    ("PIXEL RETRO", "8-bit pixel art balloons. Chunky pixels, limited color palette, retro explosion. CRT scanline effect on dark background."),
]

PROMPT_TEMPLATE = """You are reskinning a simple "pop the targets" game. Here is the working reference code:

```html
{reference}
```

YOUR TASK: Reskin this game with the theme below. Keep the EXACT same game mechanics (spawn, float up, tap to pop, score). Change ONLY the visuals:

THEME: {theme_name}
STYLE: {theme_desc}

WHAT TO CHANGE:
- Background color/style
- Target appearance (shape, color, effects)
- Pop/destroy effect (particles, animation)
- Score display style
- Add theme-appropriate visual polish (glow, shadows, animations)

KEEP THE SAME:
- Spawn rate and logic
- Float speed
- Tap/click detection
- Score counting

OUTPUT: Complete reskinned HTML file. No explanation. Start with <!DOCTYPE html>
"""


def run_agent(agent_id: int, client: Together) -> dict:
    theme = THEMES[agent_id % len(THEMES)]
    theme_name, theme_desc = theme

    prompt = PROMPT_TEMPLATE.format(
        reference=REFERENCE_CODE,
        theme_name=theme_name,
        theme_desc=theme_desc,
    )

    filename = f"agent_{agent_id}.html"
    output_path = OUTPUT_DIR / filename

    print(f"[Agent {agent_id}] Starting: {theme_name}")
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

        input_tokens = response.usage.prompt_tokens if response.usage else 0
        output_tokens = response.usage.completion_tokens if response.usage else 0

        elapsed = time.time() - start_time
        print(f"[Agent {agent_id}] Done in {elapsed:.1f}s - {output_tokens} tokens")

        return {
            "agent_id": agent_id,
            "success": True,
            "theme": theme_name,
            "file": str(output_path),
            "url": f"http://localhost:3000/pixelpit/swarm/t4/{filename}",
            "tokens": {"input": input_tokens, "output": output_tokens},
            "time": elapsed,
        }

    except Exception as e:
        return {
            "agent_id": agent_id,
            "success": False,
            "error": str(e),
            "time": time.time() - start_time,
        }


def main():
    api_key = os.environ.get("TOGETHER_API_KEY")
    if not api_key:
        print("ERROR: TOGETHER_API_KEY not found")
        sys.exit(1)

    client = Together(api_key=api_key)

    print("=" * 60)
    print("T4 EXPERIMENT: Pop the Balloon - 10 Wild Reskins")
    print("=" * 60)
    print(f"Model: {MODEL}")
    print(f"Agents: {NUM_AGENTS}")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)
    print()

    start_time = time.time()

    with ThreadPoolExecutor(max_workers=NUM_AGENTS) as executor:
        futures = [executor.submit(run_agent, i, client) for i in range(NUM_AGENTS)]
        results = [f.result() for f in futures]

    total_time = time.time() - start_time

    print()
    print("=" * 60)
    print("RESULTS")
    print("=" * 60)

    success_count = 0
    total_input_tokens = 0
    total_output_tokens = 0

    for r in results:
        if r["success"]:
            success_count += 1
            total_input_tokens += r["tokens"]["input"]
            total_output_tokens += r["tokens"]["output"]
            print(f"✓ Agent {r['agent_id']}: {r['theme']} ({r['time']:.1f}s)")
            print(f"  → {r['url']}")
        else:
            print(f"✗ Agent {r['agent_id']}: {r['error'][:50]}")

    print()
    print(f"Success: {success_count}/{NUM_AGENTS}")
    print(f"Total time: {total_time:.1f}s")
    print(f"Tokens: {total_input_tokens:,} in / {total_output_tokens:,} out")

    cost = (total_input_tokens * 0.05 + total_output_tokens * 0.20) / 1_000_000
    print(f"Estimated cost: ${cost:.4f}")

    results_path = OUTPUT_DIR / "results.json"
    results_path.write_text(json.dumps({
        "timestamp": datetime.now().isoformat(),
        "model": MODEL,
        "experiment": "Pop the Balloon Reskins",
        "agents": NUM_AGENTS,
        "success_count": success_count,
        "total_time": total_time,
        "total_tokens": {"input": total_input_tokens, "output": total_output_tokens},
        "cost_usd": cost,
        "results": results,
    }, indent=2))
    print(f"\nResults saved: {results_path}")


if __name__ == "__main__":
    main()
