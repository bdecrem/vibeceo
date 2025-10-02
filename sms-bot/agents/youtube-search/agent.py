#!/usr/bin/env python3
"""
YouTube Quick Search Agent - B52s.me
Uses Claude Agent SDK to autonomously search YouTube and return results
"""

import argparse
import asyncio
import json
import sys
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query


async def search_youtube(user_query: str, hours: int = 48) -> dict:
    """
    Search YouTube using agent SDK with WebSearch tool

    Returns:
        {
            "videos": [{"title": "...", "channel": "...", "age": "2h ago", "videoId": "abc123"}],
            "followup": "Want tutorials, news, or analysis?",
            "query_used": "actual search query used"
        }
    """

    options = ClaudeAgentOptions(
        permission_mode='acceptEdits',
        allowed_tools=['WebSearch'],
        cwd=str(Path.cwd())
    )

    prompt = f"""You are a YouTube search assistant. Your job is to find recent videos and suggest a follow-up question.

USER QUERY: "{user_query}"
TIME RANGE: Last {hours} hours

TASK:
1. Use WebSearch to search YouTube for videos matching the query
2. Focus on videos from the last {hours} hours (look for "hours ago", "days ago" in results)
3. Extract up to 10 videos with: title, channel name, time posted (e.g. "2h ago"), and video ID
4. Generate ONE smart follow-up question to help refine the search (e.g. "Want tutorials, news, or reviews?")

IMPORTANT:
- Video IDs are the part after "watch?v=" in YouTube URLs
- Extract exact time posted from search results (e.g. "3 hours ago" → "3h ago")
- Be concise - extract data, don't explain

OUTPUT FORMAT (return ONLY this JSON, nothing else):
{{
    "videos": [
        {{"title": "Video Title", "channel": "Channel Name", "age": "2h ago", "videoId": "abc123xyz"}},
        ...
    ],
    "followup": "One follow-up question here?",
    "query_used": "the search query you actually used"
}}

Start searching now. Return ONLY the JSON output."""

    collected_text = []

    async for message in query(prompt=prompt, options=options):
        # Collect all text output from the agent
        if hasattr(message, 'type'):
            if message.type == 'text' and hasattr(message, 'text'):
                collected_text.append(message.text)

    # Find JSON in the collected output
    full_output = '\n'.join(collected_text)

    # Try to extract JSON from output
    try:
        # Look for JSON object in the text
        start = full_output.find('{')
        end = full_output.rfind('}') + 1

        if start >= 0 and end > start:
            json_str = full_output[start:end]
            data = json.loads(json_str)

            # Validate structure
            if 'videos' in data and isinstance(data['videos'], list):
                return data
    except json.JSONDecodeError:
        pass

    # Fallback if no valid JSON found
    return {
        "videos": [],
        "followup": "",
        "query_used": user_query,
        "error": "Could not parse agent output"
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='YouTube search agent')
    parser.add_argument('--query', required=True, help='Search query')
    parser.add_argument('--hours', type=int, default=48, help='Time range in hours (default: 48)')
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        result = asyncio.run(search_youtube(args.query, args.hours))

        # Output JSON to stdout for TypeScript to parse
        print(json.dumps(result))
        return 0

    except Exception as exc:
        error_output = {
            "videos": [],
            "followup": "",
            "query_used": args.query,
            "error": str(exc)
        }
        print(json.dumps(error_output))
        return 1


if __name__ == '__main__':
    sys.exit(main())
