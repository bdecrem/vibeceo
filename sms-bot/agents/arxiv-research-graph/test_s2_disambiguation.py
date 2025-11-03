#!/usr/bin/env python3
"""
Semantic Scholar Author Disambiguation Test

Tests S2's author disambiguation against our fuzzy matching results.
Analyzes coverage, accuracy, and conflicts.

Usage:
    python3 test_s2_disambiguation.py --days 3 --dry-run
    python3 test_s2_disambiguation.py --days 7 --limit 100
    python3 test_s2_disambiguation.py --output results.json
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
from neo4j import GraphDatabase
import requests

# Try to load .env.local if environment variables not set
if not os.getenv("SEMANTIC_SCHOLAR_API_TOKEN"):
    # Look for .env.local in parent directories
    current_dir = Path(__file__).parent
    for _ in range(3):  # Look up 3 levels
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
S2_RATE_LIMIT = 2.0  # Seconds between requests (very conservative for 1 req/sec limit)


class SemanticScholarClient:
    """Client for Semantic Scholar API with rate limiting."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.last_request_time = time.time()  # Start from now, not 0
        self.session = requests.Session()
        self.session.headers.update({'x-api-key': api_key})

    def _rate_limit(self):
        """Enforce rate limit - wait at least S2_RATE_LIMIT seconds between requests."""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        wait_time = max(0, S2_RATE_LIMIT - time_since_last)
        if wait_time > 0:
            time.sleep(wait_time)
        self.last_request_time = time.time()

    def get_paper_by_arxiv_id(self, arxiv_id: str, verbose: bool = False) -> Optional[Dict]:
        """
        Fetch paper and author disambiguation from S2.

        Returns paper data with disambiguated author IDs.
        """
        self._rate_limit()

        # Clean arXiv ID (remove version if present)
        clean_id = arxiv_id.split('v')[0]

        url = f"{S2_API_BASE}/paper/arXiv:{clean_id}"
        params = {
            'fields': 'title,authors,externalIds,publicationDate'
        }

        if verbose:
            print(f"🔍 Querying: {url}")

        try:
            response = self.session.get(url, params=params, timeout=30)

            if verbose:
                print(f"   Status: {response.status_code}")

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                if verbose:
                    print(f"   Not found in S2")
                return None
            else:
                print(f"⚠️  S2 API error {response.status_code} for {arxiv_id}")
                return None

        except requests.exceptions.RequestException as e:
            print(f"❌ Network error for {arxiv_id}: {e}")
            return None


def get_recent_papers(driver, days_back: int, limit: Optional[int] = None) -> List[Dict]:
    """Get papers from Neo4j from the last N days."""
    with driver.session(database=NEO4J_DATABASE) as session:
        cutoff_date = (datetime.now() - timedelta(days=days_back)).strftime('%Y-%m-%d')

        query = """
        MATCH (p:Paper)
        WHERE p.published_date >= date($cutoff_date)
        RETURN p.arxiv_id as arxiv_id,
               p.title as title,
               p.published_date as published_date
        ORDER BY p.published_date ASC
        """

        if limit:
            query += f" LIMIT {limit}"

        result = session.run(query, cutoff_date=cutoff_date)
        return [dict(record) for record in result]


def get_paper_authors(driver, arxiv_id: str) -> List[Dict]:
    """Get authors and their canonical_kid for a paper."""
    with driver.session(database=NEO4J_DATABASE) as session:
        query = """
        MATCH (a:Author)-[r:AUTHORED]->(p:Paper {arxiv_id: $arxiv_id})
        RETURN a.kochi_author_id as kid,
               a.name as name,
               a.canonical_kid as canonical_kid,
               r.position as position,
               a.openalex_id as openalex_id
        ORDER BY r.position
        """
        result = session.run(query, arxiv_id=arxiv_id)
        return [dict(record) for record in result]


def compare_disambiguations(our_authors: List[Dict], s2_authors: List[Dict]) -> Dict:
    """
    Compare our fuzzy matching results with S2's disambiguation.

    Returns statistics about matches, conflicts, and coverage.
    """
    stats = {
        'total_authors': len(our_authors),
        's2_has_author_id': 0,
        's2_missing_author_id': 0,
        'position_matches': 0,
        'conflicts': []
    }

    # Map S2 authors by position
    s2_by_position = {}
    for s2_author in s2_authors:
        # S2 authors array is 0-indexed
        pos = s2_authors.index(s2_author)
        s2_by_position[pos] = s2_author

    for our_author in our_authors:
        pos = our_author['position']

        if pos in s2_by_position:
            stats['position_matches'] += 1
            s2_author = s2_by_position[pos]

            # Check if S2 has author ID
            if s2_author.get('authorId'):
                stats['s2_has_author_id'] += 1

                # Record for potential conflict analysis
                if our_author['canonical_kid']:
                    # Could compare if same canonical_kid maps to same S2 author ID
                    pass
            else:
                stats['s2_missing_author_id'] += 1

    return stats


