#!/usr/bin/env python3
"""
OpenAlex Enrichment Backfill - Production Script

Enriches canonical authors in Neo4j with OpenAlex data using paper-based matching.
Uses proven approach: match authors via paper DOI + author position (not unreliable name search).

Features:
- Checkpoint/resume system (saves progress every 100 batches)
- Connection retry logic (handles Neo4j timeouts)
- Batch processing (50 papers per OpenAlex API call)
- Duplicate prevention (skips already-enriched authors)
- Progress tracking and statistics
- Dry-run mode for testing

Usage:
    # Test with dry-run
    python3 openalex_enrichment_backfill.py --start-date 2024-02-14 --end-date 2024-02-15 --dry-run

    # Run full backfill
    python3 openalex_enrichment_backfill.py --start-date 2024-02-14 --end-date 2025-06-30

    # Resume from checkpoint
    python3 openalex_enrichment_backfill.py --resume backfill-2024-02-14

    # Force re-enrichment (update old data)
    python3 openalex_enrichment_backfill.py --start-date 2024-02-14 --end-date 2025-06-30 --force

Expected Results:
    - Papers processed: ~127,248 (Feb 2024 - June 2025)
    - Papers in OpenAlex: ~89,000 (70% coverage)
    - Authors enriched: ~67,000 (high confidence via paper-position matching)
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import date, datetime, timedelta
from difflib import SequenceMatcher
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

import requests
from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError, ServiceUnavailable, SessionExpired

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

# OpenAlex configuration
OPENALEX_API_BASE = "https://api.openalex.org"
OPENALEX_EMAIL = os.getenv("OPENALEX_EMAIL", "bart@advisorsfoundry.com")

# Matching thresholds
NAME_SIMILARITY_THRESHOLD = 0.75  # 75% similarity required
ENRICHMENT_VERSION = "v1.0"

# Batch configuration
BATCH_SIZE = 50  # OpenAlex allows up to 50 DOIs per request
PAPERS_PER_DAY = 500  # Process this many papers per date range
REQUEST_DELAY = 0.15  # Be polite (6-7 req/sec)

# Connection management
RECONNECT_AFTER_BATCHES = 100  # Refresh Neo4j connection every N batches
MAX_RETRIES = 3  # Retry failed operations
RETRY_DELAY = 2  # Seconds to wait between retries

# Checkpoint configuration
CHECKPOINT_DIR = Path(__file__).parent / '.openalex_enrichment_checkpoints'
CHECKPOINT_SAVE_INTERVAL = 100  # Save checkpoint every N batches

# Statistics
stats = {
    'papers_processed': 0,
    'papers_found_in_openalex': 0,
    'authors_total': 0,
    'authors_matched': 0,
    'authors_enriched': 0,
    'high_confidence_matches': 0,
    'medium_confidence_matches': 0,
    'low_confidence_matches': 0,
    'batches_processed': 0,
}


def retry_on_connection_error(func):
    """Decorator to retry Neo4j operations on connection errors."""
    def wrapper(*args, **kwargs):
        for attempt in range(MAX_RETRIES):
            try:
                return func(*args, **kwargs)
            except (SessionExpired, ServiceUnavailable) as e:
                if attempt < MAX_RETRIES - 1:
                    print(f"⚠️  Connection error (attempt {attempt + 1}/{MAX_RETRIES}): {e}")
                    print(f"   Retrying in {RETRY_DELAY} seconds...")
                    time.sleep(RETRY_DELAY)
                else:
                    print(f"❌ Connection failed after {MAX_RETRIES} attempts")
                    raise
    return wrapper


def save_checkpoint(checkpoint_id: str, current_date: date, stats_snapshot: Dict):
    """Save processing checkpoint to disk."""
    CHECKPOINT_DIR.mkdir(exist_ok=True)
    checkpoint_file = CHECKPOINT_DIR / f"{checkpoint_id}.json"

    checkpoint_data = {
        'checkpoint_id': checkpoint_id,
        'current_date': current_date.isoformat(),
        'stats': stats_snapshot.copy(),
        'timestamp': datetime.now().isoformat()
    }

    with open(checkpoint_file, 'w') as f:
        json.dump(checkpoint_data, f, indent=2)

    print(f"💾 Checkpoint saved: {checkpoint_file.name}")


def load_checkpoint(checkpoint_id: str) -> Optional[Dict]:
    """Load processing checkpoint from disk."""
    checkpoint_file = CHECKPOINT_DIR / f"{checkpoint_id}.json"

    if not checkpoint_file.exists():
        return None

    with open(checkpoint_file, 'r') as f:
        data = json.load(f)

    print(f"📂 Loaded checkpoint from {data['timestamp']}")
    print(f"   Last processed date: {data['current_date']}")
    print(f"   Papers processed: {data['stats']['papers_processed']}")
    print(f"   Authors enriched: {data['stats']['authors_enriched']}")

    return data


def name_similarity(name1: str, name2: str) -> float:
    """Calculate similarity between two author names.

    Handles different formats:
    - "John Smith" vs "Smith, John"
    - "J. Smith" vs "John Smith"
    """
    # Normalize: lowercase, remove extra whitespace
    n1 = ' '.join(name1.lower().split())
    n2 = ' '.join(name2.lower().split())

    # Direct comparison
    direct_sim = SequenceMatcher(None, n1, n2).ratio()

    # Try reversing second name (handle "Last, First" format)
    if ',' in n2:
        parts = n2.split(',')
        reversed_n2 = f"{parts[1].strip()} {parts[0].strip()}"
        reversed_sim = SequenceMatcher(None, n1, reversed_n2).ratio()
        return max(direct_sim, reversed_sim)

    return direct_sim


def fetch_openalex_papers_batch(arxiv_ids: List[str]) -> List[Dict]:
    """Fetch papers from OpenAlex by arXiv DOI."""
    if not arxiv_ids:
        return []

    # Remove version suffixes (v1, v2, etc)
    clean_ids = [re.sub(r'v\d+$', '', aid) for aid in arxiv_ids]

    # Format as DOIs
    doi_list = [f"10.48550/arxiv.{aid}" for aid in clean_ids]
    filter_str = "|".join(doi_list)

    url = f"{OPENALEX_API_BASE}/works"
    params = {
        "filter": f"doi:{filter_str}",
        "per-page": 200,
        "select": "id,doi,title,authorships",
        "mailto": OPENALEX_EMAIL,
    }

    try:
        response = requests.get(url, params=params, timeout=30)

        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])
        else:
            print(f"⚠️  OpenAlex API error {response.status_code}")
            return []

    except Exception as e:
        print(f"⚠️  Error fetching from OpenAlex: {e}")
        return []


def fetch_author_profiles_batch(author_ids: List[str]) -> List[Dict]:
    """Fetch author profiles from OpenAlex."""
    if not author_ids:
        return []

    # Remove the https://openalex.org/ prefix
    clean_ids = [aid.replace("https://openalex.org/", "") for aid in author_ids]
    filter_str = "|".join(clean_ids)

    url = f"{OPENALEX_API_BASE}/authors"
    params = {
        "filter": f"openalex:{filter_str}",
        "per-page": 200,
        "select": "id,display_name,summary_stats,cited_by_count,works_count,last_known_institutions",
        "mailto": OPENALEX_EMAIL,
    }

    try:
        response = requests.get(url, params=params, timeout=30)

        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])
        else:
            print(f"⚠️  OpenAlex API error {response.status_code}")
            return []

    except Exception as e:
        print(f"⚠️  Error fetching author profiles: {e}")
        return []


def extract_arxiv_id_from_doi(doi: str) -> str:
    """Extract arXiv ID from DOI string."""
    # DOI format: https://doi.org/10.48550/arxiv.2506.01234
    match = re.search(r'arxiv\.(\d+\.\d+)', doi, re.IGNORECASE)
    if match:
        return match.group(1)
    return ""


@retry_on_connection_error
def get_neo4j_papers_by_date(driver, start_date: str, end_date: str, limit: int, force: bool = False) -> List[Dict]:
    """Fetch papers from Neo4j with their canonical authors."""
    with driver.session(database=NEO4J_DATABASE) as session:
        # Build WHERE clause for author filtering
        if force:
            author_filter = "a.canonical_kid IS NOT NULL"
        else:
            author_filter = "a.canonical_kid IS NOT NULL AND a.openalex_id IS NULL"

        query = f"""
        MATCH (p:Paper)
        WHERE p.published_date >= date($start_date)
          AND p.published_date <= date($end_date)
        WITH p
        ORDER BY p.published_date DESC
        LIMIT $limit

        MATCH (a:Author)-[r:AUTHORED]->(p)
        WHERE {author_filter}

        RETURN p.arxiv_id as arxiv_id,
               p.title as title,
               collect({{
                 kid: a.kochi_author_id,
                 name: a.name,
                 canonical_kid: a.canonical_kid,
                 position: r.position,
                 has_enrichment: (a.openalex_id IS NOT NULL)
               }}) as authors
        """

        result = session.run(
            query,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        papers = []
        for record in result:
            # Sort authors by position
            authors = sorted(record["authors"], key=lambda x: x.get("position", 999))
            papers.append({
                "arxiv_id": record["arxiv_id"],
                "title": record["title"],
                "authors": authors
            })

        return papers


def match_authors(neo4j_authors: List[Dict], openalex_authorships: List[Dict]) -> List[Tuple[Dict, Dict, float]]:
    """Match Neo4j authors to OpenAlex authors.

    Returns: List of (neo4j_author, openalex_author, confidence_score)
    """
    matches = []

    # Both lists should be in position order
    for i, neo4j_auth in enumerate(neo4j_authors):
        if i >= len(openalex_authorships):
            # More Neo4j authors than OpenAlex (shouldn't happen, but handle it)
            break

        oa_auth = openalex_authorships[i]

        # Calculate name similarity
        neo4j_name = neo4j_auth['name']
        oa_raw_name = oa_auth.get('raw_author_name', '')
        oa_display_name = oa_auth.get('author', {}).get('display_name', '')

        # Try matching against both raw name and display name
        sim_raw = name_similarity(neo4j_name, oa_raw_name)
        sim_display = name_similarity(neo4j_name, oa_display_name)
        similarity = max(sim_raw, sim_display)

        if similarity >= NAME_SIMILARITY_THRESHOLD:
            matches.append((neo4j_auth, oa_auth, similarity))

    return matches


@retry_on_connection_error
def update_neo4j_author(driver, kid: str, openalex_data: Dict, confidence: float, dry_run: bool):
    """Update author in Neo4j with OpenAlex data."""

    openalex_id = openalex_data['id']
    h_index = openalex_data.get('summary_stats', {}).get('h_index')
    citation_count = openalex_data.get('cited_by_count')
    works_count = openalex_data.get('works_count')

    # Get institution
    institutions = openalex_data.get('last_known_institutions', [])
    institution = None
    institution_country = None
    if institutions:
        institution = institutions[0].get('display_name')
        institution_country = institutions[0].get('country_code')

    if dry_run:
        print(f"    [DRY RUN] Would update {kid}:")
        print(f"      openalex_id: {openalex_id}")
        if h_index:
            print(f"      h_index: {h_index}")
        if citation_count:
            print(f"      citations: {citation_count:,}")
        if institution:
            print(f"      institution: {institution}")
        return

    with driver.session(database=NEO4J_DATABASE) as session:
        query = """
        MATCH (a:Author {kochi_author_id: $kid})
        SET a.openalex_id = $openalex_id,
            a.openalex_match_confidence = $confidence,
            a.openalex_match_type = 'paper_position',
            a.openalex_enrichment_version = $enrichment_version,
            a.h_index = $h_index,
            a.citation_count = $citation_count,
            a.works_count = $works_count,
            a.affiliation = CASE WHEN $institution IS NOT NULL THEN $institution ELSE a.affiliation END,
            a.institution_country = $institution_country,
            a.last_updated = datetime()
        RETURN a.kochi_author_id as kid
        """

        result = session.run(
            query,
            kid=kid,
            openalex_id=openalex_id,
            confidence=confidence,
            enrichment_version=ENRICHMENT_VERSION,
            h_index=h_index,
            citation_count=citation_count,
            works_count=works_count,
            institution=institution,
            institution_country=institution_country
        )

        if result.single():
            stats['authors_enriched'] += 1


def process_papers_batch(driver, papers: List[Dict], dry_run: bool):
    """Process a batch of papers."""
    if not papers:
        return

    # Extract arXiv IDs
    arxiv_ids = [p['arxiv_id'] for p in papers]

    # Fetch from OpenAlex
    openalex_papers = fetch_openalex_papers_batch(arxiv_ids)

    if not openalex_papers:
        return

    stats['papers_found_in_openalex'] += len(openalex_papers)

    # Create lookup by arXiv ID
    openalex_by_arxiv = {}
    for oa_paper in openalex_papers:
        arxiv_id = extract_arxiv_id_from_doi(oa_paper.get('doi', ''))
        if arxiv_id:
            openalex_by_arxiv[arxiv_id] = oa_paper

    # Match authors for each paper
    all_matches = []

    for paper in papers:
        stats['papers_processed'] += 1
        arxiv_id_clean = re.sub(r'v\d+$', '', paper['arxiv_id'])

        if arxiv_id_clean not in openalex_by_arxiv:
            continue

        oa_paper = openalex_by_arxiv[arxiv_id_clean]
        oa_authorships = oa_paper.get('authorships', [])

        stats['authors_total'] += len(paper['authors'])

        # Match authors
        matches = match_authors(paper['authors'], oa_authorships)

        for neo4j_auth, oa_auth, confidence in matches:
            stats['authors_matched'] += 1

            # Track confidence distribution
            if confidence >= 0.95:
                stats['high_confidence_matches'] += 1
            elif confidence >= 0.85:
                stats['medium_confidence_matches'] += 1
            else:
                stats['low_confidence_matches'] += 1

            # Only enrich if they don't already have enrichment
            if not neo4j_auth.get('has_enrichment'):
                all_matches.append({
                    'kid': neo4j_auth['kid'],
                    'name': neo4j_auth['name'],
                    'openalex_author_id': oa_auth['author']['id'],
                    'confidence': confidence,
                    'raw_name': oa_auth.get('raw_author_name', '')
                })

    if not all_matches:
        return

    # Fetch author profiles in batch
    author_ids = [m['openalex_author_id'] for m in all_matches]
    author_profiles = fetch_author_profiles_batch(author_ids)

    # Create lookup
    profiles_by_id = {p['id']: p for p in author_profiles}

    # Update Neo4j
    for match in all_matches:
        profile = profiles_by_id.get(match['openalex_author_id'])
        if profile:
            update_neo4j_author(
                driver,
                match['kid'],
                profile,
                match['confidence'],
                dry_run
            )


def date_range(start_date: date, end_date: date):
    """Generate date ranges for processing."""
    current = start_date
    while current <= end_date:
        yield current
        current += timedelta(days=1)


def main():
    parser = argparse.ArgumentParser(description="OpenAlex Enrichment Backfill")
    parser.add_argument(
        "--start-date",
        type=str,
        help="Start date (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--end-date",
        type=str,
        help="End date (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--resume",
        type=str,
        help="Resume from checkpoint ID"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-enrich already enriched authors"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Test without writing to Neo4j"
    )

    args = parser.parse_args()

    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j credentials")
        print("   Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
        sys.exit(1)

    # Determine date range
    if args.resume:
        checkpoint = load_checkpoint(args.resume)
        if not checkpoint:
            print(f"❌ Checkpoint not found: {args.resume}")
            sys.exit(1)

        # Parse dates from checkpoint
        checkpoint_id = args.resume
        start_date = date.fromisoformat(checkpoint['current_date'])
        # Extract end date from checkpoint_id (format: backfill-YYYY-MM-DD)
        end_date_str = checkpoint_id.split('-', 1)[1] if '-' in checkpoint_id else None
        if not end_date_str:
            print("❌ Cannot determine end date from checkpoint")
            sys.exit(1)
        end_date = date.fromisoformat(end_date_str)

        # Restore stats
        stats.update(checkpoint['stats'])
    else:
        if not args.start_date or not args.end_date:
            print("❌ --start-date and --end-date required (or use --resume)")
            sys.exit(1)

        start_date = date.fromisoformat(args.start_date)
        end_date = date.fromisoformat(args.end_date)
        checkpoint_id = f"backfill-{end_date.isoformat()}"

    print("=" * 70)
    print("OpenAlex Enrichment Backfill - Production Run")
    print("=" * 70)
    print()
    print(f"Mode: {'DRY RUN (no database changes)' if args.dry_run else 'LIVE (will update database)'}")
    print(f"Date range: {start_date} to {end_date}")
    print(f"Force re-enrichment: {args.force}")
    print(f"Checkpoint ID: {checkpoint_id}")
    print()

    # Connect to Neo4j
    driver = GraphDatabase.driver(
        NEO4J_URI,
        auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
    )

    try:
        # Process papers by date
        for current_date in date_range(start_date, end_date):
            print(f"\n📅 Processing {current_date.isoformat()}...")

            # Get papers for this date
            papers = get_neo4j_papers_by_date(
                driver,
                start_date=current_date.isoformat(),
                end_date=current_date.isoformat(),
                limit=PAPERS_PER_DAY,
                force=args.force
            )

            if not papers:
                print(f"   No papers to process")
                continue

            print(f"   Found {len(papers)} papers with canonical authors")

            # Process in batches
            for i in range(0, len(papers), BATCH_SIZE):
                batch = papers[i:i + BATCH_SIZE]
                process_papers_batch(driver, batch, args.dry_run)

                stats['batches_processed'] += 1

                # Rate limiting
                if i + BATCH_SIZE < len(papers):
                    time.sleep(REQUEST_DELAY)

                # Save checkpoint periodically
                if stats['batches_processed'] % CHECKPOINT_SAVE_INTERVAL == 0:
                    save_checkpoint(checkpoint_id, current_date, stats)

                # Reconnect periodically to avoid timeouts
                if stats['batches_processed'] % RECONNECT_AFTER_BATCHES == 0:
                    print(f"🔄 Refreshing Neo4j connection...")
                    driver.close()
                    driver = GraphDatabase.driver(
                        NEO4J_URI,
                        auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
                    )

        # Save final checkpoint
        save_checkpoint(checkpoint_id, end_date, stats)

        # Print summary
        print()
        print("=" * 70)
        print("RESULTS")
        print("=" * 70)
        print()
        print(f"📄 Papers processed:           {stats['papers_processed']}")
        print(f"✅ Papers found in OpenAlex:   {stats['papers_found_in_openalex']}")
        if stats['papers_processed'] > 0:
            print(f"   Coverage: {stats['papers_found_in_openalex']/stats['papers_processed']*100:.1f}%")
        print()
        print(f"👥 Authors total:              {stats['authors_total']}")
        print(f"✅ Authors matched:            {stats['authors_matched']}")
        if stats['authors_total'] > 0:
            print(f"   Match rate: {stats['authors_matched']/stats['authors_total']*100:.1f}%")
        print()
        print(f"📊 Match confidence:")
        print(f"   High (>95%):     {stats['high_confidence_matches']}")
        print(f"   Medium (85-95%): {stats['medium_confidence_matches']}")
        print(f"   Low (75-85%):    {stats['low_confidence_matches']}")
        print()
        print(f"🎯 Authors enriched:           {stats['authors_enriched']}")
        if stats['authors_matched'] > 0:
            print(f"   Enrichment rate: {stats['authors_enriched']/stats['authors_matched']*100:.1f}%")
        print()
        print(f"📦 Batches processed:          {stats['batches_processed']}")
        print()

        if args.dry_run:
            print("💡 This was a DRY RUN. Run without --dry-run to actually update the database.")
        else:
            print("✅ Database updated successfully!")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
