"""
Deduplication utilities for Tokenshots.

Three-layer dedup strategy:
1. arxiv ID normalization (exact match via SQL constraint)
2. Title fuzzy match (pg_trgm similarity)
3. Agentic semantic check (Claude via MCP at selection time)
"""

import re
import os
from typing import Optional, List, Dict, Any
from pathlib import Path

# Add parent to path for config import
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
import config


def extract_arxiv_id(url: str) -> Optional[str]:
    """
    Extract arxiv ID from various URL formats.

    Handles:
    - https://arxiv.org/abs/2401.12345
    - https://arxiv.org/abs/2401.12345v2
    - https://arxiv.org/pdf/2401.12345.pdf
    - http://ar5iv.org/abs/2401.12345
    - https://huggingface.co/papers/2401.12345

    Returns normalized ID without version (e.g., "2401.12345")
    """
    if not url:
        return None

    patterns = [
        # Standard arxiv URLs
        r'arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5})(?:v\d+)?',
        # ar5iv mirror
        r'ar5iv\.org/(?:abs|html)/(\d{4}\.\d{4,5})(?:v\d+)?',
        # HuggingFace papers
        r'huggingface\.co/papers/(\d{4}\.\d{4,5})',
        # Old arxiv format (e.g., hep-ph/9901234)
        r'arxiv\.org/(?:abs|pdf)/([a-z-]+/\d{7})(?:v\d+)?',
        # Just the ID in text
        r'\b(\d{4}\.\d{4,5})(?:v\d+)?\b',
    ]

    for pattern in patterns:
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            arxiv_id = match.group(1)
            # Remove version suffix if present
            arxiv_id = re.sub(r'v\d+$', '', arxiv_id)
            return arxiv_id

    return None


def extract_arxiv_id_from_text(text: str) -> Optional[str]:
    """
    Extract arxiv ID from any text (title, abstract, etc.)
    Less strict than URL extraction.
    """
    if not text:
        return None

    # Look for arxiv ID pattern in text
    match = re.search(r'\b(\d{4}\.\d{4,5})\b', text)
    if match:
        return match.group(1)

    return None


async def check_arxiv_duplicate(arxiv_id: str, supabase_client) -> bool:
    """
    Check if an arxiv ID already exists in the database.
    Returns True if duplicate found.
    """
    if not arxiv_id:
        return False

    result = await supabase_client.table('tokenshots_papers').select('id').eq('arxiv_id', arxiv_id).limit(1).execute()
    return len(result.data) > 0


async def check_title_similarity(
    title: str,
    supabase_client,
    threshold: float = 0.8,
    days: int = 30
) -> Optional[Dict[str, Any]]:
    """
    Check for similar titles in recent papers using pg_trgm.
    Returns the matching paper if similarity > threshold, else None.

    Note: Requires pg_trgm extension enabled in Supabase.
    """
    if not title or len(title) < 10:
        return None

    # Use raw SQL for similarity function
    query = f"""
    SELECT id, title, source_type, source_id,
           similarity(title, '{title.replace("'", "''")}') as sim
    FROM tokenshots_papers
    WHERE ingested_at > now() - interval '{days} days'
      AND similarity(title, '{title.replace("'", "''")}') > {threshold}
    ORDER BY sim DESC
    LIMIT 1
    """

    try:
        result = await supabase_client.rpc('exec_sql', {'query': query}).execute()
        if result.data and len(result.data) > 0:
            return result.data[0]
    except Exception as e:
        # Fallback: simple substring match if pg_trgm not available
        print(f"Warning: pg_trgm query failed ({e}), falling back to substring match")

        # Simple word overlap check
        title_words = set(title.lower().split())
        result = await supabase_client.table('tokenshots_papers').select('id, title, source_type, source_id').gte('ingested_at', f"now() - interval '{days} days'").execute()

        for paper in result.data:
            paper_words = set(paper['title'].lower().split())
            overlap = len(title_words & paper_words) / max(len(title_words), 1)
            if overlap > threshold:
                return paper

    return None


