#!/usr/bin/env python3
"""
Fetch up to a week of AI/ML papers from arXiv and load them into Neo4j.

This utility is intended for the Neo4j fork of the arXiv Research Agent.
It pulls papers across the core AI categories over a configurable date
window and stores Paper, Author, and Category nodes plus relationships.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterable, List

import arxiv
from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError

# Reuse the same category coverage as the relational agent
AI_CATEGORIES = [
    "cs.AI",
    "cs.LG",
    "cs.CV",
    "cs.CL",
    "stat.ML",
]
DEFAULT_MAX_RESULTS = 1000
DEFAULT_DAYS = 7
BATCH_SIZE = 25

MERGE_BATCH_QUERY = """
UNWIND $batch AS paper
MERGE (p:Paper {arxiv_id: paper.arxiv_id})
ON CREATE SET
    p.created_at = datetime(paper.ingested_at),
    p.featured_in_report = false,
    p.featured_rank = null,
    p.curation_reason = null,
    p.featured_date = null,
    p.author_notability_score = coalesce(p.author_notability_score, 0)
SET p.title = paper.title,
    p.abstract = paper.abstract,
    p.categories = paper.categories,
    p.primary_category = paper.primary_category,
    p.published_date = date(paper.published_date),
    p.arxiv_url = paper.arxiv_url,
    p.pdf_url = paper.pdf_url,
    p.updated_at = datetime(paper.ingested_at),
    p.last_ingested_at = datetime(paper.ingested_at)
