#!/usr/bin/env python3
"""
Batch backfill author enrichment data for papers already in Neo4j.

Each run enriches authors from up to N papers (default 1000), walking backward
in time from the most recent papers. The script tracks progress in a state file
so subsequent executions resume from where you left off.

This adds:
- GitHub stars (from paper abstracts)
- OpenAlex data (h-index, citations, affiliations)
- Match confidence tracking (exact/fuzzy matches with confidence scores)

Usage:
    python3 backfill_enrichment.py                    # Enrich 1000 papers
    python3 backfill_enrichment.py --limit 500        # Enrich 500 papers
    python3 backfill_enrichment.py --reset            # Start from scratch
    python3 backfill_enrichment.py --dry-run          # Preview without writing
"""

import argparse
import json
import logging
import os
import sys
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Dict, List, Optional

from neo4j import GraphDatabase

# Import enrichment functions from enrich_authors.py
from enrich_authors import (
    enrich_from_github,
    enrich_from_openalex,
    update_neo4j_authors,
)

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

DEFAULT_LIMIT = 1000  # Papers per run
STATE_FILENAME = "enrichment_backfill_state.json"


@dataclass
class EnrichmentState:
    """Tracks progress of enrichment backfill."""
    last_processed_date: str  # ISO format published_date
    papers_processed: int
    authors_enriched: int
    completed: bool

    @classmethod
    def load(cls, path: Path) -> Optional['EnrichmentState']:
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        return cls(
            last_processed_date=data["last_processed_date"],
            papers_processed=data.get("papers_processed", 0),
            authors_enriched=data.get("authors_enriched", 0),
            completed=data.get("completed", False),
        )

    def save(self, path: Path) -> None:
        payload = {
            "last_processed_date": self.last_processed_date,
            "papers_processed": self.papers_processed,
            "authors_enriched": self.authors_enriched,
            "completed": self.completed,
        }
        path.write_text(json.dumps(payload, indent=2))


def init_state(path: Path) -> EnrichmentState:
    """Initialize new enrichment state starting from most recent papers."""
    state = EnrichmentState(
        last_processed_date="9999-12-31",  # Start from newest papers
        papers_processed=0,
        authors_enriched=0,
        completed=False,
    )
    state.save(path)
    return state


def get_unenriched_papers_batch(driver, last_processed_date: str, limit: int) -> List[str]:
    """
    Get next batch of papers to enrich, walking backward in time.

    Returns arxiv_ids of papers that either:
    1. Have authors without enrichment data, OR
    2. Have authors missing the new match confidence fields
    """
    with driver.session(database=NEO4J_DATABASE) as session:
        # Get papers where authors lack enrichment OR lack match confidence
        query = """
        MATCH (p:Paper)
        WHERE p.published_date < date($last_date)
        WITH p
        ORDER BY p.published_date DESC
        LIMIT $limit

        // Check if paper has authors needing enrichment
        MATCH (a:Author)-[:AUTHORED]->(p)
        WHERE a.h_index IS NULL OR a.openalex_match_confidence IS NULL

        RETURN DISTINCT p.arxiv_id AS arxiv_id, p.published_date AS pub_date
        ORDER BY p.published_date DESC
        LIMIT $limit
        """

        result = session.run(query, last_date=last_processed_date, limit=limit)
        records = [dict(record) for record in result]

        if not records:
            return []

        arxiv_ids = [r["arxiv_id"] for r in records]
        oldest_date = records[-1]["pub_date"]

        logging.info(f"Found {len(arxiv_ids)} papers to enrich (oldest: {oldest_date})")
        return arxiv_ids, oldest_date


