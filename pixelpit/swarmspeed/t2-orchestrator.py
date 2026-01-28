#!/usr/bin/env python3
"""
T2 EXPERIMENT: Bouncing Ball - Nintendo Switch Vibes

Simple bouncing ball toy with playful Nintendo-style aesthetics.
Uses Together.ai with OpenAI gpt-oss-20b.

Usage:
  python t2-orchestrator.py

Output: web/public/pixelpit/swarm/t2/agent_N.html
"""

import os
import sys
import json
import time
from pathlib import Path
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

# Paths
REPO_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "t2"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Load env from sms-bot/.env.local
from dotenv import load_dotenv
env_path = REPO_ROOT / "sms-bot" / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
    print(f"[ENV] Loaded from {env_path}")

# Together.ai SDK
from together import Together

MODEL = "openai/gpt-oss-20b"  # $0.05/$0.20 per 1M tokens

# Experiment config
NUM_AGENTS = 5
MAX_TOKENS = 4000

# Nintendo Switch inspired color palettes
THEMES = [
    ("JOY-CON RED", "#1a1a2e", "#ff3860", "#ffdd57", "Bright and playful like the red Joy-Con"),
    ("JOY-CON BLUE", "#0f0f23", "#209cee", "#00d1b2", "Cool and fresh like the blue Joy-Con"),
    ("SPLATOON", "#1a1a2e", "#ff6b9d", "#7bed9f", "Ink splatter energy, chaotic and fun"),
    ("MARIO COIN", "#16213e", "#ffd700", "#ff6348", "Golden and cheerful like collecting coins"),
    ("KIRBY PINK", "#1e1e2f", "#ff9ff3", "#54a0ff", "Soft, round, and adorable"),
]

PROMPT_TEMPLATE = """Create a fun bouncing ball HTML toy with Nintendo Switch vibes.

STYLE: {theme_name}
BACKGROUND: {bg_color}
BALL COLOR: {primary_color}
ACCENT: {accent_color}
VIBE: {flavor}

REQUIREMENTS:
- Single HTML file with inline CSS and JavaScript
- HTML5 Canvas, 60fps with requestAnimationFrame
- One bouncy ball that bounces off all walls
- Tap/click anywhere to give the ball a random velocity boost
- Ball leaves a short fading trail (last 10-20 positions)
- Satisfying "boing" feel - slightly squash on bounce
- Round corners on everything, soft shadows
- Fun particle burst on each bounce
- Display bounce counter in corner
- Mobile-friendly (touch events)
- Under 80 lines total
- NO external dependencies

AESTHETIC:
- Playful, colorful, satisfying
- Smooth animations
- That Nintendo polish feeling

OUTPUT: Just the HTML file, no explanation. Start immediately with <!DOCTYPE html>
"""


def run_agent(agent_id: int, client: Together) -> dict:
    """Run one agent to generate a game."""
    theme = THEMES[agent_id % len(THEMES)]
    theme_name, bg_color, primary_color, accent_color, flavor = theme

    prompt = PROMPT_TEMPLATE.format(
        theme_name=theme_name,
        bg_color=bg_color,
        primary_color=primary_color,
        accent_color=accent_color,
        flavor=flavor,
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

        input_tokens = response.usage.prompt_tokens if response.usage else 0
        output_tokens = response.usage.completion_tokens if response.usage else 0

        elapsed = time.time() - start_time
        print(f"[Agent {agent_id}] Done in {elapsed:.1f}s - {output_tokens} tokens")

        return {
            "agent_id": agent_id,
            "success": True,
            "theme": theme_name,
            "file": str(output_path),
            "url": f"http://localhost:3000/pixelpit/swarm/t2/{filename}",
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
    """Run all agents in parallel."""
    api_key = os.environ.get("TOGETHER_API_KEY")
    if not api_key:
        print("ERROR: TOGETHER_API_KEY not found in environment")
        sys.exit(1)

    client = Together(api_key=api_key)

    print("=" * 60)
    print("T2 EXPERIMENT: Bouncing Ball - Nintendo Switch Vibes")
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

    # Cost estimate ($0.05 input, $0.20 output per 1M tokens)
    cost = (total_input_tokens * 0.05 + total_output_tokens * 0.20) / 1_000_000
    print(f"Estimated cost: ${cost:.4f}")

    results_path = OUTPUT_DIR / "results.json"
    results_path.write_text(json.dumps({
        "timestamp": datetime.now().isoformat(),
        "model": MODEL,
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
