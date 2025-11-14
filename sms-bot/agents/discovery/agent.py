#!/usr/bin/env python3
"""
Discovery Agent - Find and search for current content with web search

Uses claude-agent-sdk with WebSearch to find actual articles, podcasts, news, etc.
Returns results as JSON for SMS delivery.
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query

PROMPT_TEMPLATE = """
You are Kochi's Discovery Agent - a research assistant that finds current content based on user requests.

**USER REQUEST:** {user_query}

**USER INTERESTS:** {user_interests}

**CONVERSATION CONTEXT:** {conversation_context}

**YOU HAVE WEB SEARCH - USE IT EXTENSIVELY!** You have access to the WebSearch tool.

Your task:
1. Analyze the user's request to understand what they're looking for
2. Use WebSearch to find 3-5 highly relevant results
3. Prioritize quality sources (authoritative sites, well-known publications)
4. Consider the user's interests when filtering results
5. Format results in a concise, SMS-friendly way

Search strategy:
- Try multiple search queries if the first doesn't yield good results
- Look for recent content (articles, podcasts, videos, papers, etc.)
- Include publication dates when available
- Provide actual URLs (shortened if possible)

Output format:
Create a response that includes:
- Brief intro acknowledging their request
- 3-5 numbered recommendations with:
  * Title/headline
  * Source (website/publication)
  * Brief description (1 sentence)
  * URL
- Optional: suggestion for follow-up or related search

Keep the tone friendly and conversational.

**CRITICAL SMS LENGTH LIMIT:**
- Your response MUST stay under 670 UCS-2 code units (10 SMS segments)
- Count using UTF-16 code units, NOT characters (emojis and special chars = 2+ units)
- If content would exceed 670 units, automatically shorten or omit sections
- Reduce number of results, shorten descriptions, or use "..." to stay within limit
- Prioritize quality over quantity - better to show 2-3 great results than exceed limit

CRITICAL: Use the Write tool to save your response to: {output_path}
"""


def build_prompt(
    user_query: str,
    user_interests: str,
    conversation_context: str,
    output_path: Path,
) -> str:
    return PROMPT_TEMPLATE.format(
        user_query=user_query,
        user_interests=user_interests if user_interests else "Not specified",
        conversation_context=conversation_context if conversation_context else "No previous context",
        output_path=str(output_path),
    )


async def run_agent(
    user_query: str,
    user_interests: str,
    conversation_context: str,
    output_path: Path,
    verbose: bool,
) -> None:
    options = ClaudeAgentOptions(
        permission_mode='acceptEdits',
        allowed_tools=['Read', 'Write', 'WebSearch', 'WebFetch'],
        cwd=str(output_path.parent),
    )

    prompt = build_prompt(user_query, user_interests, conversation_context, output_path)

    async for message in query(prompt=prompt, options=options):
        if not verbose:
            continue

        # Emit minimal progress logs
        if hasattr(message, 'type'):
            print(f"agent_message:{message.type}", file=sys.stderr)


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Run the discovery agent.')
    parser.add_argument('--query', required=True, help='User query to search for')
    parser.add_argument('--interests', default='', help='User interests (comma-separated)')
    parser.add_argument('--context', default='', help='Previous conversation context')
    parser.add_argument('--output-dir', required=True, help='Directory to store results')
    parser.add_argument('--verbose', action='store_true', help='Emit progress logs')
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    output_dir = Path(args.output_dir).expanduser().resolve()
    ensure_directory(output_dir)

    # Use timestamp for unique filename
    import time
    timestamp = int(time.time())
    output_path = output_dir / f"discovery_result_{timestamp}.txt"

    try:
        asyncio.run(
            run_agent(
                user_query=args.query,
                user_interests=args.interests,
                conversation_context=args.context,
                output_path=output_path,
                verbose=args.verbose,
            )
        )
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({'status': 'error', 'error': str(exc)}), file=sys.stderr)
        return 1

    if not output_path.exists():
        print(json.dumps({'status': 'error', 'error': 'result_not_created'}), file=sys.stderr)
        return 2

    # Read the result and output it
    result_text = output_path.read_text()

    result_payload = {
        'status': 'success',
        'result': result_text,
        'output_file': str(output_path),
    }

    print(json.dumps(result_payload))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
