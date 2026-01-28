#!/usr/bin/env python3
"""
T1 EXPERIMENT: 10 Agents Race to Build Catch Games

Each agent builds a catch-the-falling-objects game with their own theme/style.
Uses Together.ai with DeepSeek R1 Distilled Qwen 14B.

Usage:
  export TOGETHER_API_KEY=xxx
  python t1-orchestrator.py

Output: web/public/pixelpit/swarm/t1/agent_N.html
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
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "t1"
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
NUM_AGENTS = 10
MAX_TOKENS = 2500  # Keep under 60-second constraint

# Theme options for variety
THEMES = [
    ("NEON CITY", "#0a0a0a", "#00ff88", "#ff00ff", "Catch glowing data packets falling from the cyber sky"),
    ("DEEP OCEAN", "#001122", "#00ffff", "#0066ff", "Catch bioluminescent creatures sinking in the abyss"),
    ("VOLCANO", "#1a0000", "#ff4400", "#ffcc00", "Catch falling embers before they hit the lava"),
    ("ARCTIC", "#0a1628", "#88ffff", "#ffffff", "Catch snowflakes in a frozen tundra"),
    ("CANDY LAND", "#220022", "#ff66cc", "#ffff00", "Catch falling candies and sweets"),
    ("SPACE", "#000011", "#9966ff", "#ff6600", "Catch asteroids hurtling through the cosmos"),
    ("JUNGLE", "#001100", "#00ff00", "#88ff00", "Catch falling fruits from the canopy"),
    ("DESERT", "#1a1100", "#ffaa00", "#ff6600", "Catch golden treasures in a sandstorm"),
    ("SYNTHWAVE", "#0f0020", "#ff0080", "#00ffff", "Catch retro synth pulses on the grid"),
    ("HAUNTED", "#0a0a0a", "#8800ff", "#00ff88", "Catch ghost orbs in the midnight cemetery"),
]

PROMPT_TEMPLATE = """Create a complete HTML game file for a catch-the-falling-objects arcade game.

THEME: {theme_name}
BACKGROUND COLOR: {bg_color}
PRIMARY COLOR: {primary_color}
ACCENT COLOR: {accent_color}
FLAVOR: {flavor}

REQUIREMENTS:
- Single HTML file with inline CSS and JavaScript
- HTML5 Canvas for rendering
- 60fps with requestAnimationFrame
- Mobile-friendly (touch events for paddle control)
- Objects fall from top, player catches with paddle at bottom
- Score counter in corner
- Game over after 5 misses
- "Tap to start" / "Tap to restart" functionality
- Under 120 lines total
- NO external dependencies

STYLE GUIDE:
- Dark background ({bg_color})
- Glowing objects in {primary_color}
- Paddle/UI in {accent_color}
- Add glow effects (shadowBlur)
- Clean, minimal aesthetic

OUTPUT: Just the complete HTML file, nothing else. Start with <!DOCTYPE html>
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
            temperature=0.7,
        )

        # Extract the generated content
        content = response.choices[0].message.content

        # Extract HTML (in case model adds explanation)
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

        # Write the file
        output_path.write_text(content)

        # Get token usage
        input_tokens = response.usage.prompt_tokens if response.usage else 0
        output_tokens = response.usage.completion_tokens if response.usage else 0

        elapsed = time.time() - start_time
        print(f"[Agent {agent_id}] Done in {elapsed:.1f}s - {output_tokens} tokens")

        return {
            "agent_id": agent_id,
            "success": True,
            "theme": theme_name,
            "file": str(output_path),
            "url": f"http://localhost:3000/pixelpit/swarm/t1/{filename}",
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
    print("T1 EXPERIMENT: 10 Catch Game Variants")
    print("=" * 60)
    print(f"Model: {MODEL}")
    print(f"Agents: {NUM_AGENTS}")
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)
    print()

    start_time = time.time()

    # Run all agents in parallel using ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=NUM_AGENTS) as executor:
        futures = [executor.submit(run_agent, i, client) for i in range(NUM_AGENTS)]
        results = [f.result() for f in futures]

    total_time = time.time() - start_time

    # Summary
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

    # Cost estimate ($0.18 input, $0.18 output per 1M tokens)
    cost = (total_input_tokens * 0.18 + total_output_tokens * 0.18) / 1_000_000
    print(f"Estimated cost: ${cost:.4f}")

    # Save results
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
