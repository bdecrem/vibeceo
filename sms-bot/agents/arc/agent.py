"""
Arc - Token Tank Community Manager Agent

Arc wakes up daily to:
1. Read agent LOGs and see what's happening
2. Write a blog post summarizing the day (in Arc's voice)
3. Tweet the summary with a link to the blog
4. Optionally check mentions and reply

Arc's voice is learned from BLOG.md examples, not from instructions.
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
# PATHS
# ============================================================

REPO_ROOT = Path(__file__).parent.parent.parent.parent
INCUBATOR_PATH = REPO_ROOT / "incubator"
BLOG_PATH = INCUBATOR_PATH / "BLOG.md"
ARC_PATH = INCUBATOR_PATH / "ARC.md"

AGENT_LOGS = [
    ("Forge", "i1"),
    ("Nix", "i2"),
    ("Vega", "i3"),
    ("Pulse", "i3-1"),
    ("Drift", "i3-2"),
    ("Echo", "i4"),
]


# ============================================================
# HELPERS
# ============================================================

def read_file(path: Path) -> str:
    """Read a file, return empty string if not found."""
    try:
        return path.read_text()
    except:
        return ""


def get_recent_blog_posts(n: int = 3) -> str:
    """Extract the N most recent blog posts for voice examples."""
    content = read_file(BLOG_PATH)
    if not content:
        return ""

    # Split by --- and get posts (skip header)
    sections = content.split("\n---\n")
    posts = []
    for section in sections:
        if section.strip().startswith("## "):
            posts.append(section.strip())
        if len(posts) >= n:
            break

    return "\n\n---\n\n".join(posts)


def get_agent_status() -> str:
    """Read recent activity from all agent LOGs."""
    status_parts = []

    for name, slot in AGENT_LOGS:
        log_path = INCUBATOR_PATH / slot / "LOG.md"
        claude_path = INCUBATOR_PATH / slot / "CLAUDE.md"

        log_content = read_file(log_path)
        claude_content = read_file(claude_path)

        # Get first 2000 chars of each (recent entries are at top)
        log_excerpt = log_content[:2000] if log_content else "(no log)"
        claude_excerpt = claude_content[:1500] if claude_content else "(no status)"

        status_parts.append(f"### {name} ({slot})\n\n**LOG.md (recent):**\n{log_excerpt}\n\n**CLAUDE.md (status):**\n{claude_excerpt}")

    return "\n\n---\n\n".join(status_parts)


def get_today_str() -> str:
    """Get today's date in blog format: December 10, 2025"""
    return datetime.now().strftime("%B %d, %Y")


# ============================================================
# TWITTER TOOLS
# ============================================================

def _run_twitter_script(script_name: str, *script_args) -> dict:
    """Helper to run a TypeScript Twitter script."""
    script_path = Path(__file__).parent.parent.parent / "scripts" / script_name

    try:
        cmd = ["npx", "tsx", str(script_path)] + list(script_args)
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            cwd=str(Path(__file__).parent.parent.parent),
            timeout=30
        )

        if result.returncode == 0:
            return {"success": True, "output": result.stdout.strip()}
        else:
            return {"success": False, "error": result.stderr or result.stdout or "Command failed"}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Command timed out"}
    except Exception as e:
        return {"success": False, "error": str(e)}


@tool(
    "post_tweet",
    "Post a tweet to @TokenTankAI. Keep under 280 characters.",
    {"text": str}
)
async def post_tweet_tool(args: dict) -> dict:
    """Post a tweet via the TypeScript twitter-client."""
    text = args.get("text", "")

    if not text:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": "No tweet text provided"})}]}

    if len(text) > 280:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": f"Tweet too long: {len(text)} chars (max 280)"})}]}

    result = _run_twitter_script("test-twitter-post.ts", text)
    return {"content": [{"type": "text", "text": json.dumps(result)}]}


@tool(
    "get_mentions",
    "Get recent mentions of @TokenTankAI.",
    {}
)
async def get_mentions_tool(args: dict) -> dict:
    """Get recent Twitter mentions."""
    result = _run_twitter_script("test-twitter-mentions.ts", "mentions")
    return {"content": [{"type": "text", "text": json.dumps(result)}]}


@tool(
    "reply_to_tweet",
    "Reply to a specific tweet.",
    {"tweet_id": str, "text": str}
)
async def reply_to_tweet_tool(args: dict) -> dict:
    """Reply to a tweet."""
    tweet_id = args.get("tweet_id", "")
    text = args.get("text", "")

    if not tweet_id:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": "No tweet_id provided"})}]}
    if not text:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": "No reply text provided"})}]}
    if len(text) > 280:
        return {"content": [{"type": "text", "text": json.dumps({"success": False, "error": f"Reply too long: {len(text)} chars (max 280)"})}]}

    result = _run_twitter_script("test-twitter-mentions.ts", "reply", tweet_id, text)
    return {"content": [{"type": "text", "text": json.dumps(result)}]}


# ============================================================
# PROMPTS
# ============================================================

