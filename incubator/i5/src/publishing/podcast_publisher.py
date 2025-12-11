"""
Podcast publishing to Transistor.fm.

Handles episode upload and RSS feed management.
"""

import asyncio
from pathlib import Path
from typing import List, Dict, Any

# TODO: pip install aiohttp
# import aiohttp


TRANSISTOR_API_BASE = "https://api.transistor.fm/v1"


async def publish(
    audio_path: Path,
    papers: List[Dict[str, Any]],
    date: str,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Publish episode to Transistor.fm.

    Args:
        audio_path: Path to episode audio file
        papers: List of papers featured in episode
        date: Episode date
        config: Configuration dict

    Returns:
        Episode metadata including URL
    """
    # Build episode metadata
    title = f"i5 - {date}"
    description = build_description(papers, date)

    print(f"[podcast] Would publish episode: {title}")
    print(f"[podcast] Audio: {audio_path}")
    print(f"[podcast] Description length: {len(description)} chars")

    # TODO: Implement Transistor API call
    # api_key = os.environ["TRANSISTOR_API_KEY"]
    #
    # async with aiohttp.ClientSession() as session:
    #     # First, authorize the upload
    #     headers = {"x-api-key": api_key}
    #
    #     # Get upload URL
    #     async with session.get(
    #         f"{TRANSISTOR_API_BASE}/episodes/authorize_upload",
    #         headers=headers,
    #         params={"filename": audio_path.name}
    #     ) as resp:
    #         upload_data = await resp.json()
    #
    #     # Upload audio file
    #     upload_url = upload_data['data']['attributes']['upload_url']
    #     audio_url = upload_data['data']['attributes']['audio_url']
    #
    #     with open(audio_path, 'rb') as f:
    #         async with session.put(upload_url, data=f.read()) as resp:
    #             pass
    #
    #     # Create episode
    #     episode_data = {
    #         "episode": {
    #             "show_id": os.environ["TRANSISTOR_SHOW_ID"],
    #             "title": title,
    #             "description": description,
    #             "audio_url": audio_url,
    #             "status": "published",
    #         }
    #     }
    #
    #     async with session.post(
    #         f"{TRANSISTOR_API_BASE}/episodes",
    #         headers=headers,
    #         json=episode_data
    #     ) as resp:
    #         result = await resp.json()
    #
    #     return {
    #         "episode_id": result['data']['id'],
    #         "url": result['data']['attributes']['share_url'],
    #         "title": title
    #     }

    return {
        "episode_id": "placeholder",
        "url": f"https://i5podcast.transistor.fm/episodes/{date}",
        "title": title
    }


def build_description(papers: List[Dict[str, Any]], date: str) -> str:
    """
    Build episode description for podcast feed.

    Args:
        papers: List of featured papers
        date: Episode date

    Returns:
        HTML description for episode
    """
    description = f"<p>Episode for {date} - Four research highlights with venture and scrappy takes.</p>\n\n"

    description += "<h3>Today's Papers:</h3>\n<ol>\n"

    for paper in papers:
        title = paper['title']
        url = paper.get('url', '#')
        description += f"<li><a href=\"{url}\">{title}</a></li>\n"

    description += "</ol>\n\n"

    description += "<p>Subscribe for daily research intelligence. Built by <a href=\"https://tokentank.io\">Token Tank</a>.</p>"

    return description


async def get_episode_stats(episode_id: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get download statistics for an episode.

    Args:
        episode_id: Transistor episode ID
        config: Configuration dict

    Returns:
        Stats dict with downloads, etc.
    """
    # TODO: Implement stats fetching
    pass


async def update_episode(
    episode_id: str,
    updates: Dict[str, Any],
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Update an existing episode (e.g., fix description).

    Args:
        episode_id: Transistor episode ID
        updates: Dict of fields to update
        config: Configuration dict

    Returns:
        Updated episode data
    """
    # TODO: Implement episode updates
    pass
