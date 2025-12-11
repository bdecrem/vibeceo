"""
Hacker News paper/research fetcher.

Finds research-related posts from HN front page and recent submissions.
"""

import asyncio
import aiohttp
from typing import List, Dict, Any


HN_API_BASE = "https://hacker-news.firebaseio.com/v0"


async def fetch_trending(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Fetch research-related items from Hacker News.

    Args:
        config: Configuration dict with hackernews settings

    Returns:
        List of paper dicts extracted from HN posts
    """
    hn_config = config["sources"]["hackernews"]
    min_score = hn_config["min_score"]
    keywords = hn_config["keywords"]

    papers = []

    # TODO: Implement actual HN API calls
    # async with aiohttp.ClientSession() as session:
    #     # Fetch top stories
    #     async with session.get(f"{HN_API_BASE}/topstories.json") as resp:
    #         story_ids = await resp.json()
    #
    #     # Fetch story details (limit to top 100)
    #     for story_id in story_ids[:100]:
    #         async with session.get(f"{HN_API_BASE}/item/{story_id}.json") as resp:
    #             story = await resp.json()
    #
    #         if story.get("score", 0) < min_score:
    #             continue
    #
    #         title = story.get("title", "").lower()
    #         url = story.get("url", "")
    #
    #         # Check if research-related
    #         is_research = any(kw in title or kw in url for kw in keywords)
    #
    #         if is_research and "arxiv.org" in url:
    #             # Extract arXiv ID and fetch paper
    #             arxiv_id = extract_arxiv_id(url)
    #             papers.append({
    #                 "id": f"hn-{story_id}",
    #                 "arxiv_id": arxiv_id,
    #                 "title": story["title"],
    #                 "source": "hackernews",
    #                 "url": url,
    #                 "metadata": {
    #                     "hn_id": story_id,
    #                     "hn_score": story["score"],
    #                     "hn_comments": story.get("descendants", 0),
    #                 }
    #             })

    print(f"[hackernews] Would fetch posts with min_score={min_score}, keywords={keywords}")

    return papers


def extract_arxiv_id(url: str) -> str:
    """Extract arXiv ID from URL."""
    # Handle various arXiv URL formats
    # https://arxiv.org/abs/2301.00001
    # https://arxiv.org/pdf/2301.00001.pdf
    import re
    match = re.search(r'(\d{4}\.\d{4,5})', url)
    return match.group(1) if match else None
