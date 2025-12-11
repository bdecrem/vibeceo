"""
Backlog sampler.

Samples papers from the historical backlog database to surface
older but relevant research.
"""

import asyncio
import random
from pathlib import Path
from typing import List, Dict, Any

# TODO: pip install aiosqlite
# import aiosqlite


async def sample(config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Sample papers from the backlog database.

    Uses weighted random sampling to surface papers that:
    - Haven't been featured recently
    - Have good historical engagement signals
    - Complement today's fresh picks

    Args:
        config: Configuration dict with backlog settings

    Returns:
        List of paper dicts from backlog
    """
    backlog_config = config["sources"]["backlog"]
    daily_sample = backlog_config["daily_sample"]
    db_path = backlog_config["database_path"]

    papers = []

    # TODO: Implement actual backlog sampling
    # if not Path(db_path).exists():
    #     print(f"[backlog] Database not found: {db_path}")
    #     return []
    #
    # async with aiosqlite.connect(db_path) as db:
    #     # Get papers not featured in last 30 days
    #     cursor = await db.execute("""
    #         SELECT id, title, abstract, url, categories, score
    #         FROM papers
    #         WHERE last_featured IS NULL
    #            OR last_featured < date('now', '-30 days')
    #         ORDER BY RANDOM()
    #         LIMIT ?
    #     """, (daily_sample * 2,))  # Fetch 2x to allow filtering
    #
    #     rows = await cursor.fetchall()
    #
    #     for row in rows[:daily_sample]:
    #         papers.append({
    #             "id": f"backlog-{row[0]}",
    #             "title": row[1],
    #             "abstract": row[2],
    #             "source": "backlog",
    #             "url": row[3],
    #             "metadata": {
    #                 "categories": row[4],
    #                 "historical_score": row[5],
    #             }
    #         })

    print(f"[backlog] Would sample {daily_sample} papers from {db_path}")

    return papers


async def mark_featured(paper_ids: List[str], db_path: str):
    """
    Mark papers as featured so they won't be re-sampled soon.

    Args:
        paper_ids: List of paper IDs that were featured
        db_path: Path to backlog database
    """
    # TODO: Implement marking logic
    # async with aiosqlite.connect(db_path) as db:
    #     for paper_id in paper_ids:
    #         # Strip "backlog-" prefix
    #         actual_id = paper_id.replace("backlog-", "")
    #         await db.execute("""
    #             UPDATE papers
    #             SET last_featured = date('now')
    #             WHERE id = ?
    #         """, (actual_id,))
    #     await db.commit()
    pass
