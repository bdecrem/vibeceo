#!/usr/bin/env python3
"""
Step 3: Execute Search

This script uses an autonomous Claude agent with web browsing to execute searches
on approved channels and extract relevant results.

Usage:
    python step3-search.py <project-uuid> [-m "optional message to agent"]

Requirements:
    - Project must exist and have status 'searching'
    - Must have approved channels from Step 2
    - CLAUDE_CODE_OAUTH_TOKEN environment variable must be set for web browsing
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from lib import db, context_builder, command_parser, system_prompts

# Claude Agent SDK for autonomous web browsing
try:
    from claude_agent_sdk import query, ClaudeAgentOptions
    import asyncio
    AGENT_SDK_AVAILABLE = True
except ImportError:
    AGENT_SDK_AVAILABLE = False
    print("Warning: claude-agent-sdk not installed. Web browsing will not be available.")
    print("Install with: pip install claude-agent-sdk")


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Step 3: Execute search across approved channels',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Start search for a project
  python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207

  # Provide feedback or refinement
  python step3-search.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Focus on remote positions"

Environment Variables Required:
  ANTHROPIC_API_KEY          - Your Anthropic API key
  CLAUDE_CODE_OAUTH_TOKEN    - OAuth token for autonomous agent web browsing
  SUPABASE_URL               - Your Supabase project URL
  SUPABASE_PUBLISHABLE_KEY   - Your Supabase publishable API key
        """
    )

    parser.add_argument(
        'project_id',
        help='Project UUID to continue'
    )

    parser.add_argument(
        '-m', '--msg',
        type=str,
        help='Optional message to send to the agent (feedback, refinement requests)'
    )

    return parser.parse_args()


def validate_environment() -> Tuple[bool, Optional[str]]:
    """Validate required environment variables are set."""
    required_vars = {
        'ANTHROPIC_API_KEY': 'Anthropic API key for Claude',
        'SUPABASE_URL': 'Supabase project URL',
    }

    # Check for either old or new Supabase key format
    supabase_key = os.getenv('SUPABASE_PUBLISHABLE_KEY') or os.getenv('SUPABASE_KEY')
    if not supabase_key:
        return False, "Missing SUPABASE_PUBLISHABLE_KEY environment variable"

    missing = []
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing.append(f"  - {var}: {description}")

    if missing:
        error_msg = "Missing required environment variables:\n" + "\n".join(missing)
        return False, error_msg

    # Check for OAuth token (needed for web browsing)
    if not os.getenv('CLAUDE_CODE_OAUTH_TOKEN'):
        warning = """
⚠️  Warning: CLAUDE_CODE_OAUTH_TOKEN not set

Search execution requires web browsing capabilities, which need the OAuth token.

Without it, the agent cannot:
- Visit channel URLs to extract results
- Read web pages for job listings, leads, etc.
- Discover new opportunities

To get an OAuth token:
1. Contact Anthropic support or check the Claude Agent SDK documentation
2. Add it to your .env file: CLAUDE_CODE_OAUTH_TOKEN=your-token-here

Proceeding anyway, but search execution may fail or return limited results.
"""
        print(warning)

    return True, None


def validate_project(project_id: str) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """Validate project exists and is in correct status."""
    try:
        project = db.get_project(project_id)
    except Exception as e:
        return False, f"Error fetching project: {str(e)}", None

    if not project:
        return False, f"Project not found: {project_id}", None

    # Check project status
    status = project.get('status')
    if status == 'refining_query':
        return False, "Project is still in Step 1 (refining query). Complete Step 1 first.", None

    if status == 'completed':
        return False, "Project is already completed. Start a new project if needed.", None

    # Check approved channels exist
    channels = db.get_channels(project_id, approved_only=True)
    if not channels:
        return False, "No approved channels found. Go back to Step 2 and approve channels.", None

    # Auto-transition from 'discovering_channels' to 'searching' if channels are approved
    if status == 'discovering_channels':
        print("✓ Approved channels found. Transitioning project to 'searching' status...")
        db.update_project_status(project_id, 'searching')
        project = db.get_project(project_id)  # Reload to get updated status

    if status != 'searching' and status != 'discovering_channels':
        return False, f"Invalid project status: {status}", None

    return True, None, project


