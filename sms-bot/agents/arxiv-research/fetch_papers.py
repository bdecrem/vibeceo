#!/usr/bin/env python3
"""
Stage 1: Fetch ALL AI/ML papers from arXiv.org

This script fetches all papers from arXiv categories related to AI/ML
that were submitted in the last 24 hours. It respects arXiv's rate limit
of 1 request per 3 seconds.

Output: JSON file with complete paper list including all metadata and authors
"""

import argparse
import json
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any

import arxiv


# arXiv categories for AI/ML papers
AI_CATEGORIES = [
    "cs.AI",  # Artificial Intelligence
    "cs.LG",  # Machine Learning
    "cs.CV",  # Computer Vision
    "cs.CL",  # Computation and Language (NLP)
    "stat.ML",  # Statistics - Machine Learning
]


def build_arxiv_query(target_date: datetime, lookback_days: int = 3) -> str:
    """
    Build arXiv API query for AI/ML papers submitted in last N days.

    Format: (cat:cs.AI OR cat:cs.LG ...) AND submittedDate:[start TO end]

    We fetch the last 3 days to ensure we get papers even if today's batch
    hasn't been published yet. Papers are deduped by arxiv_id.
    """
    # Query papers from last N days
    end_date = target_date.strftime("%Y%m%d2359")
    start_date = (target_date - timedelta(days=lookback_days)).strftime("%Y%m%d0000")

    category_query = " OR ".join([f"cat:{cat}" for cat in AI_CATEGORIES])
    date_query = f"submittedDate:[{start_date} TO {end_date}]"

    return f"({category_query}) AND {date_query}"


def extract_paper_metadata(result: arxiv.Result) -> dict[str, Any]:
    """Extract all relevant metadata from an arXiv paper result."""

    # Extract arxiv_id (remove version suffix for consistency)
    arxiv_id = result.entry_id.split("/")[-1]  # e.g., "2501.12345v1"

    # Extract authors as list of dicts with name and affiliation
    authors = []
    for author in result.authors:
        authors.append({
            "name": author.name,
            # Note: arxiv API doesn't provide affiliations, set to None
            # We can enrich this later via other sources
            "affiliation": None,
        })

    # Extract categories as list
    categories = result.categories

    # Build URLs
    arxiv_url = result.entry_id
    pdf_url = result.pdf_url

    return {
        "arxiv_id": arxiv_id,
        "title": result.title,
        "abstract": result.summary,
        "authors": authors,
        "categories": categories,
        "published_date": result.published.strftime("%Y-%m-%d"),
        "arxiv_url": arxiv_url,
        "pdf_url": pdf_url,
        # Additional metadata for potential future use
        "primary_category": result.primary_category,
        "updated_date": result.updated.strftime("%Y-%m-%d"),
    }


def fetch_papers(target_date: datetime, max_results: int = 1000) -> list[dict[str, Any]]:
    """
    Fetch all AI/ML papers from arXiv for the target date.

    Respects arXiv rate limit: 1 request per 3 seconds.
    """
    query = build_arxiv_query(target_date)
    lookback_start = target_date - timedelta(days=3)

    print(f"Fetching papers with query: {query}")
    print(f"Date range: {lookback_start.strftime('%Y-%m-%d')} to {target_date.strftime('%Y-%m-%d')} (last 3 days)")

    # Configure arXiv client with rate limiting
    client = arxiv.Client(
        page_size=100,  # Fetch 100 results per API call
        delay_seconds=3,  # Required by arXiv TOS: 1 request per 3 seconds
        num_retries=3,  # Retry failed requests
    )

    # Create search
    search = arxiv.Search(
        query=query,
        max_results=max_results,
        sort_by=arxiv.SortCriterion.SubmittedDate,
        sort_order=arxiv.SortOrder.Descending,
    )

    papers = []
    seen_ids = set()  # Track arxiv_ids to deduplicate
    count = 0

    print("Starting to fetch papers (respecting 3-second rate limit)...")

    # Iterate through results (automatically handles pagination and rate limiting)
    for result in client.results(search):
        paper = extract_paper_metadata(result)

        # Deduplicate by arxiv_id (papers can have multiple versions)
        arxiv_id = paper["arxiv_id"]
        if arxiv_id in seen_ids:
            continue

        seen_ids.add(arxiv_id)
        papers.append(paper)
        count += 1

        if count % 10 == 0:
            print(f"Fetched {count} papers...")

    print(f"\nTotal papers fetched: {len(papers)} (after deduplication)")
    return papers


def save_to_json(papers: list[dict[str, Any]], output_path: Path, target_date: datetime) -> None:
    """Save papers to JSON file with metadata."""

    output_data = {
        "fetch_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "target_date": target_date.strftime("%Y-%m-%d"),
        "total_papers": len(papers),
        "categories": AI_CATEGORIES,
        "papers": papers,
    }

    output_path.write_text(json.dumps(output_data, indent=2))
    print(f"\nSaved {len(papers)} papers to: {output_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch all AI/ML papers from arXiv for a given date"
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory to save output JSON file",
    )
    parser.add_argument(
        "--date",
        help="Target date in YYYY-MM-DD format (defaults to today)",
    )
    parser.add_argument(
        "--max-results",
        type=int,
        default=1000,
        help="Maximum number of papers to fetch (default: 1000)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Parse target date
    if args.date:
        try:
            target_date = datetime.strptime(args.date, "%Y-%m-%d")
        except ValueError:
            print(f"Error: Invalid date format '{args.date}'. Use YYYY-MM-DD")
            return 1
    else:
        target_date = datetime.now()

    # Ensure output directory exists
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    # Create output filename
    date_str = target_date.strftime("%Y-%m-%d")
    output_path = output_dir / f"arxiv_papers_{date_str}.json"

    try:
        # Fetch papers
        papers = fetch_papers(target_date, args.max_results)

        if not papers:
            print("Warning: No papers found for this date")
            # Still create the output file with empty papers list

        # Save to JSON
        save_to_json(papers, output_path, target_date)

        # Output success message for TypeScript wrapper to parse
        print(json.dumps({
            "status": "success",
            "output_file": str(output_path),
            "papers_count": len(papers),
            "date": date_str,
        }))

        return 0

    except Exception as exc:
        print(json.dumps({
            "status": "error",
            "error": str(exc),
        }))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
