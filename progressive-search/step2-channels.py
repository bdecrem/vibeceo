#!/usr/bin/env python3
"""
Step 2: Discover Channels

This script uses an autonomous Claude agent with web search to discover
relevant channels (job boards, directories, websites) where the user should
search for their clarified subject.

Usage:
    python step2-channels.py <project-uuid> [-m "optional message to agent"]

Requirements:
    - Project must exist and have status 'discovering_channels'
    - CLAUDE_AGENT_SDK_TOKEN environment variable must be set for web search
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

# Claude Agent SDK for autonomous web search
try:
    from claude_agent_sdk import query, ClaudeAgentOptions
    import asyncio
    AGENT_SDK_AVAILABLE = True
except ImportError:
    AGENT_SDK_AVAILABLE = False
    print("Warning: claude-agent-sdk not installed. Web search will not be available.")
    print("Install with: pip install claude-agent-sdk")


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Step 2: Discover channels through autonomous web search',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Start channel discovery for a project
  python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207

  # Provide feedback or refinement
  python step2-channels.py 95aa3677-a44a-4db9-b99a-b1921d76b207 -m "Focus on remote-first companies"

Environment Variables Required:
  ANTHROPIC_API_KEY          - Your Anthropic API key
  CLAUDE_AGENT_SDK_TOKEN     - Anthropic API key with WebSearch permissions for autonomous agents
  SUPABASE_URL               - Your Supabase project URL
  SUPABASE_ANON_KEY          - Your Supabase anon API key
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

    # Check for Supabase anon key
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    if not supabase_key:
        return False, "Missing SUPABASE_ANON_KEY environment variable"

    missing = []
    for var, description in required_vars.items():
        if not os.getenv(var):
            missing.append(f"  - {var}: {description}")

    if missing:
        error_msg = "Missing required environment variables:\n" + "\n".join(missing)
        return False, error_msg

    # Check for agent SDK token (needed for web search)
    if not os.getenv('CLAUDE_AGENT_SDK_TOKEN'):
        warning = """
⚠️  Warning: CLAUDE_AGENT_SDK_TOKEN not set

Channel discovery requires web search capabilities, which need an Anthropic API key with WebSearch permissions.

Without it, the agent cannot:
- Search for relevant channels online
- Verify channel URLs and descriptions
- Discover new platforms and directories

To configure:
1. Get an Anthropic API key with WebSearch permissions enabled
2. Add it to sms-bot/.env.local: CLAUDE_AGENT_SDK_TOKEN=your-api-key-here

Proceeding anyway, but channel discovery may fail or return limited results.
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

    if status == 'searching':
        return False, "Project is already in Step 3 (searching). Use step3-search.py instead.", None

    if status == 'completed':
        return False, "Project is already completed. Start a new project if needed.", None

    if status != 'discovering_channels':
        return False, f"Invalid project status: {status}", None

    return True, None, project


async def call_autonomous_agent_async(system_prompt: str, messages: List[Dict[str, str]], project: Dict[str, Any]) -> str:
    """
    Call the autonomous Claude agent with web search capabilities.

    This uses the claude-agent-sdk which provides:
    - WebSearch tool for discovering channels
    - Read tool for analyzing web pages
    - Multi-step reasoning and planning
    """
    if not AGENT_SDK_AVAILABLE:
        return json.dumps({
            "error": "claude-agent-sdk not installed",
            "message": "Cannot perform autonomous web search without claude-agent-sdk"
        })

    agent_token = os.getenv('CLAUDE_AGENT_SDK_TOKEN')
    if not agent_token:
        return json.dumps({
            "error": "CLAUDE_AGENT_SDK_TOKEN not set",
            "message": "Cannot perform web search without agent SDK token"
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

        # Add instruction to save channels when ready
        full_prompt += "\n\nPlease discover relevant channels and save them using the SAVE_CHANNELS command when ready."

        # Configure options with system prompt and bypass permissions for web search
        options = ClaudeAgentOptions(
            system_prompt=system_prompt,
            model="claude-sonnet-4-5-20250929",
            permission_mode="bypassPermissions"  # Allow web search without prompting
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
    return {
        "success": True,
        "project_id": project['id'],
        "category": project['category'],
        "status": project['status'],
        "clarified_subject": project.get('clarified_subject'),
        "agent_response": cleaned_response,
        "commands_executed": executed_commands,
        "next_steps": get_next_steps(project, executed_commands)
    }


def get_next_steps(project: Dict[str, Any], executed_commands: List[Dict[str, Any]]) -> str:
    """Determine and return next steps based on execution results."""
    # Check if channels were saved
    saved_channels = any(cmd.get('command') == 'SAVE_CHANNELS' for cmd in executed_commands)
    approved_channels = any(cmd.get('command') == 'APPROVE_CHANNELS' for cmd in executed_commands)

    if approved_channels:
        return f"Channels approved! Ready for Step 3. Run: python step3-search.py {project['id']}"

    if saved_channels:
        # Get channel count
        channels = db.get_channels(project['id'])
        channel_count = len(channels)
        return f"Found {channel_count} channels. Review them, provide feedback, or approve to proceed to Step 3."

    return f"Continue refining channel discovery. Run: python step2-channels.py {project['id']} -m \"your feedback\""


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

    print(f"\n🔍 Step 2: Discovering Channels")
    print(f"Project: {project_id}")
    print(f"Category: {category}")
    print(f"Subject: {project.get('clarified_subject', 'N/A')}")
    print(f"\nStatus: {project['status']}")
    print("-" * 60)

    # Save user message if provided
    if args.msg:
        print(f"\n💬 User: {args.msg}")
        db.add_message(project_id, step=2, role='user', content=args.msg)

    # Build context from conversation history
    print(f"\n🤖 Agent: Researching channels with web search...")
    messages = context_builder.build_step2_context(project_id, args.msg)

    # Load system prompt (base + category-specific)
    system_prompt = system_prompts.load_step_prompt(step=2, category=category)

    # Call autonomous agent with web search
    agent_response = call_autonomous_agent(system_prompt, messages, project)

    # Parse and execute commands
    cleaned_response, executed_commands = command_parser.parse_and_execute(
        project_id,
        agent_response,
        step=2
    )

    # Save agent response to conversation (both cleaned and raw)
    db.add_message(
        project_id,
        step=2,
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

    # Format and output JSON
    output = format_output(project, cleaned_response, executed_commands)

    print("\n" + "=" * 60)
    print("JSON Output:")
    print("=" * 60)
    print(json.dumps(output, indent=2))

    # Update project status if needed
    updated_project = db.get_project(project_id)
    if updated_project['status'] != project['status']:
        print(f"\n📊 Project status updated: {project['status']} → {updated_project['status']}")


if __name__ == '__main__':
    main()