def count_unenriched_authors(driver) -> Dict[str, int]:
    """Count how many authors need enrichment."""
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run("""
            MATCH (a:Author)
            RETURN
                count(a) AS total_authors,
                count(a.h_index) AS with_h_index,
                count(a.openalex_match_confidence) AS with_match_confidence
        """)
        record = result.single()

        total = record["total_authors"]
        with_h_index = record["with_h_index"]
        with_confidence = record["with_match_confidence"]

        return {
            "total": total,
            "enriched": with_h_index,
            "unenriched": total - with_h_index,
            "missing_confidence": with_h_index - with_confidence,
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Batch backfill author enrichment for papers in Neo4j.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Papers to enrich per run (default: {DEFAULT_LIMIT}).",
    )
    parser.add_argument(
        "--state-file",
        type=Path,
        default=Path(__file__).with_name(STATE_FILENAME),
        help=f"Path to state JSON (default: {STATE_FILENAME}).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview what would be enriched without writing to Neo4j.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Ignore existing state and restart from newest papers.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging.",
    )
    parser.add_argument(
        "--stats",
        action="store_true",
        help="Show enrichment statistics and exit.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    # Validate environment
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        logging.error("Missing Neo4j environment variables")
        sys.exit(1)

    # Connect to Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    try:
        # Show stats if requested
        if args.stats:
            stats = count_unenriched_authors(driver)
            print(f"\n📊 Author Enrichment Status:")
            print(f"   Total authors: {stats['total']:,}")
            print(f"   ✅ Enriched: {stats['enriched']:,}")
            print(f"   ❌ Unenriched: {stats['unenriched']:,}")
            print(f"   ⚠️  Missing match confidence: {stats['missing_confidence']:,}")
            print()
            return

        # Load or initialize state
        state_path = args.state_file

        if args.reset and state_path.exists():
            state_path.unlink()
            logging.info(f"Removed existing state file: {state_path}")

        state = EnrichmentState.load(state_path)
        if state is None or args.reset:
            logging.info("Initializing new enrichment backfill state")
            state = init_state(state_path)

        if state.completed:
            logging.info("Enrichment backfill already completed. Use --reset to start over.")
            stats = count_unenriched_authors(driver)
            if stats['unenriched'] > 0 or stats['missing_confidence'] > 0:
                logging.info(f"Note: {stats['unenriched']} unenriched + {stats['missing_confidence']} missing confidence remain")
            return

        # Get next batch of papers to enrich
        logging.info(f"Fetching up to {args.limit} papers needing enrichment...")
        batch_result = get_unenriched_papers_batch(
            driver,
            state.last_processed_date,
            args.limit
        )

        if not batch_result or len(batch_result[0]) == 0:
            logging.info("No more papers to enrich. Marking as complete.")
            state.completed = True
            state.save(state_path)
            return

        arxiv_ids, oldest_date = batch_result
        logging.info(f"Processing {len(arxiv_ids)} papers (oldest: {oldest_date})")

        if args.dry_run:
            logging.info(f"DRY RUN: Would enrich authors from {len(arxiv_ids)} papers")
            logging.info(f"Next run would start from papers older than {oldest_date}")
            return

        # Run enrichment (same as enrich_authors.py)
        logging.info("\n🚀 Starting enrichment...\n")

        github_stars = enrich_from_github(driver, arxiv_ids)
        openalex_data = enrich_from_openalex(driver, arxiv_ids)

        update_neo4j_authors(driver, github_stars, openalex_data)

        # Update state
        unique_authors = len(set(list(github_stars.keys()) + list(openalex_data.keys())))
        state.papers_processed += len(arxiv_ids)
        state.authors_enriched += unique_authors
        state.last_processed_date = str(oldest_date)
        state.save(state_path)

        logging.info(f"\n✅ Batch complete!")
        logging.info(f"   Papers processed this run: {len(arxiv_ids)}")
        logging.info(f"   Authors enriched this run: {unique_authors}")
        logging.info(f"   Total papers processed: {state.papers_processed}")
        logging.info(f"   Total authors enriched: {state.authors_enriched}")
        logging.info(f"   Next run starts from: {state.last_processed_date}")

        # Show remaining work
        stats = count_unenriched_authors(driver)
        if stats['unenriched'] > 0 or stats['missing_confidence'] > 0:
            logging.info(f"\n📊 Remaining work:")
            logging.info(f"   {stats['unenriched']:,} authors still unenriched")
            logging.info(f"   {stats['missing_confidence']:,} missing match confidence")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
