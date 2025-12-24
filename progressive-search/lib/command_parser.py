#!/usr/bin/env python3
"""
Command Parser for Progressive Search System

Extracts structured commands from agent responses and executes them.
Commands are embedded as JSON blocks in markdown code fences.
"""

import json
import re
from typing import Dict, List, Any, Tuple, Optional
from . import db


def extract_json_commands(text: str) -> List[Dict[str, Any]]:
    """
    Extract JSON commands from text (markdown code fences or inline JSON).

    Looks for patterns like:
    ```json
    {"command": "SAVE_SUBJECT", ...}
    ```

    Or inline: {"command": "SAVE_SUBJECT", ...}

    Args:
        text: Agent response text

    Returns:
        List of parsed command dictionaries
    """
    commands = []

    # Pattern 1: JSON in markdown code fences
    fence_pattern = r'```(?:json)?\s*\n?(\{[^`]+\})\s*\n?```'
    for match in re.finditer(fence_pattern, text, re.MULTILINE | re.DOTALL):
        try:
            cmd = json.loads(match.group(1))
            if isinstance(cmd, dict) and 'command' in cmd:
                commands.append(cmd)
        except json.JSONDecodeError:
            continue

    # Pattern 2: Inline JSON objects (only if they have a "command" key)
    inline_pattern = r'\{[^{}]*"command"\s*:\s*"[^"]+[^{}]*\}'
    for match in re.finditer(inline_pattern, text):
        try:
            cmd = json.loads(match.group(0))
            if isinstance(cmd, dict) and 'command' in cmd:
                commands.append(cmd)
        except json.JSONDecodeError:
            continue

    return commands


def clean_response(text: str) -> str:
    """
    Remove command JSON blocks from response text.

    Args:
        text: Agent response text with embedded commands

    Returns:
        Cleaned text with commands removed
    """
    # Remove JSON code fences
    text = re.sub(r'```(?:json)?\s*\n?\{[^`]+\}\s*\n?```', '', text, flags=re.MULTILINE | re.DOTALL)

    # Remove inline command JSON
    text = re.sub(r'\{[^{}]*"command"\s*:\s*"[^"]+[^{}]*\}', '', text)

    # Clean up extra whitespace
    text = re.sub(r'\n\n\n+', '\n\n', text)

    return text.strip()


# ============================================================================
# Step 1 Commands (Clarify Subject)
# ============================================================================

