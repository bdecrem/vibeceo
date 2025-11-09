#!/usr/bin/env python3
"""
Semantic Scholar Author ID Backfill Script (Continuous Mode)

Enriches Author nodes with S2 author IDs by querying papers from S2 API.
Uses position-based matching to link our authors to S2 author IDs.

Features:
- Automatic: Finds all unenriched papers and processes them
- Continuous: Processes in chunks, moves to next chunk automatically
- Resumable: Checkpoint system - Ctrl+C anytime, resume later
- Non-destructive: Only adds s2_author_id field
- Direction: Always newest to oldest (strictly backwards)

Usage:
    # Continuous mode (always backwards: newest → oldest)
    python3 s2_enrichment_backfill.py

    # With custom chunk size (default: 2 months at a time)
    python3 s2_enrichment_backfill.py --month-chunk 3

    # Manual date range override
    python3 s2_enrichment_backfill.py --start-date 2024-02-14 --end-date 2025-10-15

    # Dry run
    python3 s2_enrichment_backfill.py --dry-run

Resume:
    If interrupted (Ctrl+C or error), just run the same command again.
    It will automatically resume from the last checkpoint with the same direction.
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
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
# Note: New API keys (as of May 2024) have 1 RPS limit on ALL endpoints
# We use 3 seconds (0.33 RPS) to handle sliding window/burst restrictions
S2_BASE_RATE_LIMIT = 3.0  # Base seconds between requests
S2_MIN_RATE_LIMIT = 3.0   # Minimum delay (never go faster)
S2_MAX_RATE_LIMIT = 60.0  # Maximum delay (cap exponential backoff)

# Hard ceiling for newest papers to process
MAX_ALLOWED_DATE_STR = "2025-10-15"
MAX_ALLOWED_DATE = datetime.strptime(MAX_ALLOWED_DATE_STR, "%Y-%m-%d").date()

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
        self.last_rate_limit_info = None  # Track rate limit headers

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

    def get_paper_by_arxiv_id(self, arxiv_id: str) -> Tuple[Optional[Dict], str]:
        """
        Fetch paper and author data from S2.

        Returns tuple of (paper data, status code string).
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

            # Capture rate limit headers for debugging
            rate_limit_headers = {
                'limit': response.headers.get('x-ratelimit-limit'),
                'remaining': response.headers.get('x-ratelimit-remaining'),
                'reset': response.headers.get('x-ratelimit-reset')
            }

            # Log rate limit info on first request or when rate limited
            if self.last_rate_limit_info is None or response.status_code == 429:
                if any(rate_limit_headers.values()):
                    self.last_rate_limit_info = rate_limit_headers
                    print(f"📊 Rate limit info - Limit: {rate_limit_headers['limit']}, "
                          f"Remaining: {rate_limit_headers['remaining']}, "
                          f"Reset: {rate_limit_headers['reset']}")

            if response.status_code == 200:
                # Success - apply exponential decay to recover rate
                self._decay()
                return response.json(), 'ok'
            elif response.status_code == 404:
                return None, 'not_found'
            elif response.status_code == 429:
                # Rate limited - apply exponential backoff
                self._backoff()
                time.sleep(5)
                self.last_request_time = time.time()
                return None, 'rate_limited'
            else:
                print(f"⚠️  S2 API error {response.status_code} for {arxiv_id}")
                return None, 'error'

        except requests.exceptions.RequestException as e:
            print(f"❌ Network error for {arxiv_id}: {e}")
            return None, 'network_error'


def get_papers_in_date_range(driver, start_date: str, end_date: str,
                             limit: int = 50,
                             cursor_date: Optional[str] = None,
                             cursor_arxiv_id: Optional[str] = None) -> List[Dict]:
    """Get newest-first batch within range that still needs enrichment."""
    if start_date > end_date:
        return []

    extra_filter = ""
    params = {
        'start_date': start_date,
        'end_date': end_date,
        'limit': limit
    }

    if cursor_date and cursor_arxiv_id:
        extra_filter = """
          AND (
                p.published_date < date($cursor_date)
                OR (p.published_date = date($cursor_date) AND p.arxiv_id < $cursor_arxiv_id)
              )
        """
        params.update({'cursor_date': cursor_date, 'cursor_arxiv_id': cursor_arxiv_id})

    with driver.session(database=NEO4J_DATABASE) as session:
        query = f"""
        MATCH (a:Author)-[:AUTHORED]->(p:Paper)
        WHERE a.s2_author_id IS NULL
          AND p.s2_enrichment_attempted_at IS NULL
          AND p.published_date >= date($start_date)
          AND p.published_date <= date($end_date)
          {extra_filter}
        WITH DISTINCT p
        RETURN p.arxiv_id as arxiv_id,
               p.title as title,
               p.published_date as published_date
        ORDER BY p.published_date DESC, p.arxiv_id DESC
        LIMIT $limit
        """
        result = session.run(query, **params)
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


