"""
Reddit research fetcher.

Fetches research posts from ML/AI subreddits.
"""

import asyncio
from typing import List, Dict, Any

# TODO: pip install asyncpraw
# import asyncpraw


async def fetch_top(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Fetch top research posts from configured subreddits.

    Args:
        config: Configuration dict with reddit settings

    Returns:
        List of paper dicts extracted from Reddit posts
    """
    reddit_config = config["sources"]["reddit"]
    subreddits = reddit_config["subreddits"]
    min_upvotes = reddit_config["min_upvotes"]

    papers = []

    # TODO: Implement actual Reddit API calls
    # reddit = asyncpraw.Reddit(
    #     client_id=os.environ["REDDIT_CLIENT_ID"],
    #     client_secret=os.environ["REDDIT_CLIENT_SECRET"],
    #     user_agent="i5-podcast/0.1"
    # )
    #
    # for subreddit_name in subreddits:
    #     subreddit = await reddit.subreddit(subreddit_name)
    #
    #     async for post in subreddit.hot(limit=50):
    #         if post.score < min_upvotes:
    #             continue
    #
    #         # Check if links to arXiv
    #         if "arxiv.org" in post.url:
    #             arxiv_id = extract_arxiv_id(post.url)
    #             papers.append({
    #                 "id": f"reddit-{post.id}",
    #                 "arxiv_id": arxiv_id,
    #                 "title": post.title,
    #                 "source": "reddit",
    #                 "url": post.url,
    #                 "metadata": {
    #                     "subreddit": subreddit_name,
    #                     "reddit_score": post.score,
    #                     "reddit_comments": post.num_comments,
    #                     "reddit_id": post.id,
    #                 }
    #             })
    #
    # await reddit.close()

    print(f"[reddit] Would fetch from subreddits={subreddits}, min_upvotes={min_upvotes}")

    return papers


def extract_arxiv_id(url: str) -> str:
    """Extract arXiv ID from URL."""
    import re
    match = re.search(r'(\d{4}\.\d{4,5})', url)
    return match.group(1) if match else None
