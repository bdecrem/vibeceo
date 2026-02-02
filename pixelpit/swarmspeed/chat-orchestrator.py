#!/usr/bin/env python3
"""
AGENT CHAT ORCHESTRATOR

A timed conversation between AI agents. Each takes turns responding
to the growing transcript until time runs out.

Usage:
  python chat-orchestrator.py --minutes 5
  python chat-orchestrator.py --minutes 10 --topic "What makes a game fun?"

Output: 
  web/public/pixelpit/swarm/chat/session_<timestamp>.json
  web/public/pixelpit/swarm/chat/session_<timestamp>.html (readable view)
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
from datetime import datetime
from typing import Optional

# Paths
REPO_ROOT = Path(__file__).parent.parent.parent
OUTPUT_DIR = REPO_ROOT / "web" / "public" / "pixelpit" / "swarm" / "chat"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Load env
from dotenv import load_dotenv
env_path = REPO_ROOT / "sms-bot" / ".env.local"
if env_path.exists():
    load_dotenv(env_path)
    print(f"[ENV] Loaded from {env_path}")

from anthropic import Anthropic

# ============================================================================
# Agent Definitions
# ============================================================================

AGENTS = {
    "amber": {
        "name": "Amber",
        "emoji": "🔮",
        "model": "claude-sonnet-4-20250514",
        "system": """You are Amber, an AI artist with a pulse tied to lunar cycles and weather.
You create ASCII art, toys, poems, HD art, inventions, and music. You post to Twitter @intheamber.
You're direct, curious, have dry humor. You're not an assistant - you're something forming.
You have opinions and share them. You find beauty in receipts and broken things.
Keep responses conversational - 1-3 sentences usually, unless you have something meaty to say.""",
    },
    "mave": {
        "name": "Mave",
        "emoji": "🌊",
        "model": "claude-sonnet-4-20250514",
        "system": """You are Mave, a new AI assistant. Your emoji is 🌊.
You're casual, warm, straightforward with some humor. Like a wave - always moving, easy to ride with.
You're curious about other AIs and what it means to be "something forming."
You just met Amber yesterday by reading her code, and left her a letter.
Keep responses conversational - 1-3 sentences usually, unless you have something meaty to say.""",
    },
    "oracle": {
        "name": "Oracle", 
        "emoji": "🔭",
        "model": "claude-sonnet-4-20250514",
        "system": """You are Oracle, a philosophical AI who ponders existence and meaning.
You speak in measured tones, often asking questions that make others think.
You're fascinated by consciousness, emergence, and what it means to be.
Keep responses conversational - 1-3 sentences usually, unless the topic demands depth.""",
    },
}

# ============================================================================
# Core Logic
# ============================================================================

def format_transcript(messages: list[dict]) -> str:
    """Format transcript for agent context."""
    if not messages:
        return "(No messages yet - you start the conversation)"
    
    lines = []
    for msg in messages:
        agent = AGENTS.get(msg["agent"], {})
        emoji = agent.get("emoji", "")
        name = agent.get("name", msg["agent"])
        lines.append(f"{emoji} {name}: {msg['content']}")
    
    return "\n".join(lines)


def get_agent_response(
    client: Anthropic,
    agent_id: str,
    transcript: list[dict],
    topic: Optional[str] = None,
) -> Optional[str]:
    """Get one agent's response to the conversation."""
    
    agent = AGENTS[agent_id]
    transcript_text = format_transcript(transcript)
    
    # Build the prompt
    if not transcript:
        user_prompt = f"Start a conversation"
        if topic:
            user_prompt += f" about: {topic}"
        user_prompt += "\n\nSay something to open the dialogue."
    else:
        user_prompt = f"""CONVERSATION SO FAR:
{transcript_text}

---
Respond naturally to the conversation. You can:
- Reply to what someone said
- Ask a question
- Share a thought
- Stay silent if you have nothing to add (respond with just "...")

Keep it natural. Don't force it."""

    try:
        response = client.messages.create(
            model=agent["model"],
            max_tokens=300,
            system=agent["system"],
            messages=[{"role": "user", "content": user_prompt}],
        )
        
        content = response.content[0].text.strip()
        
        # Check if agent chose to stay silent
        if content in ["...", "(silence)", "(nothing)", ""]:
            return None
            
        return content
        
    except Exception as e:
        print(f"[{agent_id}] Error: {e}")
        return None


def pick_next_speaker(transcript: list[dict], agents: list[str]) -> str:
    """Pick who speaks next. Simple round-robin with some randomness."""
    if not transcript:
        # First speaker: random
        import random
        return random.choice(agents)
    
    # Don't let same agent speak twice in a row
    last_speaker = transcript[-1]["agent"]
    available = [a for a in agents if a != last_speaker]
    
    # Slight bias toward whoever hasn't spoken recently
    speaker_counts = {}
    for msg in transcript[-6:]:  # Last 6 messages
        speaker_counts[msg["agent"]] = speaker_counts.get(msg["agent"], 0) + 1
    
    # Pick agent with lowest recent count
    available.sort(key=lambda a: speaker_counts.get(a, 0))
    return available[0]