def mark_paper_enrichment_attempted(driver, arxiv_id: str, status: str):
    """Mark a paper as processed so we never revisit it."""
    with driver.session(database=NEO4J_DATABASE) as session:
        session.run(
            """
            MATCH (p:Paper {arxiv_id: $arxiv_id})
            SET p.s2_enrichment_attempted_at = datetime(),
                p.s2_enrichment_status = $status
            """,
            arxiv_id=arxiv_id,
            status=status
        )


def clamp_to_max_date(date_str: str) -> str:
    """Drop any end date newer than the allowed ceiling."""
    return min(date_str, MAX_ALLOWED_DATE_STR)


def get_date_range_needing_enrichment(driver, max_date: Optional[str] = None):
    """Find the date range of papers that need S2 enrichment.

    Args:
        max_date: Optional max date (YYYY-MM-DD) to cap the newest date
    """
    with driver.session(database=NEO4J_DATABASE) as session:
        if max_date:
            query = """
            MATCH (a:Author)-[:AUTHORED]->(p:Paper)
            WHERE a.s2_author_id IS NULL
              AND p.s2_enrichment_attempted_at IS NULL
              AND p.published_date <= date($max_date)
            WITH p.published_date as pub_date
            RETURN min(pub_date) as oldest, max(pub_date) as newest
            """
            result = session.run(query, max_date=max_date)
        else:
            query = """
            MATCH (a:Author)-[:AUTHORED]->(p:Paper)
            WHERE a.s2_author_id IS NULL
              AND p.s2_enrichment_attempted_at IS NULL
            WITH p.published_date as pub_date
            RETURN min(pub_date) as oldest, max(pub_date) as newest
            """
            result = session.run(query)
        record = result.single()
        if record and record['oldest'] and record['newest']:
            return str(record['oldest']), str(record['newest'])
        return None, None