WITH p, paper
FOREACH (category IN paper.categories |
  MERGE (c:Category {name: category})
  MERGE (p)-[:IN_CATEGORY]->(c)
)
WITH p, paper
FOREACH (author_map IN paper.authors |
  // CREATE new Author node for each authorship (not MERGE)
  // Each paper appearance gets its own Author node with unique KID
  CREATE (a:Author)
  SET a.kochi_author_id = 'KA_' + substring(randomUUID(), 0, 12),
      a.name = author_map.name,
      a.affiliation = author_map.affiliation,
      a.first_seen = date(author_map.first_seen),
      a.last_seen = date(author_map.last_seen),
      a.paper_count = 1,
      a.created_at = datetime(author_map.ingested_at)
  CREATE (a)-[r:AUTHORED]->(p)
  SET r.position = author_map.position,
      r.created_at = datetime(author_map.ingested_at),
      r.last_updated = datetime(author_map.ingested_at)
)
RETURN count(DISTINCT p) AS merged_papers
"""


class ConfigurationError(RuntimeError):
    """Raised when a required environment variable is missing."""


@dataclass
class Neo4jConfig:
    uri: str
    username: str
    password: str
    database: str


def read_config_from_env() -> Neo4jConfig:
    """Load Neo4j connection details from environment variables."""
    uri = os.getenv("NEO4J_URI")
    username = os.getenv("NEO4J_USERNAME")
    password = os.getenv("NEO4J_PASSWORD")
    database = os.getenv("NEO4J_DATABASE", "neo4j")

    missing = [name for name, value in [
        ("NEO4J_URI", uri),
        ("NEO4J_USERNAME", username),
        ("NEO4J_PASSWORD", password),
    ] if not value]

    if missing:
        raise ConfigurationError(
            "Missing required environment variables: " + ", ".join(missing)
        )

    return Neo4jConfig(
        uri=uri,
        username=username,
        password=password,
        database=database,
    )


def fetch_existing_paper_ids(config: Neo4jConfig, start_date: date, end_date: date) -> set[str]:
    """Fetch arxiv_id values for papers already in Neo4j for the given date range."""
    driver = GraphDatabase.driver(config.uri, auth=(config.username, config.password))

    try:
        driver.verify_connectivity()
        logging.info("Querying Neo4j for existing papers between %s and %s...", start_date, end_date)
    except Neo4jError as exc:
        logging.warning("Failed to connect to Neo4j for deduplication check: %s", exc)
        return set()

    existing_ids: set[str] = set()

    with driver.session(database=config.database) as session:
        result = session.run(
            """
            MATCH (p:Paper)
            WHERE p.published_date >= date($start_date)
              AND p.published_date <= date($end_date)
            RETURN p.arxiv_id AS arxiv_id
            """,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
        )

        for record in result:
            arxiv_id = record.get("arxiv_id")
            if arxiv_id:
                existing_ids.add(arxiv_id)

    driver.close()
    logging.info("Found %s existing papers in Neo4j for date range.", len(existing_ids))
    return existing_ids


def fetch_recent_papers(
    days: int,
    end_date: date,
    max_results: int | None,
    config: Neo4jConfig | None = None,
    existing_ids: set[str] | None = None
) -> list[dict[str, Any]]:
    """Fetch AI/ML papers from arXiv within a date window.

    Args:
        days: Number of days to fetch
        end_date: Last date to include
        max_results: Maximum papers to fetch (None for unlimited)
        config: Neo4j config for deduplication (optional)
        existing_ids: Pre-fetched set of existing paper IDs (optional)
    """
    category_query = " OR ".join(f"cat:{cat}" for cat in AI_CATEGORIES)
    client = arxiv.Client(
        page_size=100,
        delay_seconds=3,
        num_retries=3,
    )

    # Fetch existing IDs from Neo4j if config provided and existing_ids not passed
    if existing_ids is None and config is not None:
        start_date = end_date - timedelta(days=days - 1)
        existing_ids = fetch_existing_paper_ids(config, start_date, end_date)
    elif existing_ids is None:
        existing_ids = set()

    logging.info(
        "Fetching arXiv papers for the %s-day window ending on %s (limit=%s, %s already in Neo4j)...",
        days,
        end_date.isoformat(),
        max_results or "none",
        len(existing_ids),
    )

    seen_ids: set[str] = set()
    papers: list[dict[str, Any]] = []
    skipped_existing = 0

    for offset in range(days):
        current_date = end_date - timedelta(days=offset)
        start_str = current_date.strftime("%Y%m%d0000")
        end_str = current_date.strftime("%Y%m%d2359")
        query = f"({category_query}) AND submittedDate:[{start_str} TO {end_str}]"

        logging.info("Fetching papers for %s (query window %s-%s)...", current_date, start_str, end_str)

        search = arxiv.Search(
            query=query,
            max_results=1000,
            sort_by=arxiv.SortCriterion.SubmittedDate,
            sort_order=arxiv.SortOrder.Descending,
        )
        results_iter = client.results(search)

        while True:
            if max_results is not None and len(papers) >= max_results:
                logging.info("Reached max result cap (%s). Stopping fetch.", max_results)
                return papers

            try:
                result = next(results_iter)
            except StopIteration:
                break
            except Exception as exc:  # Catch pagination edge case
                UnexpectedEmptyPage = getattr(arxiv, "UnexpectedEmptyPage", None)
                UnexpectedEmptyPageError = getattr(arxiv, "UnexpectedEmptyPageError", None)
                handled = (
                    UnexpectedEmptyPage and isinstance(exc, UnexpectedEmptyPage)
                ) or (
                    UnexpectedEmptyPageError and isinstance(exc, UnexpectedEmptyPageError)
                ) or "unexpectedly empty" in str(exc).lower()

                if handled:
                    logging.warning(
                        "Encountered an unexpectedly empty page while fetching %s; moving to next day.",
                        current_date,
                    )
                    break

                raise

            paper_dict = serialize_result(result)
            arxiv_id = paper_dict["arxiv_id"]

            # Skip if already in Neo4j
            if arxiv_id in existing_ids:
                skipped_existing += 1
                continue

            # Skip if already fetched in this run
            if arxiv_id in seen_ids:
                continue

            seen_ids.add(arxiv_id)
            papers.append(paper_dict)

    logging.info(
        "Fetched %s unique papers across %s days (skipped %s already in Neo4j).",
        len(papers),
        days,
        skipped_existing,
    )
    return papers


def serialize_result(result: arxiv.Result) -> dict[str, Any]:
    """Convert an arXiv result to a serializable dictionary."""
    arxiv_id = result.entry_id.split("/")[-1]
    ingested_at = datetime.now(tz=timezone.utc).isoformat()

    authors = []
    for idx, author in enumerate(result.authors, start=1):
        authors.append({
            "name": author.name,
            "affiliation": getattr(author, "affiliation", None),
            "position": idx,
            "first_seen": result.published.strftime("%Y-%m-%d"),
            "last_seen": result.published.strftime("%Y-%m-%d"),
            "ingested_at": ingested_at,
        })

    return {
        "arxiv_id": arxiv_id,
        "title": result.title.strip(),
        "abstract": result.summary.strip(),
        "categories": list(result.categories),
        "primary_category": result.primary_category,
        "published_date": result.published.strftime("%Y-%m-%d"),
        "arxiv_url": result.entry_id,
        "pdf_url": result.pdf_url,
        "authors": authors,
        "ingested_at": ingested_at,
    }


def chunked(iterable: List[dict[str, Any]], size: int) -> Iterable[List[dict[str, Any]]]:
    """Yield successive chunks from iterable."""
    for start in range(0, len(iterable), size):
        yield iterable[start:start + size]


def normalize_papers_from_json(json_path: Path) -> list[dict[str, Any]]:
    """Load paper payload from fetch JSON and adapt fields for Neo4j ingest."""
    raw_text = json_path.read_text()
    payload = json.loads(raw_text)

    papers_raw = payload.get("papers") or []
    normalized: list[dict[str, Any]] = []
    seen: set[str] = set()

    target_date = payload.get("target_date")
    ingested_at = datetime.now(tz=timezone.utc).isoformat()

    for entry in papers_raw:
        arxiv_id = entry.get("arxiv_id")
        if not arxiv_id or arxiv_id in seen:
            continue

        seen.add(arxiv_id)

        published = entry.get("published_date") or target_date or datetime.now().strftime("%Y-%m-%d")
        categories = entry.get("categories") or []
        primary_category = entry.get("primary_category") or (categories[0] if categories else None)

        authors_payload = entry.get("authors") or []
        authors: list[dict[str, Any]] = []
        for idx, author in enumerate(authors_payload, start=1):
            name = author.get("name")
            if not name:
                continue
            authors.append({
                "name": name,
                "affiliation": author.get("affiliation"),
                "position": idx,
                "first_seen": published,
                "last_seen": published,
                "ingested_at": ingested_at,
                # Placeholders for optional profile enrichment fields
                "github_username": author.get("github_username"),
                "huggingface_username": author.get("huggingface_username"),
                "google_scholar_id": author.get("google_scholar_id"),
                "github_stars": author.get("github_stars"),
                "h_index": author.get("h_index"),
            })

        normalized.append({
            "arxiv_id": arxiv_id,
            "title": (entry.get("title") or "").strip(),
            "abstract": (entry.get("abstract") or "").strip(),
            "categories": categories,
            "primary_category": primary_category,
            "published_date": published,
            "arxiv_url": entry.get("arxiv_url"),
            "pdf_url": entry.get("pdf_url"),
            "authors": authors,
            "ingested_at": ingested_at,
        })

    return normalized


def load_papers_into_neo4j(config: Neo4jConfig, papers: list[dict[str, Any]]) -> None:
    """Insert/merge paper data into Neo4j."""
    if not papers:
        logging.warning("No papers to load into Neo4j.")
        return

    driver = GraphDatabase.driver(config.uri, auth=(config.username, config.password))

    try:
        driver.verify_connectivity()
        logging.info("Connected to Neo4j at %s (database: %s).", config.uri, config.database)
    except Neo4jError as exc:
        raise RuntimeError(f"Failed to verify Neo4j connectivity: {exc}") from exc

    total_papers = 0
    total_batches = 0

    with driver.session(database=config.database) as session:
        for batch in chunked(papers, BATCH_SIZE):
            total_batches += 1
            logging.debug("Merging batch %s with %s papers.", total_batches, len(batch))
            session.execute_write(lambda tx: tx.run(MERGE_BATCH_QUERY, batch=batch))
            total_papers += len(batch)

    logging.info("Loaded %s papers into Neo4j across %s batches.", total_papers, total_batches)
    driver.close()


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Fetch recent arXiv AI papers over a date window and load them into Neo4j."
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_MAX_RESULTS,
        help=f"Maximum papers to ingest across the window (default: {DEFAULT_MAX_RESULTS}).",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=DEFAULT_DAYS,
        help=f"How many days back to fetch (default: {DEFAULT_DAYS}).",
    )
    parser.add_argument(
        "--end-date",
        type=lambda s: datetime.strptime(s, "%Y-%m-%d").date(),
        default=date.today(),
        help="Last calendar date to include (YYYY-MM-DD, default: today).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch data but do not write to Neo4j. Prints a sample paper instead.",
    )
    parser.add_argument(
        "--input-json",
        type=Path,
        help="Load papers from an existing fetch JSON file instead of calling the arXiv API.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable verbose logging.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    try:
        neo4j_config = read_config_from_env()
    except ConfigurationError as exc:
        logging.error(str(exc))
        raise SystemExit(1) from exc

    if args.input_json:
        papers = normalize_papers_from_json(args.input_json)
        logging.info(
            "Loaded %s papers from JSON file %s.",
            len(papers),
            args.input_json,
        )
        if args.limit and args.limit > 0:
            papers = papers[: args.limit]
    else:
        limit = args.limit if args.limit and args.limit > 0 else None

        papers = fetch_recent_papers(
            days=args.days,
            end_date=args.end_date,
            max_results=limit,
            config=neo4j_config,  # Enable deduplication
        )

    if args.dry_run:
        if papers:
            sample = papers[0]
            logging.info("Fetched %s papers. Sample entry:\n%s", len(papers), sample)
        else:
            logging.warning("No papers fetched.")
        return

    load_papers_into_neo4j(neo4j_config, papers)


if __name__ == "__main__":
    main()
