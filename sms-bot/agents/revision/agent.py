#!/usr/bin/env python3
"""
Revision Agent - Uses claude-agent-sdk to revise existing Webtoys/apps.

This agent:
1. Receives current HTML and revision request
2. Uses Claude (Opus or Sonnet) to make the requested changes
3. Returns the complete updated HTML
"""

import argparse
import asyncio
import json
import sys
import os
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query

PROMPT_TEMPLATE = """You are a web development expert revising an existing app/website.

## APP INFORMATION
- App Slug: {app_slug}
- User: {user_slug}

## USER'S REVISION REQUEST
{revision_request}

## CURRENT HTML CODE
```html
{current_html}
```

## YOUR TASK
1. Carefully analyze the current HTML code
2. Understand exactly what the user wants changed
3. Make the minimal changes needed to fulfill the request
4. Preserve all existing functionality unless explicitly asked to change it
5. Keep the same structure, style patterns, and design aesthetic
6. Only modify what's strictly necessary for the revision

## OUTPUT INSTRUCTIONS
You MUST use the Write tool to save the complete updated HTML to: {output_path}

The file should contain ONLY the complete HTML document - no markdown, no explanations, just the raw HTML starting with <!DOCTYPE html> or <html>.

Important:
- Do NOT include any markdown code fences
- Do NOT include any explanatory text before or after
- Just write the complete, valid HTML file
"""


def build_prompt(
    app_slug: str,
    user_slug: str,
    revision_request: str,
    current_html: str,
    output_path: Path
) -> str:
    return PROMPT_TEMPLATE.format(
        app_slug=app_slug,
        user_slug=user_slug,
        revision_request=revision_request,
        current_html=current_html,
        output_path=str(output_path),
    )


async def run_agent(
    prompt: str,
    output_dir: Path,
    model: str,
    verbose: bool
) -> None:
    options = ClaudeAgentOptions(
        permission_mode='acceptEdits',
        allowed_tools=['Read', 'Write'],
        cwd=str(output_dir),
        model=model,
    )

    async for message in query(prompt=prompt, options=options):
        if not verbose:
            continue

        # When verbose, emit a minimal log so the caller can track progress
        if hasattr(message, 'type'):
            print(f"agent_message:{message.type}", file=sys.stderr)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Run the revision agent.')
    parser.add_argument('--app-slug', required=True, help='Slug of the app being revised')
    parser.add_argument('--user-slug', required=True, help='User slug (owner of the app)')
    parser.add_argument('--revision-request', required=True, help='What changes to make')
    parser.add_argument('--html-file', required=True, help='Path to file containing current HTML')
    parser.add_argument('--output-dir', required=True, help='Directory to store output')
    parser.add_argument('--model', default='claude-sonnet-4-20250514', help='Model to use')
    parser.add_argument('--verbose', action='store_true', help='Emit progress logs')
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Read current HTML from file
    html_path = Path(args.html_file).expanduser().resolve()
    if not html_path.exists():
        print(json.dumps({'status': 'error', 'error': f'HTML file not found: {html_path}'}))
        return 1

    current_html = html_path.read_text(encoding='utf-8')

    # Setup output
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / 'revised.html'

    # Build prompt
    prompt = build_prompt(
        app_slug=args.app_slug,
        user_slug=args.user_slug,
        revision_request=args.revision_request,
        current_html=current_html,
        output_path=output_path,
    )

    # Run agent
    try:
        asyncio.run(run_agent(
            prompt=prompt,
            output_dir=output_dir,
            model=args.model,
            verbose=args.verbose
        ))
    except Exception as exc:
        print(json.dumps({'status': 'error', 'error': str(exc)}))
        return 1

    # Check output
    if not output_path.exists():
        print(json.dumps({'status': 'error', 'error': 'revised HTML not created'}))
        return 2

    # Read the revised HTML
    revised_html = output_path.read_text(encoding='utf-8')

    # Return success with the HTML content
    result = {
        'status': 'success',
        'html': revised_html,
        'output_file': str(output_path),
    }
    print(json.dumps(result))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
