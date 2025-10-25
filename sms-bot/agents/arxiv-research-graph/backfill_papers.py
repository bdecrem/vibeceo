#!/usr/bin/env python3
"""
Batch backfill arXiv AI/ML papers into Neo4j over a multi-month window.

Each run ingests up to a fixed number of papers (default 20000), marching
backward in time. The script records its progress in a state file so
subsequent executions resume from the previous stopping point until the
target lookback window (default 12 months) is fully covered.
"""

from __future__ import annotations

import argparse
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import arxiv
from neo4j import GraphDatabase
from neo4j.exceptions import Neo4jError
from neo4j.time import Date as Neo4jDate

from load_recent_papers import (  # local import
    AI_CATEGORIES,
    ConfigurationError,
    Neo4jConfig,
    load_papers_into_neo4j,
    read_config_from_env,
)

DEFAULT_LIMIT = 20000
DEFAULT_LOOKBACK_DAYS = 1095  # ≈ 36 months
STATE_FILENAME = "backfill_state.json"


@dataclass
class BackfillState:
    anchor_date: date
    last_end_date: date
    earliest_ingested: date | None
    completed: bool

    @classmethod
    def load(cls, path: Path) -> BackfillState | None:
        if not path.exists():
            return None
        data = json.loads(path.read_text())
        return cls(
            anchor_date=datetime.strptime(data["anchor_date"], "%Y-%m-%d").date(),
            last_end_date=datetime.strptime(data["last_end_date"], "%Y-%m-%d").date(),
            earliest_ingested=(
                datetime.strptime(data["earliest_ingested"], "%Y-%m-%d").date()
                if data.get("earliest_ingested")
                else None
            ),
            completed=bool(data.get("completed", False)),
        )

    def save(self, path: Path) -> None:
        payload = {
            "anchor_date": self.anchor_date.isoformat(),
            "last_end_date": self.last_end_date.isoformat(),
            "earliest_ingested": self.earliest_ingested.isoformat()
            if self.earliest_ingested
            else None,
            "completed": self.completed,
        }
        path.write_text(json.dumps(payload, indent=2))


def init_state(path: Path, start_date: date) -> BackfillState:
    state = BackfillState(
        anchor_date=start_date,
        last_end_date=start_date,
        earliest_ingested=None,
        completed=False,
    )
    state.save(path)
    return state


def get_earliest_paper_date(config: Neo4jConfig) -> date | None:
    """Return the earliest published_date stored in Neo4j, if any."""

    driver = GraphDatabase.driver(config.uri, auth=(config.username, config.password))
    try:
        with driver.session(database=config.database) as session:
            record = session.execute_read(
                lambda tx: tx.run(
                    "MATCH (p:Paper) RETURN min(p.published_date) AS earliest"
                ).single()
            )
    except Neo4jError as exc:
        logging.warning("Unable to inspect Neo4j for existing papers: %s", exc)
        return None
    finally:
        driver.close()

    if not record:
        return None

    earliest_value = record.get("earliest")
    if earliest_value is None:
        return None

    if isinstance(earliest_value, date):
        return earliest_value

    if isinstance(earliest_value, Neo4jDate):
        return earliest_value.to_native()

    if hasattr(earliest_value, "to_native"):
        return earliest_value.to_native()

    if isinstance(earliest_value, str):
        return datetime.strptime(earliest_value, "%Y-%m-%d").date()

    logging.warning("Unexpected type for earliest published_date: %r", earliest_value)
    return None


def align_state_with_graph(
    state: BackfillState,
    config: Neo4jConfig,
    target_date: date,
    state_path: Path,
) -> None:
    """Adjust state to skip already ingested data in Neo4j."""

    earliest = get_earliest_paper_date(config)
    if earliest is None:
        return

    logging.info("Existing Neo4j data goes back to %s.", earliest.isoformat())

    state.earliest_ingested = (
        earliest
        if state.earliest_ingested is None
        else min(state.earliest_ingested, earliest)
    )

    desired_last_end = earliest - timedelta(days=1)
    if desired_last_end < state.last_end_date:
        state.last_end_date = desired_last_end

    if earliest <= target_date:
        state.completed = True
        state.save(state_path)
        logging.info(
            "Neo4j already contains papers through %s; target window satisfied.",
            target_date.isoformat(),
        )
    else:
        state.completed = False
        state.save(state_path)


def build_daily_query(target_date: date) -> str:
    start_str = target_date.strftime("%Y%m%d0000")
    end_str = target_date.strftime("%Y%m%d2359")
    category_query = " OR ".join(f"cat:{cat}" for cat in AI_CATEGORIES)
    return f"({category_query}) AND submittedDate:[{start_str} TO {end_str}]"