async def check_semantic_duplicates(
    picks: List[Dict[str, Any]],
    recent_featured: List[Dict[str, Any]],
    anthropic_client
) -> List[Dict[str, Any]]:
    """
    Use Claude to check if any picks cover topics we've recently featured.

    Args:
        picks: List of 4 paper dicts with title, abstract
        recent_featured: List of recently featured papers (last 20)
        anthropic_client: Anthropic client for Claude API

    Returns:
        List of picks that are flagged as semantic duplicates
    """
    if not picks or not recent_featured:
        return []

    # Build the prompt
    recent_titles = "\n".join([
        f"- {p['title']} (featured {p.get('featured_date', 'recently')})"
        for p in recent_featured[:20]
    ])

    picks_text = "\n\n".join([
        f"**Pick {i+1}: {p['title']}**\n{p.get('abstract', '')[:500]}"
        for i, p in enumerate(picks)
    ])

    prompt = f"""You are checking for semantic duplicates in a daily research podcast.

Here are the titles of papers we've recently featured on Tokenshots:
{recent_titles}

Here are today's 4 picks:
{picks_text}

For each pick, determine if it covers substantially the same ground as any recently featured paper.
We want to avoid discussing the same topic twice, even if the specific paper is different.

Respond with a JSON array of objects, one per pick:
[
  {{"pick": 1, "is_duplicate": false, "reason": null}},
  {{"pick": 2, "is_duplicate": true, "reason": "Similar to 'Paper X' - both cover Y topic"}},
  ...
]

Only flag as duplicate if the core topic/contribution is essentially the same. Different papers on tangentially related topics are fine."""

    try:
        response = await anthropic_client.messages.create(
            model=config.SCREENING_MODEL_STAGE2,
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        # Parse JSON response
        import json
        text = response.content[0].text
        # Extract JSON from response (handle markdown code blocks)
        if "```" in text:
            text = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text).group(1)

        results = json.loads(text)

        # Return flagged picks
        flagged = []
        for r in results:
            if r.get('is_duplicate'):
                pick_idx = r['pick'] - 1
                if 0 <= pick_idx < len(picks):
                    flagged.append({
                        **picks[pick_idx],
                        'duplicate_reason': r.get('reason')
                    })

        return flagged

    except Exception as e:
        print(f"Warning: Semantic dedup check failed: {e}")
        return []


def is_duplicate(
    paper: Dict[str, Any],
    existing_arxiv_ids: set,
    existing_source_ids: set
) -> tuple[bool, str]:
    """
    Quick in-memory dedup check before database insert.

    Returns:
        (is_dup, reason) tuple
    """
    source_key = f"{paper.get('source_type')}:{paper.get('source_id')}"
    if source_key in existing_source_ids:
        return True, f"Duplicate source_id: {source_key}"

    arxiv_id = paper.get('arxiv_id') or extract_arxiv_id(paper.get('url', ''))
    if arxiv_id and arxiv_id in existing_arxiv_ids:
        return True, f"Duplicate arxiv_id: {arxiv_id}"

    return False, ""


# Convenience function for the pipeline
async def deduplicate_papers(
    papers: List[Dict[str, Any]],
    supabase_client
) -> List[Dict[str, Any]]:
    """
    Filter out duplicate papers from a batch.
    Uses Layer 1 (arxiv ID) and Layer 2 (title similarity).

    Returns list of non-duplicate papers.
    """
    unique_papers = []
    seen_arxiv_ids = set()
    seen_source_ids = set()

    for paper in papers:
        # Extract/normalize arxiv ID
        arxiv_id = paper.get('arxiv_id') or extract_arxiv_id(paper.get('url', ''))
        if arxiv_id:
            paper['arxiv_id'] = arxiv_id

        # Layer 1: Check in-memory duplicates
        is_dup, reason = is_duplicate(paper, seen_arxiv_ids, seen_source_ids)
        if is_dup:
            if config.VERBOSE:
                print(f"  Skipping duplicate: {reason}")
            continue

        # Layer 1: Check database for arxiv ID
        if arxiv_id:
            db_dup = await check_arxiv_duplicate(arxiv_id, supabase_client)
            if db_dup:
                if config.VERBOSE:
                    print(f"  Skipping DB duplicate arxiv_id: {arxiv_id}")
                continue

        # Layer 2: Check title similarity
        title_match = await check_title_similarity(paper.get('title', ''), supabase_client)
        if title_match:
            if config.VERBOSE:
                print(f"  Skipping similar title: '{paper.get('title')[:50]}...' matches '{title_match['title'][:50]}...'")
            continue

        # Track for in-memory dedup
        if arxiv_id:
            seen_arxiv_ids.add(arxiv_id)
        seen_source_ids.add(f"{paper.get('source_type')}:{paper.get('source_id')}")

        unique_papers.append(paper)

    return unique_papers