async def call_autonomous_agent_async(system_prompt: str, messages: List[Dict[str, str]], project: Dict[str, Any]) -> str:
    """
    Call the autonomous Claude agent with web browsing capabilities.

    This uses the claude-agent-sdk which provides:
    - Read tool for visiting and parsing channel URLs
    - WebSearch tool for finding results when needed
    - Multi-step reasoning and planning
    """
    if not AGENT_SDK_AVAILABLE:
        return json.dumps({
            "error": "claude-agent-sdk not installed",
            "message": "Cannot perform autonomous web browsing without claude-agent-sdk"
        })

    oauth_token = os.getenv('CLAUDE_CODE_OAUTH_TOKEN')
    if not oauth_token:
        return json.dumps({
            "error": "CLAUDE_CODE_OAUTH_TOKEN not set",
            "message": "Cannot perform web browsing without OAuth token"
        })

    try:
        # Build a simple prompt that includes conversation context
        # The system prompt will be passed via ClaudeAgentOptions
        if not messages:
            return json.dumps({
                "error": "no_messages",
                "message": "No messages to send to agent"
            })

        # Build conversation context as a string
        prompt_parts = []
        for msg in messages:
            role_label = "User" if msg['role'] == 'user' else "Assistant"
            prompt_parts.append(f"{role_label}: {msg['content']}")

        full_prompt = "\n\n".join(prompt_parts)

        # Add instruction to save results when ready
        full_prompt += "\n\nPlease search the approved channels and save results using the SAVE_RESULTS command when ready."

        # Configure options with system prompt and bypass permissions for web browsing
        options = ClaudeAgentOptions(
            system_prompt=system_prompt,
            model="claude-sonnet-4-5-20250929",
            permission_mode="bypassPermissions"  # Allow web browsing without prompting
        )

        # Call query and collect only the final ResultMessage
        # The SDK streams multiple message types (SystemMessage, AssistantMessage, ResultMessage)
        # We only want the final ResultMessage which contains the complete output
        final_result = None
        async for message in query(prompt=full_prompt, options=options):
            # Skip SystemMessage (initialization messages)
            if hasattr(message, 'subtype') and message.subtype == 'init':
                continue

            # Keep the final ResultMessage (has 'result' field)
            if hasattr(message, 'result'):
                final_result = message.result
            # Fallback: if no ResultMessage, collect from dict-style messages
            elif isinstance(message, dict) and 'result' in message:
                final_result = str(message['result'])

        return final_result if final_result else "No response from agent"

    except Exception as e:
        error_msg = f"Error running autonomous agent: {str(e)}"
        print(f"\n❌ {error_msg}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return json.dumps({
            "error": "agent_execution_failed",
            "message": error_msg
        })


def call_autonomous_agent(system_prompt: str, messages: List[Dict[str, str]], project: Dict[str, Any]) -> str:
    """Synchronous wrapper for the async agent call."""
    return asyncio.run(call_autonomous_agent_async(system_prompt, messages, project))


