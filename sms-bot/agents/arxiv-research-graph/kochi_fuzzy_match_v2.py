#!/usr/bin/env python3
"""
Kochi Fuzzy Matching V2 - Authorship-based Model

Assigns canonical_kid to Author nodes based on fuzzy matching.

In the new authorship-based model:
- Each paper appearance creates a NEW Author node with unique KID
- Fuzzy matching determines which Author nodes represent the same person
- Sets canonical_kid field to link related Author nodes

Usage:
    python3 kochi_fuzzy_match_v2.py --date 2025-10-12 --dry-run
    python3 kochi_fuzzy_match_v2.py --date-start 2025-10-01 --date-end 2025-10-31
    python3 kochi_fuzzy_match_v2.py --all
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Set
from dataclasses import dataclass

from neo4j import GraphDatabase
from neo4j.exceptions import SessionExpired, ServiceUnavailable

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

# Matching thresholds
CONFIDENCE_THRESHOLD_CANONICAL = 80  # Assign to canonical author
CONFIDENCE_THRESHOLD_UNCERTAIN = 60  # Flag as uncertain, needs review
MAX_SCORE = 100

# Signal weights (3 signals)
WEIGHT_COAUTHOR_2_PLUS = 50
WEIGHT_COAUTHOR_1 = 25
WEIGHT_NAME_AFFILIATION = 30
WEIGHT_RESEARCH_AREA_2_PLUS = 20
WEIGHT_RESEARCH_AREA_1 = 10

# Connection management
RECONNECT_AFTER_AUTHORS = 500  # Refresh connection every N authors
MAX_RETRIES = 3  # Retry failed operations
RETRY_DELAY = 2  # Seconds to wait between retries

# Checkpoint file
CHECKPOINT_DIR = Path(__file__).parent / '.fuzzy_match_checkpoints'


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


def save_checkpoint(checkpoint_id: str, processed_kids: Set[str], stats: Dict):
    """Save processing checkpoint to disk."""
    CHECKPOINT_DIR.mkdir(exist_ok=True)
    checkpoint_file = CHECKPOINT_DIR / f"{checkpoint_id}.json"

    checkpoint_data = {
        'processed_kids': list(processed_kids),
        'stats': stats,
        'timestamp': datetime.now().isoformat()
    }

    with open(checkpoint_file, 'w') as f:
        json.dump(checkpoint_data, f, indent=2)


def load_checkpoint(checkpoint_id: str) -> tuple[Set[str], Dict]:
    """Load processing checkpoint from disk."""
    checkpoint_file = CHECKPOINT_DIR / f"{checkpoint_id}.json"

    if not checkpoint_file.exists():
        return set(), {'processed': 0, 'canonical_self': 0, 'matched_to_existing': 0, 'uncertain': 0}

    with open(checkpoint_file, 'r') as f:
        data = json.load(f)

    processed_kids = set(data['processed_kids'])
    stats = data['stats']

    print(f"📂 Resuming from checkpoint: {len(processed_kids)} authors already processed")
    print(f"   Last checkpoint: {data['timestamp']}")

    return processed_kids, stats


def delete_checkpoint(checkpoint_id: str):
    """Delete checkpoint file after successful completion."""
    checkpoint_file = CHECKPOINT_DIR / f"{checkpoint_id}.json"
    if checkpoint_file.exists():
        checkpoint_file.unlink()


@dataclass
class MatchResult:
    """Result of fuzzy matching between two authors."""
    candidate_kid: str
    candidate_name: str
    confidence: int
    signals: List[str]
    reasoning: str


class KochiFuzzyMatcherV2:
    """Fuzzy matching engine for authorship-based Author nodes."""

    def __init__(self, driver):
        self.driver = driver
        self.database = NEO4J_DATABASE

    @retry_on_connection_error
    def find_similar_authors(self, author_name: str, exclude_kid: str) -> List[Dict]:
        """
        Find existing authors with same or similar name.
        Excludes the author we're trying to match.
        """
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (a:Author)
            WHERE toLower(trim(a.name)) = toLower(trim($name))
              AND a.kochi_author_id <> $exclude_kid
            RETURN
                a.kochi_author_id as kid,
                a.name as name,
                a.affiliation as affiliation,
                coalesce(a.canonical_kid, a.kochi_author_id) as canonical_kid
            """
            result = session.run(query, name=author_name, exclude_kid=exclude_kid)
            return [dict(record) for record in result]

    @retry_on_connection_error
    def get_author_coauthors(self, kid: str) -> Set[str]:
        """Get set of co-author names for an author."""
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (author:Author {kochi_author_id: $kid})-[:AUTHORED]->(p:Paper)
                  <-[:AUTHORED]-(coauthor:Author)
            WHERE coauthor.kochi_author_id <> $kid
            RETURN DISTINCT coauthor.name as name
            """
            result = session.run(query, kid=kid)
            return {record["name"] for record in result}

    @retry_on_connection_error
    def get_author_categories(self, kid: str) -> Set[str]:
        """Get set of research categories for an author."""
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (a:Author {kochi_author_id: $kid})-[:AUTHORED]->(p:Paper)
                  -[:IN_CATEGORY]->(c:Category)
            RETURN DISTINCT c.name as category
            """
            result = session.run(query, kid=kid)
            return {record["category"] for record in result}

    def calculate_match_score(
        self,
        author1_kid: str,
        author1_name: str,
        author1_affiliation: Optional[str],
        author2_kid: str,
        author2_name: str,
        author2_affiliation: Optional[str]
    ) -> MatchResult:
        """
        Calculate fuzzy match score between two authors.

        Returns confidence score (0-100) and reasoning.
        """
        score = 0
        signals = []

        # Get co-authors and categories for both
        author1_coauthors = self.get_author_coauthors(author1_kid)
        author2_coauthors = self.get_author_coauthors(author2_kid)

        author1_categories = self.get_author_categories(author1_kid)
        author2_categories = self.get_author_categories(author2_kid)

        # Signal 1: Co-author overlap (0-50 points)
        shared_coauthors = len(author1_coauthors & author2_coauthors)
        if shared_coauthors >= 2:
            score += WEIGHT_COAUTHOR_2_PLUS
            signals.append(f"2+ shared co-authors (strong)")
        elif shared_coauthors == 1:
            score += WEIGHT_COAUTHOR_1
            signals.append(f"1 shared co-author")

        # Signal 2: Name + affiliation (0-30 points)
        if author1_name.lower().strip() == author2_name.lower().strip():
            if author1_affiliation and author2_affiliation:
                if author1_affiliation.lower() == author2_affiliation.lower():
                    score += WEIGHT_NAME_AFFILIATION
                    signals.append("exact name + same affiliation")
                else:
                    # Same name but different affiliation - likely different people
                    signals.append("same name but DIFFERENT affiliation")
            else:
                # Same name, no affiliation data
                signals.append("exact name (no affiliation)")
        else:
            # Different names - probably different people
            signals.append(f"different names: '{author1_name}' vs '{author2_name}'")

        # Signal 3: Research area overlap (0-20 points)
        shared_categories = len(author1_categories & author2_categories)
        if shared_categories >= 2:
            score += WEIGHT_RESEARCH_AREA_2_PLUS
            signals.append(f"{shared_categories} shared categories")
        elif shared_categories == 1:
            score += WEIGHT_RESEARCH_AREA_1
            signals.append(f"1 shared category")

        # Build reasoning
        reasoning = " + ".join(signals)

        return MatchResult(
            candidate_kid=author2_kid,
            candidate_name=author2_name,
            confidence=score,
            signals=signals,
            reasoning=reasoning
        )

    @retry_on_connection_error
    def assign_canonical_kid(self, author_kid: str, canonical_kid: str, confidence: int):
        """Assign canonical_kid to an author."""
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (a:Author {kochi_author_id: $kid})
            SET a.canonical_kid = $canonical_kid,
                a.canonical_confidence = $confidence,
                a.canonical_assigned_at = datetime()
            """
            session.run(
                query,
                kid=author_kid,
                canonical_kid=canonical_kid,
                confidence=confidence
            )

    @retry_on_connection_error
    def mark_as_canonical_self(self, author_kid: str):
        """Mark author as its own canonical (no duplicates found)."""
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (a:Author {kochi_author_id: $kid})
            SET a.canonical_kid = $kid,
                a.canonical_confidence = 100,
                a.canonical_assigned_at = datetime(),
                a.is_canonical = true
            """
            session.run(query, kid=author_kid)

    @retry_on_connection_error
    def mark_as_uncertain(self, author_kid: str, possible_canonical_kid: str, confidence: int):
        """Mark author as uncertain - needs human review."""
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (a:Author {kochi_author_id: $kid})
            SET a.canonical_kid = $possible_canonical_kid,
                a.canonical_confidence = $confidence,
                a.canonical_assigned_at = datetime(),
                a.needs_review = true
            """
            session.run(
                query,
                kid=author_kid,
                possible_canonical_kid=possible_canonical_kid,
                confidence=confidence
            )


def get_authors_needing_canonical(driver, limit=None, target_date=None, date_start=None, date_end=None,
                                   paper_date_start=None, paper_date_end=None):
    """Get Author nodes that don't have canonical_kid assigned."""
    with driver.session(database=NEO4J_DATABASE) as session:
        params = {}

        # Use paper-based filtering for backlog processing
        if paper_date_start and paper_date_end:
            query = """
            MATCH (a:Author)-[:AUTHORED]->(p:Paper)
            WHERE a.canonical_kid IS NULL
              AND p.published_date >= date($paper_date_start)
              AND p.published_date <= date($paper_date_end)
            WITH DISTINCT a
            RETURN a.kochi_author_id as kid,
                   a.name as name,
                   a.affiliation as affiliation
            ORDER BY a.name
            """
            params['paper_date_start'] = paper_date_start
            params['paper_date_end'] = paper_date_end
        else:
            # Use author created_at filtering for daily processing
            query = """
            MATCH (a:Author)
            WHERE a.canonical_kid IS NULL
            """

            # Add date filtering
            if target_date:
                query += " AND date(a.created_at) = date($target_date)"
                params['target_date'] = target_date
            elif date_start and date_end:
                query += " AND date(a.created_at) >= date($date_start) AND date(a.created_at) <= date($date_end)"
                params['date_start'] = date_start
                params['date_end'] = date_end

            query += """
            RETURN a.kochi_author_id as kid,
                   a.name as name,
                   a.affiliation as affiliation
            ORDER BY a.created_at
            """

        if limit:
            query += f" LIMIT {limit}"

        result = session.run(query, **params)
        return [dict(record) for record in result]


