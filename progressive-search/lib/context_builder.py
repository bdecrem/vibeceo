#!/usr/bin/env python3
"""
Context Builder for Progressive Search System

Constructs agent context from database state, including:
- Conversation history
- Project state
- Channels
- Previous results (for deduplication in Step 3)
"""

from typing import Dict, List, Any, Optional
from . import db


def build_step1_context(project_id: str, user_message: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Build context for Step 1 (Clarify Subject) agent.

    Args:
        project_id: UUID of the project
        user_message: Optional new user message to append

    Returns:
        List of messages in Claude API format: [{"role": "user", "content": "..."}]
    """
    project = db.get_project(project_id)
    if not project:
        raise ValueError(f"Project not found: {project_id}")

    # Get conversation history for step 1
    history = db.get_conversation(project_id, step=1)

    # Build message list
    messages = []

    # Add conversation history
    for msg in history:
        messages.append({
            'role': msg['role'],
            'content': msg['content']
        })

    # Add current project state as system context (in the first user message if empty history)
    if not messages:
        initial_context = f"""Initial search query: "{project['initial_subject']}"

Your task: Refine this into a clear, specific search subject through conversation.
Ask clarifying questions about location, experience, budget, requirements, etc.

Once the user is satisfied, save the clarified subject using the SAVE_SUBJECT command."""

        messages.append({
            'role': 'user',
            'content': initial_context
        })

    # Append current clarified subject if it exists (helps agent see progress)
    if project.get('clarified_subject'):
        status_message = f"\n\n**Current clarified subject:**\n{project['clarified_subject']}"
        # Append to last assistant message or create new one
        if messages and messages[-1]['role'] == 'assistant':
            messages[-1]['content'] += status_message
        else:
            messages.append({
                'role': 'assistant',
                'content': f"I've refined the search to:{status_message}"
            })

    # Add new user message if provided
    if user_message:
        messages.append({
            'role': 'user',
            'content': user_message
        })

    return messages


def build_step2_context(project_id: str, user_message: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Build context for Step 2 (Discover Channels) agent.

    Args:
        project_id: UUID of the project
        user_message: Optional new user message to append

    Returns:
        List of messages in Claude API format
    """
    project = db.get_project(project_id)
    if not project:
        raise ValueError(f"Project not found: {project_id}")

    if not project.get('clarified_subject'):
        raise ValueError("Cannot start Step 2: No clarified subject found. Complete Step 1 first.")

    # Get conversation history for step 2
    history = db.get_conversation(project_id, step=2)

    # Build message list
    messages = []

    # Add conversation history
    for msg in history:
        messages.append({
            'role': msg['role'],
            'content': msg['content']
        })

    # If no history, add initial context
    if not messages:
        initial_context = f"""Clarified search subject: "{project['clarified_subject']}"

Your task: Discover 3-5 relevant channels (websites/sources) to search for this.

Use web search to find the best channels. Rate each channel 1-10 based on relevance.
Present the list to the user for feedback and adjustments.

Once approved, save using the SAVE_CHANNELS command and mark as approved."""

        messages.append({
            'role': 'user',
            'content': initial_context
        })

    # Add current channels state if they exist
    channels = db.get_channels(project_id)
    if channels:
        channels_summary = "\n\n**Current channels:**\n"
        for ch in channels:
            status = "✓ Approved" if ch['is_approved'] else "Pending"
            channels_summary += f"- {ch['name']} (rating: {ch['rating']}/10) [{status}]\n"

        # Append to last assistant message or create new one
        if messages and messages[-1]['role'] == 'assistant':
            messages[-1]['content'] += channels_summary
        else:
            messages.append({
                'role': 'assistant',
                'content': f"Here's the current channel list:{channels_summary}"
            })

    # Add new user message if provided
    if user_message:
        messages.append({
            'role': 'user',
            'content': user_message
        })

    return messages


def build_step3_context(project_id: str, user_message: Optional[str] = None) -> List[Dict[str, str]]:
    """
    Build context for Step 3 (Execute Search) agent.

    Includes previous results for deduplication and learning from ratings.

    Args:
        project_id: UUID of the project
        user_message: Optional new user message to append

    Returns:
        List of messages in Claude API format
    """
    project = db.get_project(project_id)
    if not project:
        raise ValueError(f"Project not found: {project_id}")

    channels = db.get_channels(project_id, approved_only=True)
    if not channels:
        raise ValueError("Cannot start Step 3: No approved channels found. Complete Step 2 first.")

    # Get conversation history for step 3
    history = db.get_conversation(project_id, step=3)

    # Build message list
    messages = []

    # Add conversation history
    for msg in history:
        messages.append({
            'role': msg['role'],
            'content': msg['content']
        })

    # If no history, add initial context
    if not messages:
        # Prepare channels info
        channels_info = "\n".join([
            f"- {ch['name']} (rating: {ch['rating']}/10): {ch['description']}"
            for ch in channels
        ])

        initial_context = f"""Search subject: "{project['clarified_subject']}"

Approved channels to search:
{channels_info}

Your task: Search these channels and return 5 relevant results.

Include: title, subtitle, description, URL, and any relevant metadata.
Use the SAVE_RESULTS command when ready."""

        messages.append({
            'role': 'user',
            'content': initial_context
        })

    # Add previous results context (for deduplication and learning)
    results = db.get_results(project_id)
    if results:
        # Build results summary
        results_summary = "\n\n**Previous results found:**\n"

        for idx, result in enumerate(results[:20], 1):  # Limit to 20 most recent
            rating_str = f" (rated {result['user_rating']}/10)" if result.get('user_rating') else ""
            notes_str = f" - Notes: {result['user_notes']}" if result.get('user_notes') else ""
            favorite_str = " ⭐" if result.get('is_favorite') else ""

            results_summary += f"{idx}. {result['title']}{rating_str}{favorite_str}\n"
            results_summary += f"   URL: {result['url']}\n"
            if notes_str:
                results_summary += f"   {notes_str}\n"

        results_summary += "\n**IMPORTANT:** Do not show any of these URLs again. Find new results."

        # Extract learning from ratings
        rated_results = [r for r in results if r.get('user_rating')]
        if rated_results:
            high_rated = [r for r in rated_results if r['user_rating'] >= 8]
            low_rated = [r for r in rated_results if r['user_rating'] <= 3]

            if high_rated or low_rated:
                results_summary += "\n\n**What the user likes:**\n"
                if high_rated:
                    for r in high_rated[:3]:
                        results_summary += f"- {r['title']} ({r['user_rating']}/10)"
                        if r.get('user_notes'):
                            results_summary += f": {r['user_notes']}"
                        results_summary += "\n"

                if low_rated:
                    results_summary += "\n**What the user dislikes:**\n"
                    for r in low_rated[:3]:
                        results_summary += f"- {r['title']} ({r['user_rating']}/10)"
                        if r.get('user_notes'):
                            results_summary += f": {r['user_notes']}"
                        results_summary += "\n"

        # Append to context
        if messages and messages[-1]['role'] == 'assistant':
            messages[-1]['content'] += results_summary
        else:
            messages.append({
                'role': 'assistant',
                'content': results_summary
            })

    # Add new user message if provided
    if user_message:
        messages.append({
            'role': 'user',
            'content': user_message
        })

    return messages


def get_project_state_summary(project_id: str) -> Dict[str, Any]:
    """
    Get a human-readable summary of the project's current state.

    Useful for script output and debugging.

    Args:
        project_id: UUID of the project

    Returns:
        Dictionary with project state summary
    """
    project = db.get_project(project_id)
    if not project:
        return {'error': f'Project not found: {project_id}'}

    summary = {
        'project_id': project_id,
        'category': project['category'],
        'status': project['status'],
        'initial_subject': project['initial_subject'],
        'clarified_subject': project.get('clarified_subject'),
        'is_complete': project.get('is_complete', False)
    }

    # Add counts
    channels = db.get_channels(project_id)
    approved_channels = db.get_channels(project_id, approved_only=True)
    results = db.get_results(project_id)
    favorites = db.get_results(project_id, favorites_only=True)

    summary['channels_count'] = len(channels)
    summary['approved_channels_count'] = len(approved_channels)
    summary['results_count'] = len(results)
    summary['favorites_count'] = len(favorites)

    # Add next step
    if project['status'] == 'refining_query':
        summary['next_step'] = 'Continue refining with step1-clarify.py'
    elif project['status'] == 'discovering_channels':
        summary['next_step'] = 'Discover channels with step2-channels.py'
    elif project['status'] == 'searching':
        summary['next_step'] = 'Execute search with step3-search.py'
    elif project['status'] == 'completed':
        summary['next_step'] = 'Project complete!'

    return summary
