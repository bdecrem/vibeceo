#!/usr/bin/env python3
"""
Step 1: Clarify Subject

Refine the initial search subject through conversational clarification.

Usage:
    # Create new project
    python step1-clarify.py --new -m "Find senior backend engineers" -c recruiting

    # Continue existing project
    python step1-clarify.py <uuid> -m "Make it remote-friendly"

    # Check current state (no message)
    python step1-clarify.py <uuid>
"""

import sys
import os
import json
import argparse
from pathlib import Path

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent))

from lib import db, context_builder, command_parser, system_prompts
from anthropic import Anthropic


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Step 1: Clarify search subject through conversation',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create new project
  python step1-clarify.py --new -m "Find senior backend engineers" -c recruiting

  # Continue existing project
  python step1-clarify.py abc-123-def -m "Make it remote-friendly"

  # Check current state
  python step1-clarify.py abc-123-def
        """
    )

    parser.add_argument(
        'project_id',
        nargs='?',
        help='Project UUID (required unless --new is used)'
    )

    parser.add_argument(
        '-n', '--new',
        action='store_true',
        help='Create a new project'
    )

    parser.add_argument(
        '-m', '--msg',
        type=str,
        help='User message to send to agent'
    )

    parser.add_argument(
        '-c', '--category',
        type=str,
        default='general',
        choices=['general', 'leadgen', 'recruiting', 'job_search', 'pet_adoption'],
        help='Category type (default: general)'
    )

    return parser.parse_args()


def validate_arguments(args):
    """
    Validate argument combinations.

    Returns:
        (bool, str): (is_valid, error_message)
    """
    # Check: UUID + --new flag is invalid
    if args.project_id and args.new:
        return False, "Error: Cannot specify both project UUID and --new flag"

    # Check: No UUID and no --new is invalid
    if not args.project_id and not args.new:
        return False, "Error: Must provide either project UUID or --new flag"

    # Check: --new requires a message
    if args.new and not args.msg:
        return False, "Error: --new flag requires a message (-m/--msg)"

    return True, None


def create_new_project(initial_subject: str, category: str) -> dict:
    """
    Create a new progressive search project.

    Args:
        initial_subject: The user's initial search query
        category: Category type

    Returns:
        Created project record
    """
    print(f"Creating new {category} project...")
    project = db.create_project(
        initial_subject=initial_subject,
        category=category,
        created_by='cli'
    )

    print(f"✓ Project created: {project['id']}")
    return project


def call_agent(system_prompt: str, messages: list) -> str:
    """
    Call Anthropic API with system prompt and messages.

    Args:
        system_prompt: System prompt for the agent
        messages: List of conversation messages

    Returns:
        Agent's response text
    """
    client = Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system_prompt,
        messages=messages
    )

    return response.content[0].text


def format_output(project: dict, agent_response: str, executed_commands: list) -> dict:
    """
    Format script output as JSON.

    Args:
        project: Project record
        agent_response: Cleaned agent response
        executed_commands: List of executed commands

    Returns:
        Dictionary for JSON output
    """
    output = {
        'success': True,
        'project_id': project['id'],
        'category': project['category'],
        'status': project['status'],
        'initial_subject': project['initial_subject'],
        'clarified_subject': project.get('clarified_subject'),
        'agent_response': agent_response,
    }

    # Add command execution results
    if executed_commands:
        output['commands_executed'] = [
            {
                'command': cmd['command'],
                'success': cmd['success']
            }
            for cmd in executed_commands
        ]

    # Add next step guidance
    if project['status'] == 'refining_query':
        output['is_confirmed'] = False
        output['next_step'] = f"Continue refining: python step1-clarify.py {project['id']} -m 'your response'"
    elif project['status'] == 'discovering_channels':
        output['is_confirmed'] = True
        output['next_step'] = f"Run step 2: python step2-channels.py {project['id']}"

    return output


def main():
    """Main execution function."""
    # Parse and validate arguments
    args = parse_arguments()
    is_valid, error_message = validate_arguments(args)

    if not is_valid:
        print(error_message, file=sys.stderr)
        sys.exit(1)

    try:
        # Create new project or load existing
        if args.new:
            project = create_new_project(args.msg, args.category)
            project_id = project['id']
        else:
            project_id = args.project_id
            project = db.get_project(project_id)

            if not project:
                print(f"Error: Project not found: {project_id}", file=sys.stderr)
                sys.exit(1)

        # If no message provided, just show current state
        if not args.msg and not args.new:
            summary = context_builder.get_project_state_summary(project_id)
            print(json.dumps(summary, indent=2))
            return

        # Build context for agent
        print("Building context...")
        messages = context_builder.build_step1_context(project_id, args.msg)

        # Load system prompt
        print(f"Loading system prompt (category: {project['category']})...")
        try:
            system_prompt = system_prompts.load_step_prompt(step=1, category=project['category'])
        except FileNotFoundError as e:
            print(f"Warning: {e}")
            print("Using minimal default prompt...")
            # Minimal fallback prompt
            system_prompt = """You are a search refinement assistant.
Help the user clarify their search query by asking targeted questions.
Once satisfied, use the SAVE_SUBJECT command with the clarified subject."""

        # Save user message to conversation
        if not args.new:  # Don't save initial message for new projects (it's in initial_subject)
            db.add_message(project_id, step=1, role='user', content=args.msg)

        # Call agent
        print("Calling agent...")
        agent_response = call_agent(system_prompt, messages)

        # Parse and execute commands
        print("Parsing commands...")
        cleaned_response, executed_commands = command_parser.parse_and_execute(
            project_id,
            agent_response,
            step=1
        )

        # Save agent response to conversation
        db.add_message(project_id, step=1, role='assistant', content=cleaned_response)

        # Reload project to get updated status
        project = db.get_project(project_id)

        # Format and output
        output = format_output(project, cleaned_response, executed_commands)
        print("\n" + "=" * 60)
        print(json.dumps(output, indent=2))
        print("=" * 60)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
