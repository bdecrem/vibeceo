#!/usr/bin/env python3
"""
Semantic Scholar Author ID Backfill Script

Enriches Author nodes with S2 author IDs by querying papers from S2 API.
Uses position-based matching to link our authors to S2 author IDs.

Non-destructive: Only adds s2_author_id field, preserves all existing data.
Resumable: Checkpoint system allows interruption and continuation.

Usage:
    # Test with 100 papers
    python3 s2_enrichment_backfill.py --start-date 2025-02-14 --end-date 2025-02-20 --batch-size 50

    # Full backfill
    python3 s2_enrichment_backfill.py --start-date 2024-02-14 --end-date 2025-10-31 --batch-size 50

    # Resume from checkpoint
    python3 s2_enrichment_backfill.py --resume
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from neo4j import GraphDatabase
import requests

# Try to load .env.local if environment variables not set
if not os.getenv("SEMANTIC_SCHOLAR_API_TOKEN"):
    current_dir = Path(__file__).parent
    for _ in range(3):
        env_file = current_dir / ".env.local"
        if env_file.exists():
            print(f"📋 Loading environment from {env_file}")
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        if key not in os.environ:
                            os.environ[key] = value
            break
        current_dir = current_dir.parent

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

# Semantic Scholar configuration
S2_API_KEY = os.getenv("SEMANTIC_SCHOLAR_API_TOKEN")
S2_API_BASE = "https://api.semanticscholar.org/graph/v1"
S2_BASE_RATE_LIMIT = 2.0  # Base seconds between requests
S2_MIN_RATE_LIMIT = 2.0   # Minimum delay (never go faster)
S2_MAX_RATE_LIMIT = 60.0  # Maximum delay (cap exponential backoff)

# Checkpoint configuration
CHECKPOINT_DIR = Path(__file__).parent / ".s2_enrichment_checkpoints"
CHECKPOINT_FILE = CHECKPOINT_DIR / "backfill_checkpoint.json"


class SemanticScholarClient:
    """Client for Semantic Scholar API with adaptive rate limiting."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.last_request_time = time.time()
        self.current_delay = S2_BASE_RATE_LIMIT
        self.session = requests.Session()
        self.session.headers.update({'x-api-key': api_key})

    def _rate_limit(self):
        """Enforce adaptive rate limit with exponential backoff/decay."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        wait_time = max(0, self.current_delay - time_since_last)
        if wait_time > 0:
            time.sleep(wait_time)
        self.last_request_time = time.time()

    def _backoff(self):
        """Exponential backoff - double delay on rate limit."""
        old_delay = self.current_delay
        self.current_delay = min(self.current_delay * 2, S2_MAX_RATE_LIMIT)
        print(f"⚠️  Rate limit hit, backing off: {old_delay:.1f}s → {self.current_delay:.1f}s")

    def _decay(self):
        """Exponential decay - gradually restore normal rate on success."""
        old_delay = self.current_delay
        self.current_delay = max(self.current_delay * 0.9, S2_MIN_RATE_LIMIT)
        if old_delay != self.current_delay and old_delay > S2_BASE_RATE_LIMIT:
            print(f"✓ Rate limit recovering: {old_delay:.1f}s → {self.current_delay:.1f}s")

    def get_paper_by_arxiv_id(self, arxiv_id: str) -> Optional[Dict]:
        """
        Fetch paper and author data from S2.

        Returns paper data with S2 author IDs.
        """
        self._rate_limit()

        # Clean arXiv ID (remove version if present)
        clean_id = arxiv_id.split('v')[0]

        url = f"{S2_API_BASE}/paper/arXiv:{clean_id}"
        params = {
            'fields': 'title,authors'
        }

        try:
            response = self.session.get(url, params=params, timeout=30)

            if response.status_code == 200:
                # Success - apply exponential decay to recover rate
                self._decay()
                return response.json()
            elif response.status_code == 404:
                return None
            elif response.status_code == 429:
                # Rate limited - apply exponential backoff
                self._backoff()
                time.sleep(5)
                self.last_request_time = time.time()
                return None
            else:
                print(f"⚠️  S2 API error {response.status_code} for {arxiv_id}")
                return None

        except requests.exceptions.RequestException as e:
            print(f"❌ Network error for {arxiv_id}: {e}")
            return None


def get_papers_in_date_range(driver, start_date: str, end_date: str,
                             offset: int = 0, limit: int = 50) -> List[Dict]:
    """Get papers from Neo4j within date range."""
    with driver.session(database=NEO4J_DATABASE) as session:
        query = """
        MATCH (p:Paper)
        WHERE p.published_date >= date($start_date)
          AND p.published_date <= date($end_date)
        RETURN p.arxiv_id as arxiv_id,
               p.title as title,
               p.published_date as published_date
        ORDER BY p.published_date ASC
        SKIP $offset
        LIMIT $limit
        """
        result = session.run(query, start_date=start_date, end_date=end_date,
                           offset=offset, limit=limit)
        return [dict(record) for record in result]


def get_paper_authors(driver, arxiv_id: str) -> List[Dict]:
    """Get authors for a paper (ordered by position)."""
    with driver.session(database=NEO4J_DATABASE) as session:
        query = """
        MATCH (a:Author)-[r:AUTHORED]->(p:Paper {arxiv_id: $arxiv_id})
        RETURN a.kochi_author_id as kid,
               a.name as name,
               r.position as position,
               a.s2_author_id as s2_author_id
        ORDER BY r.position
        """
        result = session.run(query, arxiv_id=arxiv_id)
        return [dict(record) for record in result]


def enrich_authors_with_s2(driver, arxiv_id: str, s2_authors: List[Dict],
                           our_authors: List[Dict]) -> Dict:
    """
    Match authors by position and store S2 author IDs.

    Returns stats about enrichment.
    """
    stats = {
        'authors_matched': 0,
        'authors_enriched': 0,
        'authors_already_had_s2': 0,
        'position_mismatches': 0
    }

    # Create position-indexed map of S2 authors (1-indexed to match our DB)
    s2_by_position = {}
    for idx, s2_author in enumerate(s2_authors, start=1):
        s2_by_position[idx] = s2_author

    with driver.session(database=NEO4J_DATABASE) as session:
        for our_author in our_authors:
            position = our_author['position']

            if position not in s2_by_position:
                stats['position_mismatches'] += 1
                continue

            s2_author = s2_by_position[position]
            s2_author_id = s2_author.get('authorId')

            if not s2_author_id:
                continue

            stats['authors_matched'] += 1

            # Skip if already has S2 ID
            if our_author.get('s2_author_id'):
                stats['authors_already_had_s2'] += 1
                continue

            # Store S2 author ID
            session.run("""
                MATCH (a:Author {kochi_author_id: $kid})
                SET a.s2_author_id = $s2_author_id,
                    a.s2_enriched_at = datetime()
            """, kid=our_author['kid'], s2_author_id=s2_author_id)

            stats['authors_enriched'] += 1

    return stats


def save_checkpoint(checkpoint_data: Dict):
    """Save checkpoint data to file."""
    CHECKPOINT_DIR.mkdir(exist_ok=True)
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(checkpoint_data, f, indent=2)


def load_checkpoint() -> Optional[Dict]:
    """Load checkpoint data from file."""
    if CHECKPOINT_FILE.exists():
        with open(CHECKPOINT_FILE) as f:
            return json.load(f)
    return None


def main():
    parser = argparse.ArgumentParser(
        description="Backfill S2 author IDs for papers in date range"
    )
    parser.add_argument("--start-date", help="Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", help="End date (YYYY-MM-DD)")
    parser.add_argument("--batch-size", type=int, default=50,
                       help="Papers per batch (default: 50)")
    parser.add_argument("--resume", action="store_true",
                       help="Resume from last checkpoint")
    parser.add_argument("--dry-run", action="store_true",
                       help="Preview without making changes")

    args = parser.parse_args()

    # Validate environment
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j environment variables")
        sys.exit(1)

    if not args.dry_run and not S2_API_KEY:
        print("❌ Missing SEMANTIC_SCHOLAR_API_TOKEN environment variable")
        sys.exit(1)

    # Handle resume
    checkpoint = None
    if args.resume:
        checkpoint = load_checkpoint()
        if not checkpoint:
            print("❌ No checkpoint found to resume from")
            sys.exit(1)
        print(f"📍 Resuming from checkpoint: {checkpoint['last_processed_date']}")
        start_date = checkpoint['start_date']
        end_date = checkpoint['end_date']
        offset = checkpoint['offset']
    else:
        if not args.start_date or not args.end_date:
            print("❌ --start-date and --end-date required (or use --resume)")
            sys.exit(1)
        start_date = args.start_date
        end_date = args.end_date
        offset = 0

    print("=" * 60)
    print("SEMANTIC SCHOLAR ENRICHMENT BACKFILL")
    print("=" * 60)
    print(f"Date range: {start_date} to {end_date}")
    print(f"Batch size: {args.batch_size}")
    if args.dry_run:
        print("⚠️  DRY RUN MODE - No changes will be made")
    print()

    # Connect to Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    # Initialize S2 client
    s2_client = SemanticScholarClient(S2_API_KEY) if not args.dry_run else None

    # Overall stats
    total_stats = {
        'papers_processed': checkpoint['papers_processed'] if checkpoint else 0,
        'papers_in_s2': checkpoint['papers_in_s2'] if checkpoint else 0,
        'papers_not_in_s2': checkpoint['papers_not_in_s2'] if checkpoint else 0,
        'authors_enriched': checkpoint['authors_enriched'] if checkpoint else 0,
        'authors_already_had_s2': checkpoint['authors_already_had_s2'] if checkpoint else 0,
        'start_time': time.time()
    }

    try:
        batch_num = 0
        current_offset = offset

        while True:
            batch_num += 1

            # Get batch of papers
            papers = get_papers_in_date_range(driver, start_date, end_date,
                                             current_offset, args.batch_size)

            if not papers:
                print("\n✅ All papers processed!")
                break

            print(f"\n📦 Batch {batch_num} ({len(papers)} papers, offset={current_offset})")
            print(f"   Date range: {papers[0]['published_date']} to {papers[-1]['published_date']}")

            # Process each paper in batch
            for paper in papers:
                arxiv_id = paper['arxiv_id']
                total_stats['papers_processed'] += 1

                # Get our authors
                our_authors = get_paper_authors(driver, arxiv_id)

                if args.dry_run:
                    print(f"   [DRY RUN] Would enrich {arxiv_id} ({len(our_authors)} authors)")
                    continue

                # Query S2
                s2_paper = s2_client.get_paper_by_arxiv_id(arxiv_id)

                if s2_paper:
                    total_stats['papers_in_s2'] += 1

                    # Enrich authors
                    s2_authors = s2_paper.get('authors', [])
                    enrich_stats = enrich_authors_with_s2(driver, arxiv_id,
                                                         s2_authors, our_authors)

                    total_stats['authors_enriched'] += enrich_stats['authors_enriched']
                    total_stats['authors_already_had_s2'] += enrich_stats['authors_already_had_s2']
                else:
                    total_stats['papers_not_in_s2'] += 1

            # Update offset for next batch
            current_offset += len(papers)

            # Save checkpoint every batch
            if not args.dry_run:
                checkpoint_data = {
                    'start_date': start_date,
                    'end_date': end_date,
                    'offset': current_offset,
                    'last_processed_date': str(papers[-1]['published_date']),
                    'papers_processed': total_stats['papers_processed'],
                    'papers_in_s2': total_stats['papers_in_s2'],
                    'papers_not_in_s2': total_stats['papers_not_in_s2'],
                    'authors_enriched': total_stats['authors_enriched'],
                    'authors_already_had_s2': total_stats['authors_already_had_s2'],
                    'timestamp': datetime.now().isoformat()
                }
                save_checkpoint(checkpoint_data)

            # Progress update
            elapsed = time.time() - total_stats['start_time']
            rate = total_stats['papers_processed'] / elapsed if elapsed > 0 else 0
            print(f"\n   Progress: {total_stats['papers_processed']} papers ({rate:.1f} papers/sec)")
            print(f"   S2 coverage: {total_stats['papers_in_s2']}/{total_stats['papers_processed']} " +
                  f"({100*total_stats['papers_in_s2']/max(1,total_stats['papers_processed']):.1f}%)")
            print(f"   Authors enriched: {total_stats['authors_enriched']}")

        # Final summary
        elapsed = time.time() - total_stats['start_time']
        print("\n" + "=" * 60)
        print("📊 FINAL SUMMARY")
        print("=" * 60)
        print(f"Total time: {int(elapsed/60)} minutes")
        print(f"Papers processed: {total_stats['papers_processed']}")
        print(f"Papers in S2: {total_stats['papers_in_s2']} " +
              f"({100*total_stats['papers_in_s2']/max(1,total_stats['papers_processed']):.1f}%)")
        print(f"Papers not in S2: {total_stats['papers_not_in_s2']}")
        print(f"Authors enriched: {total_stats['authors_enriched']}")
        print(f"Authors already had S2 ID: {total_stats['authors_already_had_s2']}")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
