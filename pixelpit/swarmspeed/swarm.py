#!/usr/bin/env python3
"""
SWARM - 3 agents race to build your thing. Judge picks the winner.

Usage: python swarm.py "bouncing pink cube"

URLs print as agents finish. Judge announces winner.
"""

import sys
import asyncio
import subprocess
import base64
import anthropic
from pathlib import Path
from datetime import datetime

# Load env
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent.parent / "sms-bot" / ".env.local")

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient

REPO_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm"
SCREENSHOT_DIR = OUTPUT_DIR / "screenshots"
CATALOGUE_PATH = Path(__file__).parent / "games-catalogue.json"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
SCREENSHOT_DIR.mkdir(parents=True, exist_ok=True)

MODEL = "claude-opus-4-5-20251101"
BASE_URL = "http://localhost:3000/pixelpit/swarm"

import json
def load_catalogue():
    with open(CATALOGUE_PATH) as f:
        return json.load(f)

PROMPT_TEMPLATE = """You are a game designer in a competition. You must create a unique arcade game.

## STEP 1: PICK YOUR COMBO

Randomly pick ONE from each list (don't overthink, just pick):

### GAME MECHANICS (pick one):
{games_list}

### ART STYLES (pick one):
{styles_list}

### CONCEPT SEEDS (pick one as inspiration, then riff on it):
{concepts_list}

## STEP 2: DESIGN YOUR GAME

Take your picked mechanic + style + concept seed and CREATE something unique.

The concept seed is just a starting point - riff off that idea to land on a great concept that fits your style and game type. Make it yours.

## STEP 3: BUILD IT

Create a single HTML file with:
- ONE self-contained HTML file (inline CSS + JS)
- Apply your chosen art style faithfully (colors, textures, mood)
- The core mechanic from your picked game
- Your unique concept twist
- 60fps animation with requestAnimationFrame
- Mobile-friendly (touch events)
- Under 150 lines
- No external dependencies

Write the file to: {output_path}

When done, output: DONE: [game name] - [one sentence description]
"""


async def run_agent(agent_id: str, catalogue: dict = None) -> str:
    """Run one agent, return URL when done."""
    timestamp = datetime.now().strftime("%H%M%S")
    filename = f"{agent_id}_{timestamp}.html"
    output_path = OUTPUT_DIR / filename
    url = f"{BASE_URL}/{filename}"

    # Format the catalogue lists
    games_list = "\n".join([f"- {g['name']}: {g['mechanic']}" for g in catalogue["games"]])
    styles_list = "\n".join([f"- {s['name']}: {s['desc']}" for s in catalogue["styles"]])
    concepts_list = "\n".join([f"- {c}" for c in catalogue["concepts"]])

    prompt = PROMPT_TEMPLATE.format(
        games_list=games_list,
        styles_list=styles_list,
        concepts_list=concepts_list,
        output_path=str(output_path)
    )

    options = ClaudeAgentOptions(
        model=MODEL,
        permission_mode="acceptEdits",
        allowed_tools=["Write"],
        cwd=str(REPO_ROOT),
    )

    try:
        async with ClaudeSDKClient(options=options) as client:
            await client.query(prompt)
            async for _ in client.receive_response():
                pass  # Just wait for completion

        if output_path.exists():
            print(f"\n→ {url}")
            return url
        else:
            print(f"\n✗ {agent_id} failed (no file)")
            return None
    except Exception as e:
        print(f"\n✗ {agent_id} error: {e}")
        return None


SCREENSHOT_SCRIPT = Path(__file__).parent / "screenshot.mjs"

def take_screenshot(url: str, output_path: Path) -> bool:
    """Take a screenshot with Node Playwright."""
    try:
        result = subprocess.run(
            ["node", str(SCREENSHOT_SCRIPT), url, str(output_path)],
            capture_output=True,
            text=True,
            timeout=15
        )
        return output_path.exists()
    except Exception as e:
        print(f"    Screenshot error: {e}")
        return False


def judge_screenshots(prompt: str, entries: list[tuple[str, Path, Path]]) -> str:
    """Judge which entry is best. Each entry is (url, screenshot_path, html_path). Returns winning URL."""
    client = anthropic.Anthropic()

    content = [
        {
            "type": "text",
            "text": f"""You are judging 3 competing implementations of: "{prompt}"

For each option you'll see:
1. A screenshot (gameplay in action)
2. The HTML/JS code

Pick the BEST one based on:
- Visual polish (glow, colors, style)
- Code quality (clean, clever, complete)
- Does it match the prompt?
- Overall: would this be fun to play?

Reply with ONLY the number (1, 2, or 3) of the winner. Nothing else."""
        }
    ]

    for i, (url, shot_path, html_path) in enumerate(entries, 1):
        content.append({
            "type": "text",
            "text": f"\n\n=== OPTION {i} ==="
        })

        # Add screenshot
        if shot_path.exists():
            with open(shot_path, "rb") as f:
                img_data = base64.standard_b64encode(f.read()).decode("utf-8")
            content.append({
                "type": "image",
                "source": {
                    "type": "base64",
                    "media_type": "image/png",
                    "data": img_data
                }
            })

        # Add code
        if html_path.exists():
            code = html_path.read_text()[:8000]  # Limit size
            content.append({
                "type": "text",
                "text": f"\nCode:\n```html\n{code}\n```"
            })

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=10,
        messages=[{"role": "user", "content": content}]
    )

    return response.content[0].text.strip()


async def main():
    # Load catalogue
    catalogue = load_catalogue()
    print(f"SWARM: {len(catalogue['games'])} games × {len(catalogue['styles'])} styles × {len(catalogue['concepts'])} concepts")
    print("Each agent picks their own combo...")
    print("Racing 3 agents...\n")

    # Race the agents
    tasks = [
        run_agent("a1", catalogue),
        run_agent("a2", catalogue),
        run_agent("a3", catalogue),
    ]
    urls = await asyncio.gather(*tasks)
    urls = [u for u in urls if u]  # Filter None

    if len(urls) < 2:
        print("\nNot enough results to judge.")
        return

    # Take screenshots
    print("\n📸 Taking screenshots...")
    entries = []  # (url, screenshot_path, html_path)
    for url in urls:
        filename = url.split("/")[-1]
        shot_path = SCREENSHOT_DIR / f"{filename}.png"
        html_path = OUTPUT_DIR / filename
        if take_screenshot(url, shot_path):
            entries.append((url, shot_path, html_path))
            print(f"  ✓ {filename}")
        else:
            print(f"  ✗ {filename} (failed)")

    if len(entries) < 2:
        print("\nNot enough screenshots to judge.")
        return

    # Judge
    print("\n⚖️  Judging (screenshot + code)...")
    winner_num = judge_screenshots(description, entries)

    try:
        winner_idx = int(winner_num) - 1
        winner_url = entries[winner_idx][0]
        print(f"\n🏆 WINNER: {winner_url}")
    except:
        print(f"\nJudge said: {winner_num}")
        print(f"Best guess: {entries[0][0]}")


if __name__ == "__main__":
    asyncio.run(main())