def fetch_batch(
    client: arxiv.Client,
    end_date: date,
    target_date: date,
    limit: int,
) -> tuple[list[dict[str, Any]], date | None, bool]:
    """Fetch up to `limit` papers walking backward from end_date to target_date."""
    papers: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    oldest_date: date | None = None

    current_date = end_date

    while current_date >= target_date:
        logging.info("Fetching papers for %s", current_date.isoformat())
        search = arxiv.Search(
            query=build_daily_query(current_date),
            max_results=1000,
            sort_by=arxiv.SortCriterion.SubmittedDate,
            sort_order=arxiv.SortOrder.Descending,
        )

        results_iter = client.results(search)

        while True:
            if len(papers) >= limit:
                logging.info("Reached batch limit of %s papers.", limit)
                if oldest_date is None:
                    oldest_date = current_date
                return papers, oldest_date, False

            try:
                result = next(results_iter)
            except StopIteration:
                break
            except Exception as exc:
                UnexpectedEmptyPage = getattr(arxiv, "UnexpectedEmptyPage", None)
                UnexpectedEmptyPageError = getattr(arxiv, "UnexpectedEmptyPageError", None)
                handled = (
                    UnexpectedEmptyPage and isinstance(exc, UnexpectedEmptyPage)
                ) or (
                    UnexpectedEmptyPageError and isinstance(exc, UnexpectedEmptyPageError)
                ) or "unexpectedly empty" in str(exc).lower()

                if handled:
                    logging.warning(
                        "Encountered an unexpectedly empty page on %s; advancing to previous day.",
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

            published_date = datetime.strptime(paper_dict["published_date"], "%Y-%m-%d").date()
            if oldest_date is None or published_date < oldest_date:
                oldest_date = published_date

        if len(papers) >= limit:
            return papers, oldest_date, False

        current_date -= timedelta(days=1)

    return papers, oldest_date, True


def serialize_result(result: arxiv.Result) -> dict[str, Any]:
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


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Batch backfill arXiv AI papers into Neo4j until a lookback window is covered.",
    )
    parser.add_argument(
        "--start-date",
        type=lambda s: datetime.strptime(s, "%Y-%m-%d").date(),
        default=date.today(),
        help="Anchor date to start backfill from (YYYY-MM-DD, default: today).",
    )
    parser.add_argument(
        "--lookback-days",
        type=int,
        default=DEFAULT_LOOKBACK_DAYS,
        help=f"Number of days to cover (default: {DEFAULT_LOOKBACK_DAYS}).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=DEFAULT_LIMIT,
        help=f"Papers to ingest per run (default: {DEFAULT_LIMIT}).",
    )
    parser.add_argument(
        "--state-file",
        type=Path,
        default=Path(__file__).with_name(STATE_FILENAME),
        help=f"Path to resume state JSON (default: {STATE_FILENAME} beside script).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch data but do not write to Neo4j.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Ignore existing state and restart from the anchor date.",
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

    state_path = args.state_file

    if args.reset and state_path.exists():
        state_path.unlink()
        logging.info("Removed existing state file: %s", state_path)

    state = BackfillState.load(state_path)
    if state is None:
        logging.info("Initializing new backfill state anchored at %s.", args.start_date)
        state = init_state(state_path, args.start_date)
    elif args.reset:
        state = init_state(state_path, args.start_date)
    else:
        if state.anchor_date != args.start_date:
            logging.info(
                "Ignoring provided start date (%s) and resuming from saved anchor (%s).",
                args.start_date,
                state.anchor_date,
            )

    target_date = state.anchor_date - timedelta(days=args.lookback_days)

    try:
        neo4j_config: Neo4jConfig = read_config_from_env()
    except ConfigurationError as exc:
        logging.error(str(exc))
        raise SystemExit(1) from exc

    align_state_with_graph(state, neo4j_config, target_date, state_path)

    if state.completed:
        logging.info(
            "Backfill already completed down to %s. Use --reset to start over if needed.",
            target_date.isoformat(),
        )
        return

    if state.last_end_date < target_date:
        logging.info(
            "Already processed past target date (%s). Marking as complete.",
            target_date.isoformat(),
        )
        state.completed = True
        state.save(state_path)
        return

    client = arxiv.Client(
        page_size=100,
        delay_seconds=3,
        num_retries=3,
    )

    logging.info(
        "Starting batch from %s down to target %s (limit %s).",
        state.last_end_date.isoformat(),
        target_date.isoformat(),
        args.limit,
    )

    papers, oldest_date, hit_target = fetch_batch(
        client=client,
        end_date=state.last_end_date,
        target_date=target_date,
        limit=args.limit,
    )

    if not papers:
        logging.info("No new papers fetched in this batch.")
        if state.last_end_date <= target_date:
            state.completed = True
        state.save(state_path)
        return

    logging.info("Fetched %s papers (oldest published date: %s).", len(papers), oldest_date)

    if not args.dry_run:
        load_papers_into_neo4j(neo4j_config, papers)
    else:
        logging.info("Dry run enabled; skipping Neo4j write.")

    # Update state for next batch.
    if oldest_date is None:
        oldest_date = state.last_end_date

    state.earliest_ingested = (
        oldest_date
        if state.earliest_ingested is None
        else min(state.earliest_ingested, oldest_date)
    )

    next_last_end = oldest_date - timedelta(days=1)
    state.last_end_date = next_last_end

    reached_target = (
        (oldest_date is not None and oldest_date <= target_date)
        or next_last_end < target_date
    )

    if reached_target:
        state.completed = True
        logging.info("Reached target lookback window ending %s.", target_date.isoformat())
    else:
        state.completed = False

    state.save(state_path)
    logging.info(
        "Batch complete. Next run will start from %s.",
        state.last_end_date.isoformat(),
    )


if __name__ == "__main__":
    main()
