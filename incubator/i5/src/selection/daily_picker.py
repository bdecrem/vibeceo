"""
Daily paper selection.

Picks the top 4 papers for the day based on scoring and diversity rules.
"""

from typing import List, Dict, Any, Tuple
from collections import defaultdict


def select(
    papers: List[Dict[str, Any]],
    config: Dict[str, Any]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Select top papers for today's episode.

    Args:
        papers: List of Stage 2 survivors with scores
        config: Configuration dict

    Returns:
        Tuple of (picks, backups) - both are lists of paper dicts
    """
    selection_config = config["selection"]
    num_picks = selection_config["daily_picks"]
    num_backups = selection_config["backup_count"]
    max_per_category = selection_config["max_per_category"]
    weights = selection_config["scoring_weights"]

    # Calculate final scores
    scored_papers = []
    for paper in papers:
        final_score = calculate_final_score(paper, weights)
        paper['final_score'] = final_score
        scored_papers.append(paper)

    # Sort by score
    scored_papers.sort(key=lambda p: p['final_score'], reverse=True)

    # Apply diversity rules
    picks = []
    backups = []
    category_counts = defaultdict(int)

    for paper in scored_papers:
        # Get paper's primary category
        category = get_primary_category(paper)

        # Check category limit
        if category_counts[category] >= max_per_category:
            # Can still be a backup
            if len(backups) < num_backups:
                backups.append(paper)
            continue

        if len(picks) < num_picks:
            picks.append(paper)
            category_counts[category] += 1
        elif len(backups) < num_backups:
            backups.append(paper)

        if len(picks) >= num_picks and len(backups) >= num_backups:
            break

    return picks, backups


def calculate_final_score(paper: Dict[str, Any], weights: Dict[str, float]) -> float:
    """
    Calculate weighted final score for a paper.

    Args:
        paper: Paper dict with stage2 score and metadata
        weights: Scoring weight config

    Returns:
        Final score 0-100
    """
    score = 0.0

    # Stage 2 score
    stage2_score = paper.get('score', 0)
    score += stage2_score * weights['stage2_score']

    # Source engagement (normalize to 0-100)
    engagement = get_engagement_score(paper)
    score += engagement * weights['source_engagement']

    # Recency (papers from today get full points)
    recency = get_recency_score(paper)
    score += recency * weights['recency']

    # Diversity bonus (backlog papers get bonus)
    if paper.get('source') == 'backlog':
        score += 100 * weights['diversity']

    return score


def get_engagement_score(paper: Dict[str, Any]) -> float:
    """
    Normalize source engagement to 0-100 scale.

    Args:
        paper: Paper dict with metadata

    Returns:
        Engagement score 0-100
    """
    metadata = paper.get('metadata', {})

    # HN score (typical range: 10-500+)
    if 'hn_score' in metadata:
        hn = metadata['hn_score']
        return min(hn / 3, 100)  # 300+ = max

    # Reddit score (typical range: 20-2000+)
    if 'reddit_score' in metadata:
        reddit = metadata['reddit_score']
        return min(reddit / 10, 100)  # 1000+ = max

    # Backlog historical score
    if 'historical_score' in metadata:
        return metadata['historical_score']

    # arXiv (no engagement signal)
    return 50  # Neutral


def get_recency_score(paper: Dict[str, Any]) -> float:
    """
    Score based on how recent the paper is.

    Args:
        paper: Paper dict with published date

    Returns:
        Recency score 0-100
    """
    from datetime import datetime

    published = paper.get('published')
    if not published:
        return 50  # Neutral if unknown

    try:
        pub_date = datetime.fromisoformat(published.replace('Z', '+00:00'))
        days_old = (datetime.now(pub_date.tzinfo) - pub_date).days

        if days_old <= 1:
            return 100
        elif days_old <= 7:
            return 80
        elif days_old <= 30:
            return 50
        else:
            return 20
    except:
        return 50


def get_primary_category(paper: Dict[str, Any]) -> str:
    """
    Get primary category for diversity tracking.

    Args:
        paper: Paper dict

    Returns:
        Category string
    """
    # Try to get from arXiv categories
    metadata = paper.get('metadata', {})
    if 'primary_category' in metadata:
        return metadata['primary_category']

    if 'categories' in metadata:
        cats = metadata['categories']
        if cats:
            return cats[0] if isinstance(cats, list) else cats

    # Try to infer from tags
    tags = paper.get('stage1_tags', [])
    if tags:
        return tags[0]

    return 'unknown'