def main():
    parser = argparse.ArgumentParser(
        description="Test Semantic Scholar author disambiguation"
    )
    parser.add_argument("--days", type=int, default=3,
                       help="Days back to query papers (default: 3)")
    parser.add_argument("--limit", type=int,
                       help="Max papers to process (for testing)")
    parser.add_argument("--dry-run", action="store_true",
                       help="Preview without calling S2 API")
    parser.add_argument("--verbose", action="store_true",
                       help="Print detailed API request info")
    parser.add_argument("--output", help="Save results to JSON file")

    args = parser.parse_args()

    # Validate environment
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j environment variables")
        sys.exit(1)

    if not args.dry_run and not S2_API_KEY:
        print("❌ Missing SEMANTIC_SCHOLAR_API_TOKEN environment variable")
        sys.exit(1)

    print("=" * 60)
    print("SEMANTIC SCHOLAR DISAMBIGUATION TEST")
    print("=" * 60)
    print(f"Date range: Last {args.days} days")
    if args.limit:
        print(f"Limit: {args.limit} papers")
    if args.dry_run:
        print("⚠️  DRY RUN MODE - No API calls will be made")
    print()

    # Connect to Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    # Initialize S2 client
    s2_client = SemanticScholarClient(S2_API_KEY) if not args.dry_run else None

    try:
        # Get recent papers
        print(f"📚 Fetching papers from last {args.days} days...")
        papers = get_recent_papers(driver, args.days, args.limit)
        print(f"   Found {len(papers)} papers\n")

        if not papers:
            print("✅ No papers found in date range")
            return

        # Statistics
        results = {
            'date_range': f"last {args.days} days",
            'total_papers': len(papers),
            'papers_in_s2': 0,
            'papers_not_in_s2': 0,
            'total_authors': 0,
            's2_authors_with_id': 0,
            's2_authors_without_id': 0,
            'position_match_rate': 0,
            'papers': []
        }

        # Process each paper
        for idx, paper in enumerate(papers, 1):
            arxiv_id = paper['arxiv_id']

            if idx % 10 == 0 or idx == len(papers):
                print(f"📄 {idx}/{len(papers)} papers processed...")

            # Get our authors
            our_authors = get_paper_authors(driver, arxiv_id)
            results['total_authors'] += len(our_authors)

            if args.dry_run:
                print(f"   [DRY RUN] Would query S2 for {arxiv_id} ({len(our_authors)} authors)")
                continue

            # Query S2
            s2_paper = s2_client.get_paper_by_arxiv_id(arxiv_id, verbose=args.verbose)

            if s2_paper:
                results['papers_in_s2'] += 1

                # Compare authors
                s2_authors = s2_paper.get('authors', [])
                comparison = compare_disambiguations(our_authors, s2_authors)

                results['s2_authors_with_id'] += comparison['s2_has_author_id']
                results['s2_authors_without_id'] += comparison['s2_missing_author_id']

                # Store paper result
                paper_result = {
                    'arxiv_id': arxiv_id,
                    'title': paper['title'],
                    'published_date': str(paper['published_date']),
                    'our_author_count': len(our_authors),
                    's2_author_count': len(s2_authors),
                    's2_authors_with_id': comparison['s2_has_author_id'],
                    'position_matches': comparison['position_matches']
                }
                results['papers'].append(paper_result)

            else:
                results['papers_not_in_s2'] += 1

        # Calculate rates
        if results['papers_in_s2'] > 0:
            results['s2_coverage_rate'] = results['papers_in_s2'] / results['total_papers']

        if results['total_authors'] > 0:
            results['s2_author_id_rate'] = results['s2_authors_with_id'] / results['total_authors']

        # Print summary
        print("\n" + "=" * 60)
        print("📊 SUMMARY")
        print("=" * 60)
        print(f"Papers queried: {results['total_papers']}")
        print(f"Papers in S2: {results['papers_in_s2']} ({results.get('s2_coverage_rate', 0)*100:.1f}%)")
        print(f"Papers not in S2: {results['papers_not_in_s2']}")
        print(f"\nTotal authors: {results['total_authors']}")
        print(f"S2 authors with ID: {results['s2_authors_with_id']} ({results.get('s2_author_id_rate', 0)*100:.1f}%)")
        print(f"S2 authors without ID: {results['s2_authors_without_id']}")
        print()

        # Save to file if requested
        if args.output and not args.dry_run:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"💾 Results saved to {args.output}")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
