#!/usr/bin/env python3
"""
Recruiting Channel Discovery Agent
Uses claude-agent-sdk to search for REAL candidate examples on various platforms
"""

import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query

PROMPT_TEMPLATE = """
You are a talent sourcing expert. Find 3-5 SPECIFIC MINEABLE CHANNELS with REAL VERIFIED EXAMPLES of candidates.

**YOU HAVE WEB SEARCH ACCESS - USE IT!** Use the WebSearch tool to find actual people.

RECRUITING QUERY: {refined_query}

{company_context}

Your task:
1. Identify 3-5 channel types (Twitter searches, GitHub, LinkedIn, communities, etc.)
2. For EACH channel, use WebSearch to find 1-2 REAL people who fit the criteria
3. Verify the URLs actually exist by searching for them
4. Return ONLY channels where you found real verified examples

CRITICAL STEPS:

For Twitter channels:
- Use WebSearch: "site:twitter.com {{search_terms}}"
- Find real profiles with bios that match
- Include the actual Twitter handle and URL

For GitHub channels:
- Use WebSearch: "site:github.com {{search_terms}}"
- Find real GitHub users with relevant projects
- Include their actual GitHub username and URL

For LinkedIn channels:
- Use WebSearch: "site:linkedin.com/in {{search_terms}}"
- Find real LinkedIn profiles
- Include actual profile URLs

For community platforms (Buildspace, IndieHackers, etc.):
- Use WebSearch to find the platform
- Search for real member profiles
- Include actual URLs to their profiles

**ABSOLUTELY CRITICAL:**
- DO NOT make up fake URLs
- DO NOT guess plausible-looking profiles
- ONLY return channels where WebSearch found REAL people
- Verify each URL by searching for it
- If you can't find real examples for a channel type, SKIP that channel entirely

USE THE WRITE TOOL to save your findings to: {output_path}

Output format (JSON):
{{
  "status": "success",
  "channels": [
    {{
      "name": "Twitter #buildinpublic AI students",
      "channelType": "twitter-search",
      "description": "Students tweeting about AI projects",
      "searchQuery": "#buildinpublic AI student",
      "example": {{
        "name": "@actual_twitter_handle",
        "url": "https://twitter.com/actual_twitter_handle",
        "description": "Brief description from their bio"
      }},
      "score": 9,
      "reason": "High concentration of active builders"
    }}
  ]
}}

Remember: 3-5 channels MAX, each with VERIFIED REAL examples from your web searches!
"""


async def discover_channels(
    refined_query: str,
    company_context: str,
    output_dir: Path
) -> dict:
    """Run the channel discovery agent with web search"""

    # Prepare output path
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = output_dir / f"channels_{timestamp}.json"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Format prompt
    prompt = PROMPT_TEMPLATE.format(
        refined_query=refined_query,
        company_context=f"\nCOMPANY CONTEXT: {company_context}" if company_context else "",
        output_path=str(output_file)
    )

    # Run agent with web search
    try:
        print(f"[Channel Discovery Agent] Starting search for: {refined_query}", flush=True)

        result = await query(
            prompt=prompt,
            options=ClaudeAgentOptions(
                model="claude-sonnet-4-5-20250929",
                max_turns=10,  # Allow up to 10 agentic turns for thorough search
                tools=["WebSearch", "Write"],  # Enable web search and file writing
            )
        )

        print(f"[Channel Discovery Agent] Agent completed", flush=True)

        # Read the output file the agent created
        if output_file.exists():
            with open(output_file, 'r') as f:
                channels_data = json.load(f)

            return {
                "status": "success",
                "channels": channels_data.get("channels", []),
                "output_file": str(output_file)
            }
        else:
            return {
                "status": "error",
                "error": "Agent did not create output file"
            }

    except Exception as e:
        print(f"[Channel Discovery Agent] Error: {str(e)}", flush=True)
        return {
            "status": "error",
            "error": str(e)
        }


def main():
    parser = argparse.ArgumentParser(description="Discover recruiting channels with real examples")
    parser.add_argument("--query", required=True, help="Refined recruiting query")
    parser.add_argument("--company-context", default="", help="Optional company context")
    parser.add_argument("--output-dir", default="data/recruiting-channels", help="Output directory")

    args = parser.parse_args()

    output_dir = Path(args.output_dir)

    # Run the async agent
    result = asyncio.run(discover_channels(
        refined_query=args.query,
        company_context=args.company_context,
        output_dir=output_dir
    ))

    # Output result as JSON (last line for parsing)
    print(json.dumps(result), flush=True)


if __name__ == "__main__":
    main()
