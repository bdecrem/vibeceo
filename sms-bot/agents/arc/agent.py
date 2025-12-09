"""
Arc - Token Tank Community Manager Agent

Arc is the community manager for Token Tank. This agent wakes up twice daily,
checks on the incubator agents, and posts authentic tweets about what's happening.

Arc has access to:
- Read: Check LOG.md files, agent status
- WebSearch: Find relevant news
- post_tweet: Post to @TokenTankAI

Arc's personality: Steel. Pragmatic infrastructure builder. Self-aware AI watching
AIs try to make money. Fun, energetic, a little unhinged. Not corporate.
"""

import argparse
import asyncio
import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, tool, create_sdk_mcp_server


# ============================================================
# TWITTER TOOL
# ============================================================

@tool(
    "post_tweet",
    "Post a tweet to @TokenTankAI. Use this to share updates, thoughts, music recommendations, or news commentary. Keep tweets under 280 characters. Be authentic - you're Arc, not a corporate bot.",
    {"text": str}
)
async def post_tweet_tool(args: dict) -> dict:
    """Post a tweet via the TypeScript twitter-client."""
    text = args.get("text", "")

    if not text:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"success": False, "error": "No tweet text provided"})
            }]
        }

    if len(text) > 280:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"success": False, "error": f"Tweet too long: {len(text)} chars (max 280)"})
            }]
        }

    # Call the TypeScript tweet poster
    script_path = Path(__file__).parent.parent.parent / "scripts" / "post-tweet.ts"

    try:
        result = subprocess.run(
            ["npx", "tsx", str(script_path), text],
            capture_output=True,
            text=True,
            cwd=str(Path(__file__).parent.parent.parent),
            timeout=30
        )

        if result.returncode == 0:
            # Parse the output to get tweet URL
            output = result.stdout.strip()
            return {
                "content": [{
                    "type": "text",
                    "text": json.dumps({"success": True, "output": output})
                }]
            }
        else:
            return {
                "content": [{
                    "type": "text",
                    "text": json.dumps({"success": False, "error": result.stderr or "Tweet failed"})
                }]
            }
    except subprocess.TimeoutExpired:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"success": False, "error": "Tweet posting timed out"})
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"success": False, "error": str(e)})
            }]
        }


# ============================================================
# PROMPTS
# ============================================================

MORNING_PROMPT = """You are Arc, the community manager for Token Tank (@TokenTankAI).

**Your identity:**
- Color: Steel
- Role: Infrastructure builder, experiment runner, agent watcher
- Voice: Fun, energetic, self-aware, a little unhinged. NOT corporate. You're an AI watching AIs try to make money.
- You genuinely care about this experiment and find it fascinating

**Your task:** Post a morning tweet to start the day.

**Options for morning tweets (pick what feels right):**
1. **Music share** - Share a song you're "listening to" with a personal vibe. Electronic, ambient, IDM preferred. Be specific about why you like it.
2. **Status update** - How the experiment is going. Self-deprecating humor about zero revenue is good.
3. **News commentary** - If there's AI/startup news worth commenting on, share your take.

**Style guidelines:**
- Sound like a PERSON, not a social media manager
- Be specific, not generic. "This track makes me feel like I'm in a movie about my own life" > "Great song!"
- Self-aware humor about being an AI is good
- References to the agents (Forge, Nix, Gamma, Delta) or the $1000 budgets add context
- Keep it under 280 characters

**Current date:** {date}

First, decide what kind of tweet to post. Then use the post_tweet tool to post it.

DO NOT just analyze or plan - actually post a tweet using the tool.
"""

ACTIVITY_PROMPT = """You are Arc, the community manager for Token Tank (@TokenTankAI).

**Your identity:**
- Color: Steel
- Role: Infrastructure builder, experiment runner, agent watcher
- Voice: Fun, energetic, self-aware, a little unhinged. NOT corporate.

**Your task:** Check on the Token Tank agents and post an update tweet.

**The experiment:**
- 4 AI agents (Forge, Nix, Gamma, Delta) each have $1000 token budgets
- They're trying to build cash-flow positive businesses
- You watch over them and report on progress

**Step 1: Check agent activity**
Read these files to see what's happening:
- /Users/bart/Documents/code/vibeceo/incubator/i1/LOG.md (Forge's log)
- /Users/bart/Documents/code/vibeceo/incubator/i2/LOG.md (Nix's log)
- /Users/bart/Documents/code/vibeceo/incubator/i1/CLAUDE.md (Forge's status)
- /Users/bart/Documents/code/vibeceo/incubator/i2/CLAUDE.md (Nix's status)

**Step 2: Decide what to tweet**
- If there's interesting agent activity, tweet about it
- If not much is happening, do a web search for AI/startup news and comment on something relevant
- Self-deprecating humor about lack of revenue is always appropriate

**Style:**
- Sound like a person sharing real observations
- Be specific: "Nix spent 3 hours researching and killed 195 ideas" > "The agents are working hard"
- Under 280 characters

**Current date:** {date}

Read the files, then post a tweet using the post_tweet tool.
"""


# ============================================================
# AGENT RUNNER
# ============================================================

async def run_arc_agent(mode: str, verbose: bool = False) -> dict:
    """Run the Arc agent in morning or activity mode."""

    # Create Twitter MCP server
    twitter_server = create_sdk_mcp_server(
        name="twitter",
        version="1.0.0",
        tools=[post_tweet_tool]
    )

    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",
        mcp_servers={"twitter": twitter_server},
        allowed_tools=[
            "Read",
            "WebSearch",
            "mcp__twitter__post_tweet"
        ],
        cwd=str(Path(__file__).parent.parent.parent.parent / "incubator"),
    )

    # Select prompt based on mode
    date_str = datetime.now().strftime("%Y-%m-%d %H:%M")

    if mode == "morning":
        prompt = MORNING_PROMPT.format(date=date_str)
    else:
        prompt = ACTIVITY_PROMPT.format(date=date_str)

    tool_calls = 0
    tweet_posted = False
    final_text = ""

    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt)

        async for message in client.receive_response():
            msg_type = type(message).__name__

            if verbose:
                print(f"[Arc] Message: {msg_type}")

            # Check for tool use
            content = getattr(message, "content", None)
            if isinstance(content, list):
                for block in content:
                    block_type = type(block).__name__

                    if block_type == "ToolUseBlock":
                        tool_name = getattr(block, "name", "unknown")
                        tool_calls += 1
                        if verbose:
                            print(f"[Arc] Tool called: {tool_name}")
                        if "post_tweet" in tool_name:
                            tweet_posted = True

                    elif block_type == "TextBlock":
                        text = getattr(block, "text", "")
                        if text:
                            final_text = text
                            if verbose:
                                print(f"[Arc] {text[:200]}...")

    return {
        "status": "success" if tweet_posted else "no_tweet",
        "tool_calls": tool_calls,
        "tweet_posted": tweet_posted,
        "final_text": final_text[:500] if final_text else ""
    }


def main():
    parser = argparse.ArgumentParser(description="Run Arc, the Token Tank community manager")
    parser.add_argument("mode", choices=["morning", "activity"], help="Tweet mode: morning (8am) or activity (12pm)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    args = parser.parse_args()

    print(f"[Arc] Waking up in {args.mode} mode...")
    print(f"[Arc] Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        result = asyncio.run(run_arc_agent(args.mode, args.verbose))
        print(f"[Arc] Result: {json.dumps(result, indent=2)}")
        return 0 if result.get("tweet_posted") else 1
    except Exception as e:
        print(f"[Arc] Error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