def format_output(project: Dict[str, Any], cleaned_response: str, executed_commands: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Format the output JSON for display."""
    # Get results count
    results = db.get_results(project['id'])

    return {
        "success": True,
        "project_id": project['id'],
        "category": project['category'],
        "status": project['status'],
        "clarified_subject": project.get('clarified_subject'),
        "agent_response": cleaned_response,
        "commands_executed": executed_commands,
        "results_count": len(results),
        "next_steps": get_next_steps(project, executed_commands, results)
    }


def get_next_steps(project: Dict[str, Any], executed_commands: List[Dict[str, Any]], results: List[Dict[str, Any]]) -> str:
    """Determine and return next steps based on execution results."""
    # Check if winner was marked
    winner_marked = any(cmd.get('command') == 'MARK_WINNER' for cmd in executed_commands)
    if winner_marked:
        return "Project complete! Review your winner result."

    # Check if results were saved
    saved_results = any(cmd.get('command') == 'SAVE_RESULTS' for cmd in executed_commands)

    if saved_results or results:
        result_count = len(results)
        favorites = [r for r in results if r.get('is_favorite')]
        favorites_count = len(favorites)

        msg = f"Found {result_count} results"
        if favorites_count > 0:
            msg += f" ({favorites_count} favorited)"
        msg += ". You can:\n"
        msg += f"  - Rate results: python step3-search.py {project['id']} -m \"Rate result 1 as 8/10\"\n"
        msg += f"  - Continue searching: python step3-search.py {project['id']} -m \"Find more remote positions\"\n"
        msg += f"  - Mark winner: python step3-search.py {project['id']} -m \"Mark result 1 as winner\""
        return msg

    return f"Continue searching or provide feedback: python step3-search.py {project['id']} -m \"your feedback\""


def main():
    """Main execution function."""
    # Parse arguments
    args = parse_arguments()

    # Validate environment
    env_valid, env_error = validate_environment()
    if not env_valid:
        print(f"❌ Environment Error:\n{env_error}", file=sys.stderr)
        sys.exit(1)

    # Validate project
    project_valid, project_error, project = validate_project(args.project_id)
    if not project_valid:
        print(f"❌ Project Error: {project_error}", file=sys.stderr)
        sys.exit(1)

    project_id = project['id']
    category = project['category']

    # Get approved channels
    channels = db.get_channels(project_id, approved_only=True)

    print(f"\n🔍 Step 3: Executing Search")
    print(f"Project: {project_id}")
    print(f"Category: {category}")
    print(f"Subject: {project.get('clarified_subject', 'N/A')}")
    print(f"Approved Channels: {len(channels)}")
    print(f"\nStatus: {project['status']}")
    print("-" * 60)

    # Save user message if provided
    if args.msg:
        print(f"\n💬 User: {args.msg}")
        db.add_message(project_id, step=3, role='user', content=args.msg)

    # Build context from conversation history
    print(f"\n🤖 Agent: Searching channels with web browsing...")
    messages = context_builder.build_step3_context(project_id, args.msg)

    # Load system prompt (base + category-specific)
    system_prompt = system_prompts.load_step_prompt(step=3, category=category)

    # Call autonomous agent with web browsing
    agent_response = call_autonomous_agent(system_prompt, messages, project)

    # Parse and execute commands
    cleaned_response, executed_commands = command_parser.parse_and_execute(
        project_id,
        agent_response,
        step=3
    )

    # Save agent response to conversation (both cleaned and raw)
    db.add_message(
        project_id,
        step=3,
        role='assistant',
        content=cleaned_response,
        raw_response=agent_response
    )

    # Display agent response
    print(f"\n{cleaned_response}")

    # Display executed commands
    if executed_commands:
        print(f"\n✅ Commands Executed:")
        for cmd in executed_commands:
            cmd_name = cmd.get('command', 'UNKNOWN')
            print(f"   - {cmd_name}")

    # Reload project to get updated status
    updated_project = db.get_project(project_id)

    # Get results for output
    results = db.get_results(project_id)

    # Format and output JSON
    output = format_output(updated_project, cleaned_response, executed_commands)

    print("\n" + "=" * 60)
    print("JSON Output:")
    print("=" * 60)
    print(json.dumps(output, indent=2))

    # Update project status if needed
    if updated_project['status'] != project['status']:
        print(f"\n📊 Project status updated: {project['status']} → {updated_project['status']}")


if __name__ == '__main__':
    main()
