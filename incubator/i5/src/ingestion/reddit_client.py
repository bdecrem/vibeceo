"""
Reddit research fetcher.

Fetches research posts from ML/AI subreddits using public JSON API (no auth needed).
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


# Default settings
DEFAULT_SUBREDDITS = [
    "MachineLearning",
    "LocalLLaMA",
    "artificial",
    "deeplearning",
    "LanguageTechnology",
]
DEFAULT_MIN_UPVOTES = 50


async def fetch_top(ingestion_config: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Fetch top research posts from configured subreddits.

    Uses Reddit's public JSON API (no auth required for read-only access).

    Args:
        ingestion_config: Optional configuration dict with reddit settings

    Returns:
        List of paper dicts extracted from Reddit posts
    """
    # Get config values
    if ingestion_config and "sources" in ingestion_config:
        reddit_config = ingestion_config["sources"].get("reddit", {})
        subreddits = reddit_config.get("subreddits", DEFAULT_SUBREDDITS)
        min_upvotes = reddit_config.get("min_upvotes", DEFAULT_MIN_UPVOTES)
    else:
        subreddits = DEFAULT_SUBREDDITS
        min_upvotes = DEFAULT_MIN_UPVOTES

    if app_config.VERBOSE:
        print(f"[reddit] Fetching from subreddits: {subreddits}")

    papers = []

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; Tokenshots/1.0; +https://tokentank.io)"
    }

    try:
        async with httpx.AsyncClient(timeout=30.0, headers=headers) as client:
            for subreddit_name in subreddits:
                try:
                    # Fetch hot posts (public JSON endpoint)
                    url = f"https://www.reddit.com/r/{subreddit_name}/hot.json?limit=50"
                    resp = await client.get(url)

                    if resp.status_code != 200:
                        if app_config.VERBOSE:
                            print(f"[reddit] Error fetching r/{subreddit_name}: {resp.status_code}")
                        continue

                    data = resp.json()
                    posts = data.get("data", {}).get("children", [])

                    for post_data in posts:
                        post = post_data.get("data", {})

                        score = post.get("score", 0)
                        if score < min_upvotes:
                            continue

                        title = post.get("title", "")
                        url_link = post.get("url", "")
                        selftext = post.get("selftext", "")
                        post_id = post.get("id", "")

                        if not title or not post_id:
                            continue

                        # Extract arXiv ID if present in URL or text
                        arxiv_id = extract_arxiv_id(url_link) or extract_arxiv_id(selftext)

                        # Build abstract from selftext or title
                        abstract = selftext[:2000] if selftext else f"Reddit post: {title}"

                        paper = {
                            "id": f"reddit-{post_id}",
                            "source_type": "reddit",
                            "source_id": post_id,
                            "title": title,
                            "abstract": abstract,
                            "url": url_link if url_link.startswith("http") else f"https://reddit.com{post.get('permalink', '')}",
                            "metadata": {
                                "subreddit": subreddit_name,
                                "reddit_score": score,
                                "reddit_comments": post.get("num_comments", 0),
                                "reddit_id": post_id,
                            }
                        }

                        if arxiv_id:
                            paper["arxiv_id"] = arxiv_id

                        papers.append(paper)

                    if app_config.VERBOSE:
                        sub_count = len([p for p in papers if p["metadata"]["subreddit"] == subreddit_name])
                        print(f"[reddit] r/{subreddit_name}: found {sub_count} posts")

                    # Rate limit - be nice to Reddit
                    await asyncio.sleep(1)

                except Exception as e:
                    if app_config.VERBOSE:
                        print(f"[reddit] Error processing r/{subreddit_name}: {e}")
                    continue

        if app_config.VERBOSE:
            print(f"[reddit] Total: {len(papers)} research posts")

    except Exception as e:
        print(f"[reddit] Error: {e}")

    return papers


def extract_arxiv_id(text: str) -> Optional[str]:
    """
    Extract arXiv ID from text or URL.

    Handles:
    - https://arxiv.org/abs/2301.00001
    - https://arxiv.org/pdf/2301.00001.pdf
    - Plain text mentions of arxiv IDs
    """
    if not text:
        return None

    patterns = [
        r'arxiv\.org/(?:abs|pdf)/(\d{4}\.\d{4,5})(?:v\d+)?',
        r'ar5iv\.org/(?:abs|html)/(\d{4}\.\d{4,5})(?:v\d+)?',
        r'\b(\d{4}\.\d{4,5})(?:v\d+)?(?:\.pdf)?',
    ]

    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
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
            # Use arxiv abstract if Reddit selftext is short
            if len(paper.get("abstract", "")) < 200:
                paper["abstract"] = arxiv_paper["abstract"]
            paper["authors"] = arxiv_paper.get("authors", [])
    except Exception as e:
        if app_config.VERBOSE:
            print(f"[reddit] Could not enrich {arxiv_id}: {e}")

    return paper


# Test
if __name__ == "__main__":
    async def test():
        papers = await fetch_top()
        print(f"\nFound {len(papers)} research posts")
        for p in papers[:5]:
            arxiv_tag = f" [arxiv:{p.get('arxiv_id')}]" if p.get('arxiv_id') else ""
            print(f"  - r/{p['metadata']['subreddit']}: {p['title'][:50]}... (score={p['metadata']['reddit_score']}){arxiv_tag}")

    asyncio.run(test())
