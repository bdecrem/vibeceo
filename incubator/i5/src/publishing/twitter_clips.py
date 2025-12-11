"""
Twitter clip generation and posting.

Creates audiogram clips and posts them throughout the day.
"""

import asyncio
from pathlib import Path
from typing import List, Dict, Any

# TODO: pip install tweepy
# import tweepy


async def generate_and_post(
    audio_path: Path,
    papers: List[Dict[str, Any]],
    config: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """
    Generate clips for each paper and schedule posts.

    Args:
        audio_path: Path to full episode audio
        papers: List of featured papers
        config: Configuration dict

    Returns:
        List of posted tweet data
    """
    twitter_config = config["publishing"]["twitter"]

    if not twitter_config["enabled"]:
        print("[twitter] Posting disabled in config")
        return []

    clips_count = twitter_config["clips_per_episode"]
    clip_duration = twitter_config["clip_duration_sec"]

    print(f"[twitter] Would generate {clips_count} clips ({clip_duration}s each)")

    posted = []

    for i, paper in enumerate(papers[:clips_count]):
        # Generate clip
        clip_path = await generate_clip(audio_path, i + 1, clip_duration, config)

        # Generate audiogram (video with waveform)
        audiogram_path = await generate_audiogram(clip_path, paper, config)

        # Build tweet text
        tweet_text = build_tweet_text(paper, i + 1)

        # Post (or schedule)
        # TODO: Implement actual posting
        # result = await post_tweet(audiogram_path, tweet_text, config)
        # posted.append(result)

        print(f"[twitter] Would post clip {i+1}: {tweet_text[:50]}...")

    return posted


async def generate_clip(
    audio_path: Path,
    item_number: int,
    duration_sec: int,
    config: Dict[str, Any]
) -> Path:
    """
    Extract a clip for a specific item from the full episode.

    Args:
        audio_path: Path to full episode audio
        item_number: Which item (1-4)
        duration_sec: Clip duration in seconds
        config: Configuration dict

    Returns:
        Path to clip audio file
    """
    # TODO: Implement clip extraction
    # from pydub import AudioSegment
    #
    # full_audio = AudioSegment.from_mp3(audio_path)
    #
    # # Calculate approximate start time for each item
    # # Intro: 60s, each item: ~210s (3.5 min)
    # intro_duration = 60 * 1000  # ms
    # item_duration = 210 * 1000  # ms
    #
    # start_ms = intro_duration + (item_number - 1) * item_duration
    # end_ms = start_ms + (duration_sec * 1000)
    #
    # clip = full_audio[start_ms:end_ms]
    #
    # clip_path = audio_path.parent / f"clip-{item_number}.mp3"
    # clip.export(clip_path, format="mp3")
    #
    # return clip_path

    clip_path = audio_path.parent / f"clip-{item_number}.mp3"
    clip_path.touch()
    return clip_path


async def generate_audiogram(
    audio_path: Path,
    paper: Dict[str, Any],
    config: Dict[str, Any]
) -> Path:
    """
    Generate audiogram video (waveform + title overlay).

    Args:
        audio_path: Path to audio clip
        paper: Paper data for title overlay
        config: Configuration dict

    Returns:
        Path to audiogram video file
    """
    # TODO: Implement audiogram generation
    # This typically uses ffmpeg to:
    # 1. Generate waveform visualization
    # 2. Overlay title text
    # 3. Combine into video format
    #
    # Example ffmpeg command:
    # ffmpeg -i audio.mp3 -filter_complex \
    #   "[0:a]showwaves=s=1280x720:mode=line:colors=white[v]" \
    #   -map "[v]" -map 0:a output.mp4

    audiogram_path = audio_path.with_suffix('.mp4')
    audiogram_path.touch()
    return audiogram_path


def build_tweet_text(paper: Dict[str, Any], item_number: int) -> str:
    """
    Build tweet text for a clip.

    Args:
        paper: Paper data
        item_number: Which item in today's episode

    Returns:
        Tweet text (max 280 chars)
    """
    title = paper['title']

    # Truncate title if needed
    max_title_len = 180
    if len(title) > max_title_len:
        title = title[:max_title_len-3] + "..."

    tweet = f"{title}\n\nVenture take vs. scrappy take in today's i5.\n\n#AI #research"

    # Ensure under 280 chars
    if len(tweet) > 280:
        tweet = tweet[:277] + "..."

    return tweet


async def post_tweet(
    media_path: Path,
    text: str,
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Post tweet with media.

    Args:
        media_path: Path to media file (video/image)
        text: Tweet text
        config: Configuration dict

    Returns:
        Tweet data including ID and URL
    """
    # TODO: Implement Twitter API posting
    # auth = tweepy.OAuth1UserHandler(
    #     os.environ["TWITTER_API_KEY"],
    #     os.environ["TWITTER_API_SECRET"],
    #     os.environ["TWITTER_ACCESS_TOKEN"],
    #     os.environ["TWITTER_ACCESS_SECRET"]
    # )
    # api = tweepy.API(auth)
    #
    # # Upload media
    # media = api.media_upload(str(media_path))
    #
    # # Post tweet
    # tweet = api.update_status(
    #     status=text,
    #     media_ids=[media.media_id]
    # )
    #
    # return {
    #     "id": tweet.id,
    #     "url": f"https://twitter.com/i5podcast/status/{tweet.id}"
    # }

    return {"id": "placeholder", "url": "https://twitter.com/i5podcast/status/placeholder"}