def main():
    parser = argparse.ArgumentParser(
        description="Kochi Fuzzy Matching V2 - Assign canonical_kid to authors"
    )
    parser.add_argument("--all", action="store_true", help="Process all authors")
    parser.add_argument("--limit", type=int, help="Limit number of authors to process")
    parser.add_argument("--dry-run", action="store_true",
                       help="Show decisions without making changes")
    parser.add_argument("--date", help="Process authors from specific date (YYYY-MM-DD)")
    parser.add_argument("--date-start", help="Process authors from date range start")
    parser.add_argument("--date-end", help="Process authors from date range end")
    parser.add_argument("--paper-date-start", help="Process authors by paper published date range start (for backlog)")
    parser.add_argument("--paper-date-end", help="Process authors by paper published date range end (for backlog)")

    args = parser.parse_args()

    # Validate environment
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j environment variables")
        sys.exit(1)

    # Connect to Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    try:
        matcher = KochiFuzzyMatcherV2(driver)

        # Get authors needing canonical assignment
        authors = get_authors_needing_canonical(
            driver,
            limit=args.limit,
            target_date=args.date,
            date_start=args.date_start,
            date_end=args.date_end,
            paper_date_start=args.paper_date_start,
            paper_date_end=args.paper_date_end
        )

        if not authors:
            print("✅ All authors have canonical_kid assigned!")
            sys.exit(0)

        print(f"\n🚀 Processing {len(authors)} authors...\n")

        if args.dry_run:
            print("🔍 DRY RUN MODE - No changes will be made\n")

        # Generate checkpoint ID based on date range
        checkpoint_id = f"fuzzy_match_{args.date_start or args.date or 'all'}_{args.date_end or ''}"

        # Load checkpoint to resume from previous run
        processed_kids, stats = load_checkpoint(checkpoint_id)

        # Filter out already processed authors
        remaining_authors = [a for a in authors if a['kid'] not in processed_kids]

        if remaining_authors:
            print(f"📝 {len(remaining_authors)} authors remaining to process (of {len(authors)} total)\n")
        else:
            print("✅ All authors in this batch have been processed!")
            delete_checkpoint(checkpoint_id)
            sys.exit(0)

        # Connection refresh counter
        authors_since_reconnect = 0

        for idx, author in enumerate(remaining_authors, 1):
            kid = author['kid']
            name = author['name']
            affiliation = author['affiliation']

            # Periodic connection refresh
            authors_since_reconnect += 1
            if authors_since_reconnect >= RECONNECT_AFTER_AUTHORS:
                print(f"  🔄 Refreshing Neo4j connection after {RECONNECT_AFTER_AUTHORS} authors...")
                driver.close()
                driver = GraphDatabase.driver(
                    NEO4J_URI,
                    auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
                )
                matcher = KochiFuzzyMatcherV2(driver)
                authors_since_reconnect = 0
                print(f"  ✓ Connection refreshed")

            if idx % 100 == 0 or idx == len(remaining_authors):
                total_processed = len(processed_kids) + idx
                print(f"  📄 {total_processed}/{len(authors)} total authors processed ({idx}/{len(remaining_authors)} in this session)")

            # Find similar authors (same name)
            similar = matcher.find_similar_authors(name, exclude_kid=kid)

            if not similar:
                # No similar authors - this is canonical
                if not args.dry_run:
                    matcher.mark_as_canonical_self(kid)
                stats['canonical_self'] += 1
            else:
                # Check each similar author
                best_match = None
                best_confidence = 0

                for candidate in similar:
                    match = matcher.calculate_match_score(
                        kid, name, affiliation,
                        candidate['kid'], candidate['name'], candidate['affiliation']
                    )

                    if match.confidence > best_confidence:
                        best_match = match
                        best_confidence = match.confidence

                # Decide based on confidence
                if best_confidence >= CONFIDENCE_THRESHOLD_CANONICAL:
                    # High confidence - assign to canonical
                    canonical = best_match.candidate_kid
                    if not args.dry_run:
                        matcher.assign_canonical_kid(kid, canonical, best_confidence)
                    stats['matched_to_existing'] += 1

                elif best_confidence >= CONFIDENCE_THRESHOLD_UNCERTAIN:
                    # Medium confidence - mark as uncertain
                    if not args.dry_run:
                        matcher.mark_as_uncertain(kid, best_match.candidate_kid, best_confidence)
                    stats['uncertain'] += 1

                else:
                    # Low confidence - treat as unique
                    if not args.dry_run:
                        matcher.mark_as_canonical_self(kid)
                    stats['canonical_self'] += 1

            stats['processed'] += 1
            processed_kids.add(kid)

            # Save checkpoint every 100 authors
            if idx % 100 == 0:
                save_checkpoint(checkpoint_id, processed_kids, stats)

        # Final checkpoint save
        save_checkpoint(checkpoint_id, processed_kids, stats)

        # Print summary
        print("\n" + "="*60)
        print("📊 Summary")
        print("="*60)
        print(f"Total authors processed: {stats['processed']}")
        print(f"Canonical (self): {stats['canonical_self']}")
        print(f"Matched to existing canonical: {stats['matched_to_existing']}")
        print(f"Uncertain (needs review): {stats['uncertain']}")
        print()

        if args.dry_run:
            print("ℹ️  This was a dry run. No changes were made.")
        else:
            print("✅ Canonical assignment complete!")

        # Delete checkpoint after successful completion
        delete_checkpoint(checkpoint_id)
        print("🗑️  Checkpoint deleted")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
