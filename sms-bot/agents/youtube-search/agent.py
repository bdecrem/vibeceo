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

    # Create a temporary file for the agent to write to
    import tempfile
    temp_dir = Path(tempfile.gettempdir())
    output_file = temp_dir / f"yt_search_{int(asyncio.get_event_loop().time() * 1000)}.json"

    options = ClaudeAgentOptions(
        permission_mode='acceptEdits',
        allowed_tools=['WebSearch', 'Write'],
        cwd=str(temp_dir)
    )

    prompt = f"""Execute these steps EXACTLY in order:

1. Use WebSearch ONCE with query: "site:youtube.com {user_query} after:2024"
2. From search results, extract up to 10 YouTube videos with:
   - Video title
   - Channel name
   - Time posted (e.g., "2 hours ago" → "2h ago")
   - Video ID from the URL (part after "watch?v=")
3. Generate ONE follow-up question (e.g., "Want tutorials, news, or analysis?")
4. Use Write tool to save JSON to: {output_file}

JSON format:
{{
    "videos": [
        {{"title": "Video Title", "channel": "Channel Name", "age": "2h ago", "videoId": "abc123"}},
        ...
    ],
    "followup": "Your follow-up question?",
    "query_used": "site:youtube.com {user_query} after:2024"
}}

DO NOT search multiple times. One search, extract data, write file, done."""

    # Run the agent (it will write to the file)
    async for message in query(prompt=prompt, options=options):
        # Debug output to stderr
        if hasattr(message, 'text'):
            print(f"AGENT TEXT: {message.text[:100]}...", file=sys.stderr)
        if hasattr(message, 'tool_use'):
            print(f"TOOL USE: {getattr(message, 'tool_use', 'unknown')}", file=sys.stderr)

    # Read the results from the file the agent created
    if output_file.exists():
        try:
            with open(output_file, 'r') as f:
                data = json.load(f)
            # Clean up temp file
            output_file.unlink()
            return data
        except (json.JSONDecodeError, Exception) as e:
            print(f"DEBUG: Error reading output file: {e}", file=sys.stderr)
            if output_file.exists():
                output_file.unlink()

    # Fallback if no file was created
    return {
        "videos": [],
        "followup": "",
        "query_used": user_query,
        "error": "Agent did not create output file"
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