def execute_save_subject(project_id: str, command: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute SAVE_SUBJECT command.

    Expected format:
    {
        "command": "SAVE_SUBJECT",
        "clarified_subject": "Senior backend engineers..."
    }

    Args:
        project_id: UUID of the project
        command: Command dictionary

    Returns:
        Updated project record
    """
    clarified_subject = command.get('clarified_subject')
    if not clarified_subject:
        raise ValueError("SAVE_SUBJECT command missing 'clarified_subject' field")

    return db.save_clarified_subject(project_id, clarified_subject)


def execute_update_subject(project_id: str, command: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute UPDATE_SUBJECT command.

    Expected format:
    {
        "command": "UPDATE_SUBJECT",
        "clarified_subject": "Updated text..."
    }

    Args:
        project_id: UUID of the project
        command: Command dictionary

    Returns:
        Updated project record
    """
    clarified_subject = command.get('clarified_subject')
    if not clarified_subject:
        raise ValueError("UPDATE_SUBJECT command missing 'clarified_subject' field")

    return db.update_project(project_id, {'clarified_subject': clarified_subject})


# ============================================================================
# Step 2 Commands (Discover Channels)
# ============================================================================

def execute_save_channels(project_id: str, command: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Execute SAVE_CHANNELS command.

    Expected format:
    {
        "command": "SAVE_CHANNELS",
        "channels": [
            {
                "name": "LinkedIn Jobs",
                "url": "https://linkedin.com/jobs",
                "description": "Professional network...",
                "channel_type": "professional_network",
                "rating": 9
            },
            ...
        ]
    }

    Args:
        project_id: UUID of the project
        command: Command dictionary

    Returns:
        List of created channel records
    """
    channels = command.get('channels', [])
    if not channels:
        raise ValueError("SAVE_CHANNELS command missing 'channels' field")

    return db.save_channels(project_id, channels)


def execute_update_channels(project_id: str, command: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute UPDATE_CHANNELS command.

    Expected format:
    {
        "command": "UPDATE_CHANNELS",
        "updates": [
            {"name": "LinkedIn Jobs", "rating": 10},
            {"name": "GitHub Jobs", "rating": 3}
        ],
        "new_channels": [...]  # Optional: new channels to add
    }

    Args:
        project_id: UUID of the project
        command: Command dictionary

    Returns:
        Dictionary with updated and new channels
    """
    result = {
        'updated': [],
        'new': []
    }

    # Handle updates to existing channels
    updates = command.get('updates', [])
    for update in updates:
        name = update.get('name')
        if not name:
            continue

        # Find channel by name
        channels = db.get_channels(project_id)
        channel = next((c for c in channels if c['name'] == name), None)

        if channel:
            # Remove 'name' from update dict (it's the identifier, not a field to update)
            update_fields = {k: v for k, v in update.items() if k != 'name'}
            updated = db.update_channel(channel['id'], update_fields)
            result['updated'].append(updated)

    # Handle new channels
    new_channels = command.get('new_channels', [])
    if new_channels:
        created = db.save_channels(project_id, new_channels)
        result['new'].extend(created)

    return result


def execute_approve_channels(project_id: str, command: Dict[str, Any]) -> int:
    """
    Execute APPROVE_CHANNELS command (implicit when user confirms channel list).

    Args:
        project_id: UUID of the project
        command: Command dictionary (unused but kept for consistency)

    Returns:
        Number of channels approved
    """
    return db.approve_channels(project_id)


# ============================================================================
# Step 3 Commands (Execute Search)
# ============================================================================

def execute_save_results(project_id: str, command: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Execute SAVE_RESULTS command.

    Expected format:
    {
        "command": "SAVE_RESULTS",
        "results": [
            {
                "title": "Senior Backend Engineer - Acme Corp",
                "subtitle": "San Francisco, CA",
                "description": "...",
                "url": "https://...",
                "channel_name": "LinkedIn Jobs",  # Will be resolved to channel_id
                "metadata": {...},
                "last_updated": "2025-12-18T10:00:00Z"
            },
            ...
        ]
    }

    Args:
        project_id: UUID of the project
        command: Command dictionary

    Returns:
        List of created result records
    """
    results = command.get('results', [])
    if not results:
        raise ValueError("SAVE_RESULTS command missing 'results' field")

    # Resolve channel names to channel IDs
    channels = db.get_channels(project_id, approved_only=True)
    channel_map = {c['name']: c['id'] for c in channels}

    for result in results:
        channel_name = result.pop('channel_name', None)
        if channel_name and channel_name in channel_map:
            result['channel_id'] = channel_map[channel_name]

    return db.save_results(project_id, results)


def execute_update_results(project_id: str, command: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Execute UPDATE_RESULTS command.

    Expected format:
    {
        "command": "UPDATE_RESULTS",
        "updates": [
            {
                "result_index": 1,  # 1-indexed position from agent response
                "user_rating": 9,
                "user_notes": "Perfect match!"
            },
            ...
        ]
    }

    Note: result_index refers to the position in the most recent agent response,
    not the database ID. We need to map this to actual result IDs.

    Args:
        project_id: UUID of the project
        command: Command dictionary

    Returns:
        List of updated result records
    """
    updates = command.get('updates', [])
    if not updates:
        raise ValueError("UPDATE_RESULTS command missing 'updates' field")

    # Get recent results (ordered by created_at DESC)
    recent_results = db.get_results(project_id)

    updated_results = []
    for update in updates:
        result_index = update.get('result_index')
        if result_index is None:
            continue

        # Convert 1-indexed to 0-indexed
        idx = result_index - 1

        if 0 <= idx < len(recent_results):
            result_id = recent_results[idx]['id']
            rating = update.get('user_rating')
            notes = update.get('user_notes')

            if rating:
                updated = db.update_result_rating(result_id, rating, notes)
                updated_results.append(updated)

    return updated_results


def execute_add_to_favorites(project_id: str, command: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Execute ADD_TO_FAVORITES command.

    Expected format:
    {
        "command": "ADD_TO_FAVORITES",
        "result_indices": [1, 3]  # 1-indexed positions
    }

    Args:
        project_id: UUID of the project
        command: Command dictionary

    Returns:
        List of updated result records
    """
    indices = command.get('result_indices', [])
    if not indices:
        raise ValueError("ADD_TO_FAVORITES command missing 'result_indices' field")

    # Get recent results
    recent_results = db.get_results(project_id)

    favorited = []
    for idx in indices:
        # Convert 1-indexed to 0-indexed
        array_idx = idx - 1

        if 0 <= array_idx < len(recent_results):
            result_id = recent_results[array_idx]['id']
            updated = db.add_to_favorites(result_id)
            favorited.append(updated)

    return favorited


def execute_mark_winner(project_id: str, command: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute MARK_WINNER command.

    Expected format:
    {
        "command": "MARK_WINNER",
        "result_index": 1  # 1-indexed position
    }

    Args:
        project_id: UUID of the project
        command: Command dictionary

    Returns:
        Updated project record
    """
    result_index = command.get('result_index')
    if result_index is None:
        raise ValueError("MARK_WINNER command missing 'result_index' field")

    # Get recent results
    recent_results = db.get_results(project_id)

    # Convert 1-indexed to 0-indexed
    idx = result_index - 1

    if 0 <= idx < len(recent_results):
        result_id = recent_results[idx]['id']
        return db.mark_as_winner(project_id, result_id)
    else:
        raise ValueError(f"Invalid result_index: {result_index}")


# ============================================================================
# Main Command Execution
# ============================================================================

COMMAND_HANDLERS = {
    # Step 1
    'SAVE_SUBJECT': execute_save_subject,
    'UPDATE_SUBJECT': execute_update_subject,

    # Step 2
    'SAVE_CHANNELS': execute_save_channels,
    'UPDATE_CHANNELS': execute_update_channels,
    'APPROVE_CHANNELS': execute_approve_channels,

    # Step 3
    'SAVE_RESULTS': execute_save_results,
    'UPDATE_RESULTS': execute_update_results,
    'ADD_TO_FAVORITES': execute_add_to_favorites,
    'MARK_WINNER': execute_mark_winner,
}


def parse_and_execute(
    project_id: str,
    agent_response: str,
    step: int
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Parse agent response for commands and execute them.

    Args:
        project_id: UUID of the project
        agent_response: The full agent response text
        step: Current step number (for validation)

    Returns:
        Tuple of (cleaned_response, executed_commands)
        - cleaned_response: Response text with commands removed
        - executed_commands: List of dicts with command name and result
    """
    # Extract all commands from response
    commands = extract_json_commands(agent_response)

    # Execute each command
    executed = []
    for command in commands:
        command_name = command.get('command')

        if command_name not in COMMAND_HANDLERS:
            print(f"Warning: Unknown command '{command_name}'")
            continue

        try:
            handler = COMMAND_HANDLERS[command_name]
            result = handler(project_id, command)

            executed.append({
                'command': command_name,
                'success': True,
                'result': result
            })

        except Exception as e:
            print(f"Error executing command '{command_name}': {e}")
            executed.append({
                'command': command_name,
                'success': False,
                'error': str(e)
            })

    # Clean response text
    cleaned = clean_response(agent_response)

    return cleaned, executed
