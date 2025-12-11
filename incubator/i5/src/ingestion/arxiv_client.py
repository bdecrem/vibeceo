"""
arXiv paper fetcher.

Fetches daily papers from configured arXiv categories.
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any

# TODO: pip install arxiv
# import arxiv


async def fetch_daily(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Fetch papers from arXiv published in the last 24 hours.

    Args:
        config: Configuration dict with arxiv settings

    Returns:
        List of paper dicts with id, title, abstract, source, metadata
    """
    arxiv_config = config["sources"]["arxiv"]
    categories = arxiv_config["categories"]
    daily_limit = arxiv_config["daily_limit"]

    papers = []

    # Build query for all categories
    category_query = " OR ".join([f"cat:{cat}" for cat in categories])

    # TODO: Implement actual arXiv API call
    # client = arxiv.Client()
    # search = arxiv.Search(
    #     query=category_query,
    #     max_results=daily_limit,
    #     sort_by=arxiv.SortCriterion.SubmittedDate,
    #     sort_order=arxiv.SortOrder.Descending,
    # )
    #
    # for result in client.results(search):
    #     papers.append({
    #         "id": result.entry_id.split("/")[-1],
    #         "title": result.title,
    #         "abstract": result.summary,
    #         "source": "arxiv",
    #         "url": result.pdf_url,
    #         "authors": [a.name for a in result.authors],
    #         "categories": result.categories,
    #         "published": result.published.isoformat(),
    #         "metadata": {
    #             "primary_category": result.primary_category,
    #         }
    #     })

    print(f"[arxiv] Would fetch {daily_limit} papers from categories: {categories}")

    return papers


async def fetch_paper(paper_id: str) -> Dict[str, Any]:
    """
    Fetch a specific paper by arXiv ID.

    Args:
        paper_id: arXiv paper ID (e.g., "2301.00001")

    Returns:
        Paper dict with full details
    """
    # TODO: Implement single paper fetch
    pass
