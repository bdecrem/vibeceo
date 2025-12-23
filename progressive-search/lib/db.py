#!/usr/bin/env python3
"""
Database Client for Progressive Search System

Provides clean CRUD operations for all ps_* tables via Supabase.
All database operations go through this module.
"""

import os
from typing import Optional, Dict, List, Any
from datetime import datetime
from pathlib import Path
from supabase import create_client, Client

# Load environment variables from sms-bot/.env.local
from dotenv import load_dotenv

# Use shared .env.local from sms-bot directory
env_path = Path(__file__).parent.parent.parent / 'sms-bot' / '.env.local'
load_dotenv(env_path)

# Initialize Supabase client
SUPABASE_URL = os.getenv('SUPABASE_URL')
# Use service key (same as sms-bot/lib/supabase.ts)
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variable")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)


# ============================================================================
# Projects Table (ps_projects)
# ============================================================================

def create_project(
    initial_subject: str,
    category: str = 'general',
    created_by: str = 'system'
) -> Dict[str, Any]:
    """
    Create a new progressive search project.

    Args:
        initial_subject: The user's initial search query
        category: Category type (leadgen, recruiting, job_search, etc.)
        created_by: User ID or 'system'

    Returns:
        The created project record with id
    """
    result = supabase.table('ps_projects').insert({
        'initial_subject': initial_subject,
        'category': category,
        'status': 'refining_query',
        'created_by': created_by
    }).execute()

    return result.data[0] if result.data else None