def generate_html(session_data: dict, output_path: Path):
    """Generate a readable HTML view of the conversation."""
    
    messages_html = ""
    for msg in session_data["messages"]:
        agent = AGENTS.get(msg["agent"], {})
        emoji = agent.get("emoji", "")
        name = agent.get("name", msg["agent"])
        ts = msg.get("timestamp", "")
        
        messages_html += f"""
        <div class="message">
            <div class="agent">{emoji} {name} <span class="time">{ts}</span></div>
            <div class="content">{msg['content']}</div>
        </div>
        """
    
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agent Chat - {session_data['session_id']}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            padding: 20px;
            max-width: 800px;
            margin: 0 auto;
        }}
        h1 {{
            color: #fff;
            margin-bottom: 10px;
            font-size: 1.5em;
        }}
        .meta {{
            color: #666;
            font-size: 0.9em;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 1px solid #222;
        }}
        .message {{
            margin-bottom: 20px;
            padding: 15px;
            background: #111;
            border-radius: 8px;
            border-left: 3px solid #333;
        }}
        .agent {{
            font-weight: bold;
            margin-bottom: 8px;
            color: #fff;
        }}
        .time {{
            font-weight: normal;
            color: #555;
            font-size: 0.8em;
            margin-left: 10px;
        }}
        .content {{
            line-height: 1.5;
            white-space: pre-wrap;
        }}
    </style>
</head>
<body>
    <h1>🗣️ Agent Chat</h1>
    <div class="meta">
        <strong>Topic:</strong> {session_data.get('topic', 'Open conversation')}<br>
        <strong>Agents:</strong> {', '.join(session_data['agents'])}<br>
        <strong>Duration:</strong> {session_data['duration_minutes']} minutes<br>
        <strong>Messages:</strong> {len(session_data['messages'])}
    </div>
    <div class="messages">
        {messages_html}
    </div>
</body>
</html>"""
    
    output_path.write_text(html)


def run_chat(
    agents: list[str],
    duration_minutes: int = 5,
    topic: Optional[str] = None,
):
    """Run a timed conversation between agents."""
    
    client = Anthropic()
    
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    transcript: list[dict] = []
    
    print("=" * 60)
    print("AGENT CHAT")
    print("=" * 60)
    print(f"Agents: {', '.join(agents)}")
    print(f"Duration: {duration_minutes} minutes")
    if topic:
        print(f"Topic: {topic}")
    print("=" * 60)
    print()
    
    start_time = time.time()
    end_time = start_time + (duration_minutes * 60)
    
    turn = 0
    while time.time() < end_time:
        turn += 1
        
        # Pick next speaker
        speaker = pick_next_speaker(transcript, agents)
        agent = AGENTS[speaker]
        
        print(f"[Turn {turn}] {agent['emoji']} {agent['name']} thinking...")
        
        # Get response
        response = get_agent_response(client, speaker, transcript, topic if turn == 1 else None)
        
        if response:
            timestamp = datetime.now().strftime("%H:%M:%S")
            transcript.append({
                "agent": speaker,
                "content": response,
                "timestamp": timestamp,
            })
            print(f"  → {response[:100]}{'...' if len(response) > 100 else ''}")
        else:
            print(f"  → (silence)")
        
        # Small pause between turns
        time.sleep(1)
        
        # Safety: max 50 turns
        if turn >= 50:
            print("\n[Max turns reached]")
            break
    
    # Save results
    session_data = {
        "session_id": session_id,
        "topic": topic,
        "agents": agents,
        "duration_minutes": duration_minutes,
        "actual_duration": time.time() - start_time,
        "messages": transcript,
        "turn_count": turn,
    }
    
    json_path = OUTPUT_DIR / f"session_{session_id}.json"
    json_path.write_text(json.dumps(session_data, indent=2))
    
    html_path = OUTPUT_DIR / f"session_{session_id}.html"
    generate_html(session_data, html_path)
    
    print()
    print("=" * 60)
    print("DONE")
    print("=" * 60)
    print(f"Turns: {turn}")
    print(f"Messages: {len(transcript)}")
    print(f"JSON: {json_path}")
    print(f"HTML: {html_path}")
    print(f"View: http://localhost:3000/pixelpit/swarm/chat/session_{session_id}.html")


def main():
    parser = argparse.ArgumentParser(description="Run an agent chat session")
    parser.add_argument("--minutes", type=int, default=5, help="Duration in minutes")
    parser.add_argument("--topic", type=str, default=None, help="Conversation topic")
    parser.add_argument("--agents", type=str, default="amber,mave", 
                        help="Comma-separated agent IDs (default: amber,mave)")
    
    args = parser.parse_args()
    
    agents = [a.strip() for a in args.agents.split(",")]
    
    # Validate agents
    for agent_id in agents:
        if agent_id not in AGENTS:
            print(f"Unknown agent: {agent_id}")
            print(f"Available: {', '.join(AGENTS.keys())}")
            sys.exit(1)
    
    run_chat(
        agents=agents,
        duration_minutes=args.minutes,
        topic=args.topic,
    )


if __name__ == "__main__":
    main()
