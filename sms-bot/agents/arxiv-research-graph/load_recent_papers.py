#!/usr/bin/env python3
"""
Fetch up to a week of AI/ML papers from arXiv and load them into Neo4j.

This utility is intended for the Neo4j fork of the arXiv Research Agent.
It pulls papers across the core AI categories over a configurable date
window and stores Paper, Author, and Category nodes plus relationships.
"""

from __future__ import annotations

import argparse
import logging
import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
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
  MERGE (a:Author {name: author_map.name})
  SET a.affiliation =
        CASE
          WHEN author_map.affiliation IS NOT NULL THEN author_map.affiliation
          ELSE a.affiliation
        END,
      a.first_seen = coalesce(a.first_seen, date(author_map.first_seen)),
      a.last_seen = date(author_map.last_seen)
  MERGE (a)-[r:AUTHORED]->(p)
  SET r.position = author_map.position,
      r.created_at = coalesce(r.created_at, datetime(author_map.ingested_at)),
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


def fetch_recent_papers(days: int, end_date: date, max_results: int | None) -> list[dict[str, Any]]:
    """Fetch AI/ML papers from arXiv within a date window."""
    category_query = " OR ".join(f"cat:{cat}" for cat in AI_CATEGORIES)
    client = arxiv.Client(
        page_size=100,
        delay_seconds=3,
        num_retries=3,
    )

    logging.info(
        "Fetching arXiv papers for the %s-day window ending on %s (limit=%s)...",
        days,
        end_date.isoformat(),
        max_results or "none",
    )

    seen_ids: set[str] = set()
    papers: list[dict[str, Any]] = []

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

            if arxiv_id in seen_ids:
                continue

            seen_ids.add(arxiv_id)
            papers.append(paper_dict)

    logging.info("Fetched %s unique papers across %s days.", len(papers), days)
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

    limit = args.limit if args.limit and args.limit > 0 else None

    papers = fetch_recent_papers(
        days=args.days,
        end_date=args.end_date,
        max_results=limit,
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