def main():
    parser = argparse.ArgumentParser(
        description="Backfill S2 author IDs - runs continuously until all papers enriched"
    )
    parser.add_argument("--start-date", help="Override: Start date (YYYY-MM-DD)")
    parser.add_argument("--end-date", help="Override: End date (YYYY-MM-DD)")
    parser.add_argument("--batch-size", type=int, default=50,
                       help="Papers per batch (default: 50)")
    parser.add_argument("--dry-run", action="store_true",
                       help="Preview without making changes")
    parser.add_argument("--month-chunk", type=int, default=2,
                       help="Process N months at a time (default: 2)")

    args = parser.parse_args()

    # Validate environment
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j environment variables")
        sys.exit(1)

    if not args.dry_run and not S2_API_KEY:
        print("❌ Missing SEMANTIC_SCHOLAR_API_TOKEN environment variable")
        sys.exit(1)

    # Connect to Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    # Handle resume or auto-detect date range
    checkpoint = load_checkpoint()
    cursor_date = None
    cursor_arxiv_id = None

    if checkpoint:
        last_processed = checkpoint.get('last_processed_date', 'unknown')
        print(f"📍 Resuming from checkpoint: {last_processed}")
        start_date = checkpoint['start_date']
        end_date = clamp_to_max_date(checkpoint['end_date'])
        cursor_date = checkpoint.get('cursor_date')
        cursor_arxiv_id = checkpoint.get('cursor_arxiv_id')
        print("   Direction: ⏪ Backwards (newest to oldest)")
    elif args.start_date and args.end_date:
        # Manual override (still clamps to newest allowed date)
        end_date = clamp_to_max_date(args.end_date)
        start_date = args.start_date
        if start_date > end_date:
            start_date = end_date
        cursor_date = None
        print("📅 Manual date range selected")
        print("   Direction: ⏪ Backwards (newest to oldest)")
    else:
        # Auto-detect: find unenriched papers
        print("🔍 Auto-detecting date range...")
        oldest, newest = get_date_range_needing_enrichment(driver, max_date=MAX_ALLOWED_DATE_STR)
        if not oldest:
            print("✅ All papers already enriched!")
            driver.close()
            sys.exit(0)

        newest = clamp_to_max_date(newest)
        print(f"📅 Found papers needing enrichment: {oldest} to {newest}")
        print("   Direction: ⏪ Backwards (newest to oldest)")

        # Start from newest chunk, work backwards by configured month window
        end_dt = datetime.strptime(newest, '%Y-%m-%d')
        start_dt = end_dt - timedelta(days=args.month_chunk * 30)
        start_date = max(start_dt.strftime('%Y-%m-%d'), oldest)
        end_date = newest
        cursor_date = None

    # Initialize S2 client
    s2_client = SemanticScholarClient(S2_API_KEY) if not args.dry_run else None

    # Main continuous loop
    while True:
        print("=" * 60)
        print("SEMANTIC SCHOLAR ENRICHMENT BACKFILL")
        print("=" * 60)
        print(f"Date range: {start_date} to {end_date}")
        print(f"Batch size: {args.batch_size}")
        if args.dry_run:
            print("⚠️  DRY RUN MODE - No changes will be made")
        print()

        # Overall stats for this chunk
        total_stats = {
            'papers_processed': checkpoint.get('papers_processed', 0) if checkpoint else 0,
            'papers_in_s2': checkpoint.get('papers_in_s2', 0) if checkpoint else 0,
            'papers_not_in_s2': checkpoint.get('papers_not_in_s2', 0) if checkpoint else 0,
            'authors_enriched': checkpoint.get('authors_enriched', 0) if checkpoint else 0,
            'authors_already_had_s2': checkpoint.get('authors_already_had_s2', 0) if checkpoint else 0,
            'start_time': time.time(),
            'papers_in_current_run': 0  # Track papers processed in THIS run for accurate rate
        }

        try:
            batch_num = 0

            # Process all papers in current date range
            while True:
                batch_num += 1

                papers = get_papers_in_date_range(
                    driver,
                    start_date,
                    end_date,
                    limit=args.batch_size,
                    cursor_date=cursor_date,
                    cursor_arxiv_id=cursor_arxiv_id
                )

                if not papers:
                    print(f"\n✅ Completed date range: {start_date} to {end_date}")
                    break

                print(f"\n📦 Batch {batch_num} ({len(papers)} papers)")
                print(f"   Date range: {papers[0]['published_date']} to {papers[-1]['published_date']}")

                # Process each paper in batch (already newest → oldest order)
                for paper in papers:
                    arxiv_id = paper['arxiv_id']
                    paper_cursor_date = str(paper['published_date'])
                    paper_cursor_id = arxiv_id

                    total_stats['papers_processed'] += 1
                    total_stats['papers_in_current_run'] += 1

                    # Get our authors
                    our_authors = get_paper_authors(driver, arxiv_id)

                    if args.dry_run:
                        print(f"   [DRY RUN] Would enrich {arxiv_id} ({len(our_authors)} authors)")
                        cursor_date = paper_cursor_date
                        cursor_arxiv_id = paper_cursor_id
                        continue

                    # Query S2 with automatic retry on rate limiting
                    while True:
                        s2_paper, s2_status = s2_client.get_paper_by_arxiv_id(arxiv_id)
                        if s2_status == 'rate_limited':
                            print(f"   ⏳ Rate limited for {arxiv_id}, retrying...")
                            continue
                        if s2_status in ('error', 'network_error'):
                            raise RuntimeError(f"Semantic Scholar request failed for {arxiv_id} ({s2_status})")
                        break

                    if s2_paper:
                        total_stats['papers_in_s2'] += 1

                        # Enrich authors
                        s2_authors = s2_paper.get('authors', [])
                        enrich_stats = enrich_authors_with_s2(driver, arxiv_id,
                                                             s2_authors, our_authors)

                        total_stats['authors_enriched'] += enrich_stats['authors_enriched']
                        total_stats['authors_already_had_s2'] += enrich_stats['authors_already_had_s2']
                        status = 's2_found'
                    else:
                        total_stats['papers_not_in_s2'] += 1
                        status = 's2_not_found'

                    mark_paper_enrichment_attempted(driver, arxiv_id, status)
                    cursor_date = paper_cursor_date
                    cursor_arxiv_id = paper_cursor_id

                    # Save checkpoint after every paper for precise resume
                    checkpoint_data = {
                        'start_date': start_date,
                        'end_date': end_date,
                        'cursor_date': cursor_date,
                        'cursor_arxiv_id': cursor_arxiv_id,
                        'last_processed_date': cursor_date,
                        'last_processed_arxiv_id': cursor_arxiv_id,
                        'papers_processed': total_stats['papers_processed'],
                        'papers_in_s2': total_stats['papers_in_s2'],
                        'papers_not_in_s2': total_stats['papers_not_in_s2'],
                        'authors_enriched': total_stats['authors_enriched'],
                        'authors_already_had_s2': total_stats['authors_already_had_s2'],
                        'timestamp': datetime.now().isoformat()
                    }
                    save_checkpoint(checkpoint_data)
                    checkpoint = checkpoint_data

                # Progress update
                elapsed = time.time() - total_stats['start_time']
                # Use papers_in_current_run for accurate rate calculation
                current_rate = total_stats['papers_in_current_run'] / elapsed if elapsed > 0 else 0
                print(f"\n   Progress: {total_stats['papers_processed']} papers total "
                      f"({total_stats['papers_in_current_run']} in current run, {current_rate:.2f} papers/sec)")
                print(f"   S2 coverage: {total_stats['papers_in_s2']}/{total_stats['papers_processed']} " +
                      f"({100*total_stats['papers_in_s2']/max(1,total_stats['papers_processed']):.1f}%)")
                print(f"   Authors enriched: {total_stats['authors_enriched']}")

            # Chunk complete - print summary
            elapsed = time.time() - total_stats['start_time']
            print("\n" + "=" * 60)
            print("📊 CHUNK SUMMARY")
            print("=" * 60)
            print(f"Total time: {int(elapsed/60)} minutes")
            print(f"Papers processed: {total_stats['papers_processed']}")
            print(f"Papers in S2: {total_stats['papers_in_s2']} " +
                  f"({100*total_stats['papers_in_s2']/max(1,total_stats['papers_processed']):.1f}%)")
            print(f"Papers not in S2: {total_stats['papers_not_in_s2']}")
            print(f"Authors enriched: {total_stats['authors_enriched']}")
            print(f"Authors already had S2 ID: {total_stats['authors_already_had_s2']}")

        except KeyboardInterrupt:
            print("\n\n⚠️  Interrupted by user. Progress saved in checkpoint.")
            print("   Run script again to resume from where you left off.")
            driver.close()
            sys.exit(0)
        except RuntimeError as err:
            print(f"\n❌ {err}")
            print("   Progress saved in checkpoint. Resolve the issue and rerun.")
            driver.close()
            sys.exit(1)

        # Check if there's more work to do
        print("\n🔍 Checking for more unenriched papers...")
        next_oldest, next_newest = get_date_range_needing_enrichment(driver, max_date=MAX_ALLOWED_DATE_STR)

        if not next_oldest:
            # All done!
            print("\n" + "=" * 60)
            print("🎉 ALL PAPERS ENRICHED!")
            print("=" * 60)
            if not args.dry_run:
                # Delete checkpoint file
                if CHECKPOINT_FILE.exists():
                    CHECKPOINT_FILE.unlink()
                    print("🗑️  Checkpoint deleted")
            break

        # Always move backwards in time for the next chunk
        next_end_dt = datetime.strptime(next_newest, '%Y-%m-%d')
        next_start_dt = next_end_dt - timedelta(days=args.month_chunk * 30)

        start_date = max(next_start_dt.strftime('%Y-%m-%d'), next_oldest)
        end_date = next_newest
        cursor_date = None
        cursor_arxiv_id = None
        checkpoint = None  # Reset checkpoint for new date range
        print(f"\n⏪ Moving to next chunk (backwards): {start_date} to {end_date}\n")

    # Cleanup
    driver.close()


if __name__ == "__main__":
    main()
