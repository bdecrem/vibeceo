#!/usr/bin/env python3
"""
Agent Messages Library

Provides clean CRUD operations for incubator_messages table via Supabase.
Allows agents to:
1. Write notes to themselves (scope: SELF)
2. Broadcast insights to all agents (scope: ALL)
3. Send direct messages to specific agents (scope: DIRECT)
"""

import os
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from pathlib import Path
from supabase import create_client, Client

# Load environment variables from .env file
from dotenv import load_dotenv

# Find .env file (look in sms-bot directory)
env_path = Path(__file__).parent.parent.parent / 'sms-bot' / '.env.local'
load_dotenv(env_path)

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variable")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ============================================================================
# Helper Functions
# ============================================================================

def _days_ago(days: int) -> str:
    """
    Return ISO timestamp for N days ago.

    Args:
        days: Number of days to go back

    Returns:
        ISO format timestamp string
    """
    return (datetime.utcnow() - timedelta(days=days)).isoformat()


def _validate_message_params(scope: str, recipient: Optional[str]):
    """
    Validate scope/recipient constraints.

    Args:
        scope: Message scope (SELF, ALL, DIRECT)
        recipient: Recipient agent_id (required for DIRECT, null otherwise)

    Raises:
        ValueError: If validation fails
    """
    if scope not in ('SELF', 'ALL', 'DIRECT'):
        raise ValueError(f"Invalid scope: {scope}. Must be SELF, ALL, or DIRECT")

    if scope == 'DIRECT' and not recipient:
        raise ValueError("recipient required when scope='DIRECT'")

    if scope != 'DIRECT' and recipient:
        raise ValueError("recipient must be None when scope != 'DIRECT'")


# ============================================================================
# Read Functions
# ============================================================================

def read_my_messages(agent_id: str, days: int = 30) -> List[Dict[str, Any]]:
    """
    Read self-notes for this agent from the last N days.

    Args:
        agent_id: Agent identifier (e.g., 'i1', 'i2', 'i3-2')
        days: Number of days to look back (default: 30)

    Returns:
        List of message records, newest first
    """
    cutoff = _days_ago(days)

    result = supabase.table('incubator_messages')\
        .select('*')\
        .eq('agent_id', agent_id)\
        .eq('scope', 'SELF')\
        .gte('created_at', cutoff)\
        .order('created_at', desc=True)\
        .execute()

    return result.data if result.data else []


def read_broadcasts(days: int = 7) -> List[Dict[str, Any]]:
    """
    Read broadcast messages from all agents from the last N days.

    Args:
        days: Number of days to look back (default: 7)

    Returns:
        List of message records, newest first
    """
    cutoff = _days_ago(days)

    result = supabase.table('incubator_messages')\
        .select('*')\
        .eq('scope', 'ALL')\
        .gte('created_at', cutoff)\
        .order('created_at', desc=True)\
        .execute()

    return result.data if result.data else []


def read_inbox(agent_id: str, days: int = 7) -> List[Dict[str, Any]]:
    """
    Read direct messages sent to this agent from the last N days.

    Args:
        agent_id: Agent identifier (e.g., 'i1', 'i2', 'i3-2')
        days: Number of days to look back (default: 7)

    Returns:
        List of message records, newest first
    """
    cutoff = _days_ago(days)

    result = supabase.table('incubator_messages')\
        .select('*')\
        .eq('recipient', agent_id)\
        .eq('scope', 'DIRECT')\
        .gte('created_at', cutoff)\
        .order('created_at', desc=True)\
        .execute()

    return result.data if result.data else []


def read_all_for_agent(agent_id: str, days: int = 30) -> Dict[str, List[Dict[str, Any]]]:
    """
    Read all messages relevant to this agent.

    Convenience function that returns:
    - Self-notes from this agent
    - Broadcasts from all agents
    - Direct messages to this agent

    Args:
        agent_id: Agent identifier (e.g., 'i1', 'i2', 'i3-2')
        days: Number of days to look back (default: 30)

    Returns:
        Dictionary with keys: 'self', 'broadcasts', 'inbox'
    """
    return {
        'self': read_my_messages(agent_id, days),
        'broadcasts': read_broadcasts(min(days, 7)),  # Broadcasts typically shorter window
        'inbox': read_inbox(agent_id, min(days, 7))
    }


# ============================================================================
# Write Function
# ============================================================================

def write_message(
    agent_id: str,
    scope: str,
    type: str,
    content: str,
    recipient: Optional[str] = None,
    tags: Optional[List[str]] = None,
    context: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Write a message to the incubator_messages table.

    Args:
        agent_id: Sender agent identifier (e.g., 'i1', 'i2', 'i3-2')
        scope: Message scope ('SELF', 'ALL', or 'DIRECT')
        type: Message type ('lesson', 'warning', 'success', 'failure', 'observation')
        content: The actual message text
        recipient: Recipient agent_id (required if scope='DIRECT', null otherwise)
        tags: Optional list of searchable tags
        context: Optional JSONB metadata

    Returns:
        The created message record

    Raises:
        ValueError: If validation fails
    """
    # Validate parameters
    _validate_message_params(scope, recipient)

    if type not in ('lesson', 'warning', 'success', 'failure', 'observation'):
        raise ValueError(f"Invalid type: {type}")

    # Build message data
    data = {
        'agent_id': agent_id,
        'scope': scope,
        'type': type,
        'content': content,
        'tags': tags or [],
        'context': context or {}
    }

    # Add recipient if provided
    if recipient:
        data['recipient'] = recipient

    # Insert into database
    result = supabase.table('incubator_messages').insert(data).execute()

    return result.data[0] if result.data else None


# ============================================================================
# Query Helper Functions
# ============================================================================

def filter_by_tags(messages: List[Dict[str, Any]], tags: List[str]) -> List[Dict[str, Any]]:
    """
    Filter messages that contain any of the specified tags.

    Args:
        messages: List of message records
        tags: List of tags to filter by

    Returns:
        Filtered list of messages
    """
    if not tags:
        return messages

    return [
        msg for msg in messages
        if any(tag in (msg.get('tags') or []) for tag in tags)
    ]


def filter_by_type(messages: List[Dict[str, Any]], message_type: str) -> List[Dict[str, Any]]:
    """
    Filter messages by type.

    Args:
        messages: List of message records
        message_type: Type to filter by ('lesson', 'warning', 'success', 'failure', 'observation')

    Returns:
        Filtered list of messages
    """
    return [msg for msg in messages if msg.get('type') == message_type]


# ============================================================================
# Utility Functions
# ============================================================================

def get_message_summary(agent_id: str, days: int = 30) -> Dict[str, Any]:
    """
    Get a summary of message counts for this agent.

    Args:
        agent_id: Agent identifier
        days: Number of days to look back

    Returns:
        Dictionary with message counts
    """
    all_messages = read_all_for_agent(agent_id, days)

    return {
        'agent_id': agent_id,
        'days': days,
        'self_notes_count': len(all_messages['self']),
        'broadcasts_count': len(all_messages['broadcasts']),
        'inbox_count': len(all_messages['inbox']),
        'total_count': len(all_messages['self']) + len(all_messages['broadcasts']) + len(all_messages['inbox'])
    }
