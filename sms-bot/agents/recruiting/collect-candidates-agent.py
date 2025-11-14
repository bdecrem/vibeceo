#!/usr/bin/env python3
"""
Recruiting Candidate Collection Agent
Uses claude-agent-sdk to mine channels for REAL candidates matching criteria
"""

import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query

PROMPT_TEMPLATE = """
You are a talent sourcing expert. Mine the provided channels to find 10-15 REAL CANDIDATES.

**YOU HAVE WEB SEARCH ACCESS - USE IT!** Use the WebSearch tool to find actual people.

RECRUITING SPEC: {refined_spec}

APPROVED CHANNELS TO MINE:
{channels_list}

Your task:
1. For EACH channel, use WebSearch to find 2-3 REAL candidates who fit the spec
2. Extract their profile information (name, bio, GitHub, portfolio, social links)
3. Verify the URLs actually exist and lead to real profiles
4. Score each candidate 1-10 on how well they match the spec
5. Return 10-15 best candidates with complete information

CRITICAL STEPS FOR EACH CHANNEL TYPE:

For LinkedIn channels:
- Use WebSearch with the channel's searchQuery
- Find real LinkedIn profiles (/in/ URLs)
- Extract name, headline, experience, education
- Look for GitHub/portfolio links in their profile
- Verify they match location requirement (USA/Canada)

For GitHub channels:
- Use WebSearch with the channel's searchQuery
- Find real GitHub profiles with relevant repos
- Check their README, bio, pinned repos
- Look for contact info or social links
- Verify they have active recent commits

For DEV Community channels:
- Use WebSearch: "site:dev.to {{author}} AI projects"
- Find their author profile and articles
- Extract links to GitHub/portfolio from articles
- Verify they're students or recent grads

For job board channels (YC, HN):
- Search for people commenting/applying to similar roles
- Find their social profiles (Twitter, LinkedIn, GitHub)
- Verify they're looking for opportunities

**ABSOLUTELY CRITICAL - MANDATORY REQUIREMENTS:**
- EVERY candidate MUST have a real profile URL that you verified via WebSearch
- EVERY candidate MUST have their name (not "Unknown" or placeholder)
- DO NOT make up fake profiles or URLs
- DO NOT guess email addresses or contact info
- ONLY include candidates who clearly match the spec (student/recent grad, location, AI interest, GitHub/portfolio)
- The profile URL MUST lead to a page where we can verify their qualifications
- If you can't find enough candidates (aim for 10-15), return what you found - quality over quantity
- Each candidate needs: name, profileUrl, bio (2-3 sentences), githubUrl (if found), portfolioUrl (if found), location, score (1-10), matchReason

USE THE WRITE TOOL to save your findings to: {output_path}

Output format (JSON):
{{
  "status": "success",
  "candidates": [
    {{
      "name": "Jane Doe",
      "profileUrl": "https://linkedin.com/in/janedoe",
      "channelSource": "LinkedIn - US CS Students Seeking AI/ML Opportunities",
      "bio": "CS student at MIT (2025), built 3 AI projects including RAG chatbot. Active GitHub with 50+ stars across repos.",
      "githubUrl": "https://github.com/janedoe",
      "portfolioUrl": "https://janedoe.dev",
      "location": "Boston, MA, USA",
      "score": 9,
      "matchReason": "Perfect fit - CS student with proven AI projects, active GitHub, seeking remote work, USA-based"
    }}
  ]
}}

CRITICAL: Every candidate MUST have real, verified URLs from your web searches!
Aim for 10-15 candidates total across all channels.
"""


async def collect_candidates(
    refined_spec: str,
    channels: list,
    output_dir: Path
) -> dict:
    """Run the candidate collection agent with web search"""

    # Prepare output path
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = output_dir / f"candidates_{timestamp}.json"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Format channels list for prompt
    channels_list = "\n".join([
        f"{i+1}. {ch['name']} ({ch['channelType']})\n"
        f"   Description: {ch['description']}\n"
        f"   Search Query: {ch.get('searchQuery', 'N/A')}\n"
        f"   Example: {ch.get('example', {}).get('name', 'N/A')} - {ch.get('example', {}).get('url', 'N/A')}"
        for i, ch in enumerate(channels)
    ])

    # Format prompt
    prompt = PROMPT_TEMPLATE.format(
        refined_spec=refined_spec,
        channels_list=channels_list,
        output_path=str(output_file)
    )

    # Run agent with web search
    try:
        print(f"[Candidate Collection Agent] Starting search across {len(channels)} channels", flush=True)

        # Use the correct API with allowed_tools
        options = ClaudeAgentOptions(
            permission_mode='acceptEdits',
            allowed_tools=['Read', 'Write', 'WebSearch', 'WebFetch'],
            cwd=str(output_dir),
        )

        # Run the agent and consume the async iterator
        async for message in query(prompt=prompt, options=options):
            # Just consume messages, agent will write to file
            pass

        print(f"[Candidate Collection Agent] Agent completed", flush=True)

        # Read the output file the agent created
        if output_file.exists():
            with open(output_file, 'r') as f:
                candidates_data = json.load(f)

            return {
                "status": "success",
                "candidates": candidates_data.get("candidates", []),
                "output_file": str(output_file)
            }
        else:
            return {
                "status": "error",
                "error": "Agent did not create output file"
            }

    except Exception as e:
        print(f"[Candidate Collection Agent] Error: {str(e)}", flush=True)
        return {
            "status": "error",
            "error": str(e)
        }


def main():
    parser = argparse.ArgumentParser(description="Collect candidates from approved recruiting channels")
    parser.add_argument("--spec", required=True, help="Refined recruiting specification")
    parser.add_argument("--channels", required=True, help="JSON array of approved channels")
    parser.add_argument("--output-dir", default="data/recruiting-candidates", help="Output directory")

    args = parser.parse_args()

    output_dir = Path(args.output_dir)

    # Parse channels JSON
    try:
        channels = json.loads(args.channels)
    except json.JSONDecodeError as e:
        print(json.dumps({"status": "error", "error": f"Invalid channels JSON: {e}"}), flush=True)
        return

    # Run the async agent
    result = asyncio.run(collect_candidates(
        refined_spec=args.spec,
        channels=channels,
        output_dir=output_dir
    ))

    # Output result as JSON (last line for parsing)
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
