#!/usr/bin/env python3
"""
T3 EXPERIMENT: Core Mechanic Feel Tests

Game studio R&D - each agent explores ONE core mechanic with different tunings.
Interactive toys for designers to feel the difference.

Usage:
  python t3-orchestrator.py

Output: web/public/pixelpit/swarm/t3/agent_N.html
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

REPO_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "t3"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

from dotenv import load_dotenv
env_path = REPO_ROOT / "sms-bot" / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
    print(f"[ENV] Loaded from {env_path}")

from together import Together

MODEL = "openai/gpt-oss-20b"
NUM_AGENTS = 5
MAX_TOKENS = 4000

# Each mechanic is a focused feel test
MECHANICS = [
    {
        "name": "JUMP FEEL",
        "mechanic": "platformer jump",
        "description": """A simple platformer jump test. One character, flat ground.

FEATURES TO IMPLEMENT:
- Variable jump height (tap vs hold)
- Gravity that increases on fall (fast fall)
- Coyote time (can still jump briefly after leaving edge)
- Jump buffer (press jump slightly before landing)
- Subtle squash/stretch on land and takeoff

CONTROLS: Tap/Space to jump. Show current jump parameters on screen.
Include 3 preset buttons: "Floaty", "Snappy", "Heavy" that change the feel."""
    },
    {
        "name": "DASH FEEL",
        "mechanic": "action game dash",
        "description": """A dash/dodge mechanic test. Character in open space.

FEATURES TO IMPLEMENT:
- Quick burst of movement in facing direction
- Brief invincibility frames (show with flash/ghost effect)
- Afterimage trail during dash
- Cooldown indicator (simple bar)
- Screen shake on dash start

CONTROLS: Click/tap direction to dash toward it. Arrow keys to move normally.
Include 3 presets: "Ninja" (fast, short), "Heavy" (slow startup, far), "Blink" (instant teleport)."""
    },
    {
        "name": "PROJECTILE FEEL",
        "mechanic": "shooter projectiles",
        "description": """A projectile/shooting feel test. Turret at bottom, targets above.

FEATURES TO IMPLEMENT:
- Click to shoot toward cursor
- Muzzle flash effect
- Projectile trail/glow
- Screen shake on fire
- Impact particles when hitting targets
- Targets respawn after hit

CONTROLS: Click to shoot.
Include 3 presets: "Pistol" (single, accurate), "Shotgun" (spread), "Laser" (instant beam)."""
    },
    {
        "name": "SWING FEEL",
        "mechanic": "grapple/swing",
        "description": """A grappling hook swing test. Character with rope physics.

FEATURES TO IMPLEMENT:
- Click anywhere to shoot grapple to that point
- Rope physics with tension and swing momentum
- Release with second click, maintain velocity
- Rope visualized as line with slight curve
- Character swings naturally with gravity

CONTROLS: Click to grapple to point, click again to release.
Include 3 presets: "Spider" (elastic, bouncy), "Tarzan" (rigid rope), "Floaty" (low gravity)."""
    },
    {
        "name": "IMPACT FEEL",
        "mechanic": "hit/impact feedback",
        "description": """A combat impact feel test. Player attacks enemy.

FEATURES TO IMPLEMENT:
- Click on enemy to attack
- Hit stop (brief freeze frame on impact)
- Screen shake
- Enemy knockback
- Particle burst on hit
- Flash white on damage
- Health bar that depletes

CONTROLS: Click enemy to hit them.
Include 3 presets: "Light" (fast, small), "Heavy" (big pause, huge shake), "Combo" (rapid multi-hit)."""
    },
]

PROMPT_TEMPLATE = """Create a game mechanic feel test for game designers.

MECHANIC: {name} - {mechanic}

{description}

REQUIREMENTS:
- Single HTML file with inline CSS/JS
- HTML5 Canvas, 60fps
- Dark background (#1a1a2e)
- Accent color: #00ff88
- Clean minimal UI
- Mobile touch + desktop controls
- Show mechanic name in corner
- 3 preset buttons to switch feels
- Under 100 lines
- NO external dependencies

This is a DESIGN TOOL - make the differences between presets OBVIOUS and SATISFYING.

OUTPUT: Just the HTML, no explanation. Start with <!DOCTYPE html>
"""


def run_agent(agent_id: int, client: Together) -> dict:
    mechanic = MECHANICS[agent_id % len(MECHANICS)]

    prompt = PROMPT_TEMPLATE.format(
        name=mechanic["name"],
        mechanic=mechanic["mechanic"],
        description=mechanic["description"],
    )

    filename = f"agent_{agent_id}.html"
    output_path = OUTPUT_DIR / filename

    print(f"[Agent {agent_id}] Starting: {mechanic['name']}")
    start_time = time.time()

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=MAX_TOKENS,
            temperature=0.7,
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
            "mechanic": mechanic["name"],
            "file": str(output_path),
            "url": f"http://localhost:3000/pixelpit/swarm/t3/{filename}",
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
    print("T3 EXPERIMENT: Core Mechanic Feel Tests")
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
            print(f"✓ Agent {r['agent_id']}: {r['mechanic']} ({r['time']:.1f}s)")
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
        "experiment": "Core Mechanic Feel Tests",
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
