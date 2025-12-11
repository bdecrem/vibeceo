"""
Hacker News paper/research fetcher.

Finds research-related posts from HN front page and recent submissions.
"""

import asyncio
import re
from typing import List, Dict, Any, Optional
from pathlib import Path
import sys

# Add parent for config import
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config as app_config

import httpx


HN_API_BASE = "https://hacker-news.firebaseio.com/v0"

# Default settings
DEFAULT_MIN_SCORE = 20
DEFAULT_KEYWORDS = [
    "arxiv", "paper", "research", "llm", "gpt", "claude",
    "transformer", "neural", "machine learning", "ai",
    "diffusion", "language model", "embedding"
]


async def fetch_trending(ingestion_config: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Fetch research-related items from Hacker News.

    Args:
        ingestion_config: Optional configuration dict with hackernews settings

    Returns:
        List of paper dicts extracted from HN posts
    """
    # Get config values
    if ingestion_config and "sources" in ingestion_config:
        hn_config = ingestion_config["sources"].get("hackernews", {})
        min_score = hn_config.get("min_score", DEFAULT_MIN_SCORE)
        keywords = hn_config.get("keywords", DEFAULT_KEYWORDS)
    else:
        min_score = DEFAULT_MIN_SCORE
        keywords = DEFAULT_KEYWORDS

    if app_config.VERBOSE:
        print(f"[hackernews] Fetching posts with min_score={min_score}")

    papers = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Fetch top stories and new stories
            top_resp = await client.get(f"{HN_API_BASE}/topstories.json")
            new_resp = await client.get(f"{HN_API_BASE}/newstories.json")

            top_ids = top_resp.json()[:100] if top_resp.status_code == 200 else []
            new_ids = new_resp.json()[:100] if new_resp.status_code == 200 else []

            # Combine and dedupe
            story_ids = list(dict.fromkeys(top_ids + new_ids))[:150]

            if app_config.VERBOSE:
                print(f"[hackernews] Checking {len(story_ids)} stories...")

            # Fetch story details
            for story_id in story_ids:
                try:
                    resp = await client.get(f"{HN_API_BASE}/item/{story_id}.json")
                    if resp.status_code != 200:
                        continue

                    story = resp.json()
                    if not story:
                        continue

                    score = story.get("score", 0)
                    if score < min_score:
                        continue

                    title = story.get("title", "")
                    url = story.get("url", "")

                    if not title or not url:
                        continue

                    # Check if research-related
                    title_lower = title.lower()
                    url_lower = url.lower()
                    is_research = any(
                        kw in title_lower or kw in url_lower
                        for kw in keywords
                    )

                    if not is_research:
                        continue

                    # Extract arXiv ID if present
                    arxiv_id = extract_arxiv_id(url)

                    # For non-arxiv research posts, we still include them
                    paper = {
                        "id": f"hn-{story_id}",
                        "source_type": "hackernews",
                        "source_id": str(story_id),
                        "title": title,
                        "abstract": f"Hacker News discussion: {title}",  # Will be enriched if arxiv
                        "url": url,
                        "metadata": {
                            "hn_id": story_id,
                            "hn_score": score,
                            "hn_comments": story.get("descendants", 0),
                        }
                    }

                    if arxiv_id:
                        paper["arxiv_id"] = arxiv_id

                    papers.append(paper)

                except Exception as e:
                    if app_config.VERBOSE:
                        print(f"[hackernews] Error fetching story {story_id}: {e}")
                    continue

        if app_config.VERBOSE:
            print(f"[hackernews] Found {len(papers)} research-related posts")

    except Exception as e:
        print(f"[hackernews] Error: {e}")

    return papers


def extract_arxiv_id(url: str) -> Optional[str]:
    """
    Extract arXiv ID from URL.

    Handles:
    - https://arxiv.org/abs/2301.00001
    - https://arxiv.org/pdf/2301.00001.pdf
    - https://ar5iv.org/abs/2301.00001
    - https://huggingface.co/papers/2301.00001
    """
    if not url:
        return None

    patterns = [
        r'arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5})(?:v\d+)?',
        r'ar5iv\.org/(?:abs|html)/(\d{4}\.\d{4,5})(?:v\d+)?',
        r'huggingface\.co/papers/(\d{4}\.\d{4,5})',
        r'\b(\d{4}\.\d{4,5})(?:v\d+)?\.pdf',
    ]

    for pattern in patterns:
        match = re.search(pattern, url, re.IGNORECASE)
        if match:
            return match.group(1)

    return None


async def enrich_with_arxiv(paper: Dict[str, Any]) -> Dict[str, Any]:
    """
    If paper has an arxiv_id, fetch the full abstract from arxiv.
    """
    arxiv_id = paper.get("arxiv_id")
    if not arxiv_id:
        return paper

    try:
        from . import arxiv_client
        arxiv_paper = await arxiv_client.fetch_paper(arxiv_id)
        if arxiv_paper:
            paper["abstract"] = arxiv_paper["abstract"]
            paper["authors"] = arxiv_paper.get("authors", [])
    except Exception as e:
        if app_config.VERBOSE:
            print(f"[hackernews] Could not enrich {arxiv_id}: {e}")

    return paper


# Test
if __name__ == "__main__":
    async def test():
        papers = await fetch_trending()
        print(f"\nFound {len(papers)} research posts")
        for p in papers[:5]:
            arxiv_tag = f" [arxiv:{p.get('arxiv_id')}]" if p.get('arxiv_id') else ""
            print(f"  - {p['title'][:60]}... (score={p['metadata']['hn_score']}){arxiv_tag}")

    asyncio.run(test())
