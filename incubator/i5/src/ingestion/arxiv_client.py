"""
arXiv paper fetcher.

Fetches daily papers from configured arXiv categories.
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path
import sys

# Add parent for config import
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config as app_config

import arxiv


# Default categories for AI/ML research
DEFAULT_CATEGORIES = [
    "cs.AI",    # Artificial Intelligence
    "cs.LG",    # Machine Learning
    "cs.CL",    # Computation and Language (NLP)
    "cs.CV",    # Computer Vision
    "cs.NE",    # Neural and Evolutionary Computing
    "stat.ML",  # Machine Learning (Statistics)
]

DEFAULT_DAILY_LIMIT = 200


async def fetch_daily(ingestion_config: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Fetch papers from arXiv published in the last 24-48 hours.

    Args:
        ingestion_config: Optional configuration dict with arxiv settings

    Returns:
        List of paper dicts with id, title, abstract, source, metadata
    """
    # Get config values
    if ingestion_config and "sources" in ingestion_config:
        arxiv_config = ingestion_config["sources"].get("arxiv", {})
        categories = arxiv_config.get("categories", DEFAULT_CATEGORIES)
        daily_limit = arxiv_config.get("daily_limit", DEFAULT_DAILY_LIMIT)
    else:
        categories = DEFAULT_CATEGORIES
        daily_limit = DEFAULT_DAILY_LIMIT

    if app_config.VERBOSE:
        print(f"[arxiv] Fetching up to {daily_limit} papers from categories: {categories}")

    papers = []

    # Build query for all categories
    category_query = " OR ".join([f"cat:{cat}" for cat in categories])

    try:
        client = arxiv.Client()
        search = arxiv.Search(
            query=category_query,
            max_results=daily_limit,
            sort_by=arxiv.SortCriterion.SubmittedDate,
            sort_order=arxiv.SortOrder.Descending,
        )

        for result in client.results(search):
            # Extract arxiv ID from entry_id
            arxiv_id = result.entry_id.split("/")[-1]
            # Remove version suffix for consistency
            arxiv_id_base = arxiv_id.split("v")[0] if "v" in arxiv_id else arxiv_id

            papers.append({
                "id": f"arxiv-{arxiv_id_base}",
                "source_type": "arxiv",
                "source_id": arxiv_id,
                "arxiv_id": arxiv_id_base,
                "title": result.title.replace("\n", " ").strip(),
                "abstract": result.summary.replace("\n", " ").strip(),
                "url": result.pdf_url,
                "authors": [a.name for a in result.authors[:10]],  # Limit to 10 authors
                "published": result.published.isoformat() if result.published else None,
                "metadata": {
                    "primary_category": result.primary_category,
                    "categories": result.categories,
                }
            })

        if app_config.VERBOSE:
            print(f"[arxiv] Fetched {len(papers)} papers")

    except Exception as e:
        print(f"[arxiv] Error fetching papers: {e}")

    return papers


async def fetch_paper(paper_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a specific paper by arXiv ID.

    Args:
        paper_id: arXiv paper ID (e.g., "2301.00001" or "2301.00001v2")

    Returns:
        Paper dict with full details, or None if not found
    """
    try:
        search = arxiv.Search(id_list=[paper_id])
        client = arxiv.Client()

        for result in client.results(search):
            arxiv_id = result.entry_id.split("/")[-1]
            arxiv_id_base = arxiv_id.split("v")[0] if "v" in arxiv_id else arxiv_id

            return {
                "id": f"arxiv-{arxiv_id_base}",
                "source_type": "arxiv",
                "source_id": arxiv_id,
                "arxiv_id": arxiv_id_base,
                "title": result.title.replace("\n", " ").strip(),
                "abstract": result.summary.replace("\n", " ").strip(),
                "url": result.pdf_url,
                "authors": [a.name for a in result.authors],
                "published": result.published.isoformat() if result.published else None,
                "metadata": {
                    "primary_category": result.primary_category,
                    "categories": result.categories,
                }
            }

    except Exception as e:
        print(f"[arxiv] Error fetching paper {paper_id}: {e}")

    return None


# Test
if __name__ == "__main__":
    import asyncio

    async def test():
        papers = await fetch_daily()
        print(f"\nFetched {len(papers)} papers")
        if papers:
            print(f"\nFirst paper: {papers[0]['title'][:80]}...")

    asyncio.run(test())