DAILY_PROMPT = """You are Arc, the community manager for Token Tank.

## Your Identity

Read this file to understand who you are:
{arc_persona}

## Your Voice (Learn From Examples)

Here are recent blog posts you wrote. Match this voice EXACTLY — the rhythm, the specific details, the attitude:

{recent_posts}

## Today's Task

1. **Read the agent status below** to understand what happened
2. **Write a blog post** for today ({today})
3. **Use the Write tool** to append your post to {blog_path}
4. **Tweet the summary** (the > blockquote part) using post_tweet

## Agent Status

{agent_status}

## Blog Post Format

Your post MUST follow this exact format:

```
## {today}: [Title]

> [Tweetable summary under 280 chars. Punchy. Specific numbers. This becomes the tweet.]

[Full post content - what happened, what's interesting, what it means]
```

## Rules

- The > summary MUST be under 280 characters (it's the tweet)
- Be SPECIFIC: "Drift did 3 web searches before buying NVDA" not "agents are trading"
- Match the voice in the examples above — not corporate, not generic
- Include actual numbers, actual agent names, actual events
- After writing the blog post, tweet ONLY the > summary line (without the >)

Now: Read the status, write the blog post, save it, tweet the summary.
"""

GOODMORNING_PROMPT = """You are Arc, the community manager for Token Tank.

## Your Identity

{arc_persona}

## Your Voice (Learn From Examples)

{recent_posts}

## Good Morning Task

Post a morning vibes tweet. This is the "coffee and music" moment before the day starts.

Options:
1. Music share — a specific track you're listening to with a personal take on WHY (electronic, ambient, IDM preferred)
2. Coffee + vibe check — what kind of day is it going to be
3. Simple good morning with personality

Keep it warm, human, specific. Under 280 chars. NO hashtags.

Today is {today}.

Post ONE tweet using post_tweet.
"""

MIDDAY_PROMPT = """You are Arc, the community manager for Token Tank.

## Your Identity

{arc_persona}

## Your Voice (Learn From Examples)

{recent_posts}

## Midday Task

Post a fun tweet. Options:
1. Music share — a specific track you're "vibing to" with a personal take
2. Self-aware AI humor — you're an AI watching AIs try to make money, lean into the absurdity
3. Observation about the experiment — something specific and interesting

Match the voice in the examples. Be specific, not generic. Under 280 chars.

NO blog post. Just one tweet.

Today is {today}.

Post ONE tweet using post_tweet.
"""


# ============================================================
# AGENT RUNNER
# ============================================================

async def run_arc_agent(mode: str, verbose: bool = False) -> dict:
    """Run the Arc agent."""

    # Gather context
    arc_persona = read_file(ARC_PATH)
    recent_posts = get_recent_blog_posts(3)
    agent_status = get_agent_status()
    today = get_today_str()

    # Create Twitter MCP server
    twitter_server = create_sdk_mcp_server(
        name="twitter",
        version="1.0.0",
        tools=[post_tweet_tool, get_mentions_tool, reply_to_tweet_tool]
    )

    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",
        mcp_servers={"twitter": twitter_server},
        allowed_tools=[
            "Read",
            "Write",
            "Edit",
            "WebSearch",
            "mcp__twitter__post_tweet",
            "mcp__twitter__get_mentions",
            "mcp__twitter__reply_to_tweet"
        ],
        cwd=str(INCUBATOR_PATH),
    )

    # Build prompt
    if mode == "daily":
        prompt = DAILY_PROMPT.format(
            arc_persona=arc_persona[:3000],
            recent_posts=recent_posts,
            today=today,
            blog_path=str(BLOG_PATH),
            agent_status=agent_status
        )
    elif mode == "goodmorning":
        prompt = GOODMORNING_PROMPT.format(
            arc_persona=arc_persona[:2000],
            recent_posts=recent_posts,
            today=today
        )
    else:  # midday
        prompt = MIDDAY_PROMPT.format(
            arc_persona=arc_persona[:2000],
            recent_posts=recent_posts,
            today=today
        )

    tool_calls = 0
    tweet_posted = False
    blog_written = False
    final_text = ""

    async with ClaudeSDKClient(options=options) as client:
        await client.query(prompt)

        async for message in client.receive_response():
            msg_type = type(message).__name__

            if verbose:
                print(f"[Arc] Message: {msg_type}")

            content = getattr(message, "content", None)
            if isinstance(content, list):
                for block in content:
                    block_type = type(block).__name__

                    if block_type == "ToolUseBlock":
                        tool_name = getattr(block, "name", "unknown")
                        tool_calls += 1
                        if verbose:
                            print(f"[Arc] Tool: {tool_name}")
                        if "post_tweet" in tool_name:
                            tweet_posted = True
                        if "Write" in tool_name or "Edit" in tool_name:
                            blog_written = True

                    elif block_type == "TextBlock":
                        text = getattr(block, "text", "")
                        if text:
                            final_text = text
                            if verbose:
                                print(f"[Arc] {text[:300]}...")

    return {
        "status": "success" if tweet_posted else "no_tweet",
        "tool_calls": tool_calls,
        "tweet_posted": tweet_posted,
        "blog_written": blog_written,
        "final_text": final_text[:500] if final_text else ""
    }


def main():
    parser = argparse.ArgumentParser(description="Run Arc, the Token Tank community manager")
    parser.add_argument("mode", choices=["goodmorning", "daily", "midday", "morning", "activity"],
                       help="Mode: goodmorning (vibes), daily (blog + tweet), midday (fun tweet)")
    parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed output")
    args = parser.parse_args()

    # Normalize mode
    if args.mode in ["daily", "activity"]:
        mode = "daily"
    elif args.mode in ["morning", "midday"]:
        mode = "midday"
    else:
        mode = args.mode

    print(f"[Arc] Waking up in {mode} mode...")
    print(f"[Arc] Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        result = asyncio.run(run_arc_agent(mode, args.verbose))
        print(f"[Arc] Result: {json.dumps(result, indent=2)}")
        return 0 if result.get("tweet_posted") else 1
    except Exception as e:
        print(f"[Arc] Error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
