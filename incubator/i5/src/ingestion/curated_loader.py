"""
Curated Ideas Loader for Tokenshots.

Parses CURATED-IDEAS.md file and returns pending ideas for ingestion.
"""

import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

# Path to curated ideas file
CURATED_IDEAS_PATH = Path(__file__).parent.parent.parent / "data" / "CURATED-IDEAS.md"


def parse_curated_ideas(filepath: Path = CURATED_IDEAS_PATH) -> List[Dict[str, Any]]:
    """
    Parse CURATED-IDEAS.md and return list of pending ideas.

    Returns list of dicts with:
    - id: slug derived from title
    - title: idea title
    - abstract: description
    - url: source URL if provided
    - source: 'curated'
    - added_date: when added
    - status: 'pending', 'featured', 'skipped'
    - notes: why it's interesting section
    """
    if not filepath.exists():
        return []

    content = filepath.read_text()

    # Split into idea blocks (## Idea: ...)
    idea_pattern = r'## Idea:\s*(.+?)(?=\n## Idea:|\n---\s*$|$)'
    blocks = re.split(r'(?=## Idea:)', content)

    ideas = []
    for block in blocks:
        if not block.strip() or '## Idea:' not in block:
            continue

        idea = parse_idea_block(block)
        if idea:
            ideas.append(idea)

    return ideas


def parse_idea_block(block: str) -> Optional[Dict[str, Any]]:
    """Parse a single idea block."""

    # Extract title
    title_match = re.search(r'## Idea:\s*(.+)', block)
    if not title_match:
        return None
    title = title_match.group(1).strip()

    # Create slug from title
    slug = re.sub(r'[^a-z0-9]+', '-', title.lower()).strip('-')[:50]

    # Extract fields
    source = extract_field(block, 'Source')
    abstract = extract_field(block, 'Abstract')
    added_date = extract_field(block, 'Added')
    status = extract_field(block, 'Status') or 'pending'

    # Extract "Why it's interesting" section
    notes_match = re.search(r'### Why it\'s interesting\s*\n([\s\S]*?)(?=\n##|\n---|\Z)', block)
    notes = notes_match.group(1).strip() if notes_match else None

    # Determine URL
    url = source if source and source.startswith('http') else None

    return {
        'id': f"curated-{slug}",
        'source_type': 'curated',
        'source_id': slug,
        'title': title,
        'abstract': abstract or notes or '',
        'url': url,
        'added_date': added_date,
        'status': status.lower(),
        'notes': notes,
        '_raw_block': block,  # Keep for updating status later
    }


def extract_field(block: str, field_name: str) -> Optional[str]:
    """Extract a **Field:** value from block."""
    pattern = rf'\*\*{field_name}:\*\*\s*(.+)'
    match = re.search(pattern, block, re.IGNORECASE)
    if match:
        value = match.group(1).strip()
        # Don't return template placeholders
        if value.startswith('[') and value.endswith(']'):
            return None
        if value.lower() in ('pending', 'featured', 'skipped'):
            return value
        return value
    return None


def get_pending_ideas(filepath: Path = CURATED_IDEAS_PATH) -> List[Dict[str, Any]]:
    """Get only pending ideas (not yet featured or skipped)."""
    all_ideas = parse_curated_ideas(filepath)
    return [idea for idea in all_ideas if idea.get('status') == 'pending']


def mark_idea_featured(
    idea_slug: str,
    featured_date: str = None,
    filepath: Path = CURATED_IDEAS_PATH
) -> bool:
    """
    Update an idea's status to 'featured' in the markdown file.

    Returns True if successfully updated.
    """
    if not filepath.exists():
        return False

    if featured_date is None:
        featured_date = datetime.now().strftime('%Y-%m-%d')

    content = filepath.read_text()

    # Find the idea block and update its status
    # Look for the status line within the idea block
    pattern = rf'(## Idea:[^\n]*{re.escape(idea_slug)}[^\n]*\n[\s\S]*?\*\*Status:\*\*)\s*pending'
    replacement = rf'\1 featured ({featured_date})'

    new_content, count = re.subn(pattern, replacement, content, flags=re.IGNORECASE)

    if count > 0:
        filepath.write_text(new_content)
        return True

    # Try alternative: match by exact slug in the idea ID
    all_ideas = parse_curated_ideas(filepath)
    for idea in all_ideas:
        if idea['source_id'] == idea_slug and idea['status'] == 'pending':
            # Find and replace in the raw block
            old_status = '**Status:** pending'
            new_status = f'**Status:** featured ({featured_date})'
            new_content = content.replace(
                idea['_raw_block'],
                idea['_raw_block'].replace(old_status, new_status)
            )
            if new_content != content:
                filepath.write_text(new_content)
                return True

    return False


async def fetch_curated() -> List[Dict[str, Any]]:
    """
    Async wrapper for fetching curated ideas.
    Returns papers in the standard format expected by the pipeline.
    """
    ideas = get_pending_ideas()

    papers = []
    for idea in ideas:
        papers.append({
            'id': idea['id'],
            'source_type': 'curated',
            'source_id': idea['source_id'],
            'title': idea['title'],
            'abstract': idea['abstract'],
            'url': idea.get('url'),
            'metadata': {
                'added_date': idea.get('added_date'),
                'notes': idea.get('notes'),
                'curated': True,  # Flag for priority in selection
            }
        })

    return papers


# Test
if __name__ == '__main__':
    print("Curated Ideas Loader Test")
    print("=" * 50)

    ideas = parse_curated_ideas()
    print(f"Total ideas found: {len(ideas)}")

    pending = get_pending_ideas()
    print(f"Pending ideas: {len(pending)}")

    for idea in pending:
        print(f"\n- {idea['title']}")
        print(f"  Status: {idea['status']}")
        print(f"  Source: {idea.get('url', 'manual')}")