def get_project(project_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a project by ID.

    Args:
        project_id: UUID of the project

    Returns:
        Project record or None if not found
    """
    result = supabase.table('ps_projects').select('*').eq('id', project_id).execute()
    return result.data[0] if result.data else None


def update_project(project_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update a project with arbitrary fields.

    Args:
        project_id: UUID of the project
        updates: Dictionary of fields to update

    Returns:
        Updated project record
    """
    updates['updated_at'] = datetime.utcnow().isoformat()
    result = supabase.table('ps_projects').update(updates).eq('id', project_id).execute()
    return result.data[0] if result.data else None


def update_project_status(project_id: str, status: str) -> Dict[str, Any]:
    """
    Update project status.

    Args:
        project_id: UUID of the project
        status: New status (refining_query, discovering_channels, searching, completed)

    Returns:
        Updated project record
    """
    return update_project(project_id, {'status': status})


def save_clarified_subject(project_id: str, clarified_subject: str) -> Dict[str, Any]:
    """
    Save the clarified subject and update status to discovering_channels.

    Args:
        project_id: UUID of the project
        clarified_subject: The refined search subject

    Returns:
        Updated project record
    """
    return update_project(project_id, {
        'clarified_subject': clarified_subject,
        'clarified_at': datetime.utcnow().isoformat(),
        'status': 'discovering_channels'
    })


def mark_project_complete(project_id: str, winner_result_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Mark a project as complete.

    Args:
        project_id: UUID of the project
        winner_result_id: Optional UUID of the winning result

    Returns:
        Updated project record
    """
    updates = {
        'status': 'completed',
        'is_complete': True,
        'completed_at': datetime.utcnow().isoformat()
    }
    if winner_result_id:
        updates['winner_result_id'] = winner_result_id

    return update_project(project_id, updates)


# ============================================================================
# Conversation Table (ps_conversation)
# ============================================================================

def add_message(
    project_id: str,
    step: int,
    role: str,
    content: str,
    raw_response: str = None
) -> Dict[str, Any]:
    """
    Add a message to the conversation history.

    Args:
        project_id: UUID of the project
        step: Step number (1, 2, or 3)
        role: Message role ('user' or 'assistant')
        content: Message content (cleaned text for context)
        raw_response: Optional full unprocessed agent response (for debugging)

    Returns:
        The created message record
    """
    data = {
        'project_id': project_id,
        'step': step,
        'role': role,
        'content': content
    }

    # Only include raw_response if provided
    if raw_response is not None:
        data['raw_response'] = raw_response

    result = supabase.table('ps_conversation').insert(data).execute()

    return result.data[0] if result.data else None


def get_conversation(project_id: str, step: int) -> List[Dict[str, Any]]:
    """
    Get all messages for a project's step, ordered chronologically.

    Args:
        project_id: UUID of the project
        step: Step number (1, 2, or 3)

    Returns:
        List of message records in chronological order
    """
    result = supabase.table('ps_conversation')\
        .select('role, content, created_at')\
        .eq('project_id', project_id)\
        .eq('step', step)\
        .order('created_at', desc=False)\
        .execute()

    return result.data if result.data else []


# ============================================================================
# Channels Table (ps_channels)
# ============================================================================

def save_channels(project_id: str, channels: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Save multiple channels for a project.

    Args:
        project_id: UUID of the project
        channels: List of channel dicts with name, url, description, channel_type, rating

    Returns:
        List of created channel records
    """
    # Add project_id to each channel
    for channel in channels:
        channel['project_id'] = project_id

    result = supabase.table('ps_channels').insert(channels).execute()
    return result.data if result.data else []


def get_channels(project_id: str, approved_only: bool = False) -> List[Dict[str, Any]]:
    """
    Get all channels for a project.

    Args:
        project_id: UUID of the project
        approved_only: If True, only return approved channels

    Returns:
        List of channel records
    """
    query = supabase.table('ps_channels').select('*').eq('project_id', project_id)

    if approved_only:
        query = query.eq('is_approved', True)

    result = query.order('rating', desc=True).execute()
    return result.data if result.data else []


def update_channel(channel_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update a channel.

    Args:
        channel_id: UUID of the channel
        updates: Dictionary of fields to update

    Returns:
        Updated channel record
    """
    updates['updated_at'] = datetime.utcnow().isoformat()
    result = supabase.table('ps_channels').update(updates).eq('id', channel_id).execute()
    return result.data[0] if result.data else None


def approve_channels(project_id: str) -> int:
    """
    Mark all channels for a project as approved and update project status.

    Args:
        project_id: UUID of the project

    Returns:
        Number of channels approved
    """
    # Approve all channels
    result = supabase.table('ps_channels')\
        .update({'is_approved': True, 'updated_at': datetime.utcnow().isoformat()})\
        .eq('project_id', project_id)\
        .execute()

    # Update project status to searching
    update_project_status(project_id, 'searching')

    return len(result.data) if result.data else 0


def update_channel_rating(channel_id: str, rating: int) -> Dict[str, Any]:
    """
    Update a channel's rating.

    Args:
        channel_id: UUID of the channel
        rating: New rating (1-10)

    Returns:
        Updated channel record
    """
    return update_channel(channel_id, {'rating': rating})


# ============================================================================
# Results Table (ps_results)
# ============================================================================

def save_results(project_id: str, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Save multiple search results for a project.

    Args:
        project_id: UUID of the project
        results: List of result dicts with title, subtitle, description, url, etc.

    Returns:
        List of created result records
    """
    # Add project_id to each result
    for result in results:
        result['project_id'] = project_id

    result = supabase.table('ps_results').insert(results).execute()
    return result.data if result.data else []


def get_results(
    project_id: str,
    favorites_only: bool = False,
    winner_only: bool = False
) -> List[Dict[str, Any]]:
    """
    Get all results for a project.

    Args:
        project_id: UUID of the project
        favorites_only: If True, only return favorited results
        winner_only: If True, only return the winner result

    Returns:
        List of result records
    """
    query = supabase.table('ps_results').select('*').eq('project_id', project_id)

    if favorites_only:
        query = query.eq('is_favorite', True)

    if winner_only:
        query = query.eq('is_winner', True)

    result = query.order('created_at', desc=True).execute()
    return result.data if result.data else []


def update_result(result_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update a result.

    Args:
        result_id: UUID of the result
        updates: Dictionary of fields to update

    Returns:
        Updated result record
    """
    updates['updated_at'] = datetime.utcnow().isoformat()
    result = supabase.table('ps_results').update(updates).eq('id', result_id).execute()
    return result.data[0] if result.data else None


def update_result_rating(result_id: str, rating: int, notes: Optional[str] = None) -> Dict[str, Any]:
    """
    Update a result's rating and optional notes.

    Args:
        result_id: UUID of the result
        rating: User rating (1-10)
        notes: Optional user notes

    Returns:
        Updated result record
    """
    updates = {'user_rating': rating}
    if notes:
        updates['user_notes'] = notes

    return update_result(result_id, updates)


def add_to_favorites(result_id: str) -> Dict[str, Any]:
    """
    Mark a result as favorite.

    Args:
        result_id: UUID of the result

    Returns:
        Updated result record
    """
    return update_result(result_id, {'is_favorite': True})


def mark_as_winner(project_id: str, result_id: str) -> Dict[str, Any]:
    """
    Mark a result as the winner and complete the project.

    Args:
        project_id: UUID of the project
        result_id: UUID of the winning result

    Returns:
        Updated result record
    """
    # Mark result as winner
    update_result(result_id, {'is_winner': True})

    # Mark project as complete
    mark_project_complete(project_id, result_id)

    return get_project(project_id)


# ============================================================================
# Utility Functions
# ============================================================================

def get_project_summary(project_id: str) -> Dict[str, Any]:
    """
    Get a complete summary of a project including counts.

    Args:
        project_id: UUID of the project

    Returns:
        Dictionary with project info and counts
    """
    project = get_project(project_id)
    if not project:
        return None

    channels = get_channels(project_id)
    approved_channels = get_channels(project_id, approved_only=True)
    results = get_results(project_id)
    favorites = get_results(project_id, favorites_only=True)

    return {
        'project': project,
        'channels_count': len(channels),
        'approved_channels_count': len(approved_channels),
        'results_count': len(results),
        'favorites_count': len(favorites)
    }
