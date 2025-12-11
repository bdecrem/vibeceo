"""
Audio generation using ElevenLabs.

Converts scripts to multi-voice audio files.
"""

import asyncio
import io
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import sys

# Add parent for config import
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config

from elevenlabs import VoiceSettings
from elevenlabs.client import ElevenLabs
from pydub import AudioSegment

import yaml


# Base directory for audio output
BASE_DIR = Path(__file__).parent.parent.parent
OUTPUT_DIR = BASE_DIR / "data" / "audio"


async def generate(script: str, generation_config: Dict[str, Any] = None, date: str = None) -> Path:
    """
    Generate full episode audio from script.

    Args:
        script: Episode script with voice markers
        generation_config: Optional configuration dict
        date: Episode date (YYYY-MM-DD), defaults to today

    Returns:
        Path to generated audio file
    """
    # Load voice config
    voices_config_path = BASE_DIR / "config" / "voices.yaml"
    with open(voices_config_path) as f:
        voices_config = yaml.safe_load(f)

    # Parse script into segments
    segments = parse_script_segments(script)

    if config.VERBOSE:
        print(f"[audio] Parsed {len(segments)} segments from script")

    # Initialize ElevenLabs client
    client = ElevenLabs(api_key=config.ELEVENLABS_API_KEY)

    # Generate audio for each segment
    audio_segments = []
    for i, segment in enumerate(segments):
        voice_type = segment['voice']
        text = segment['text']

        if not text.strip():
            continue

        if config.VERBOSE:
            print(f"[audio] Generating segment {i+1}/{len(segments)} ({voice_type}): {text[:50]}...")

        voice_config = voices_config['voices'].get(voice_type, voices_config['voices']['intro'])
        audio_data = await generate_segment_audio(
            client=client,
            text=text,
            voice_id=voice_config['voice_id'],
            settings=voice_config['settings'],
            audio_config=voices_config['audio_settings']
        )
        if audio_data:
            audio_segments.append(audio_data)

    if not audio_segments:
        raise ValueError("No audio segments generated")

    # Combine segments
    if config.VERBOSE:
        print(f"[audio] Combining {len(audio_segments)} audio segments...")

    combined = combine_audio_segments(audio_segments)

    # Save to file
    if date is None:
        from datetime import datetime
        date = datetime.now().strftime("%Y-%m-%d")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"episode-{date}.mp3"

    # Export combined audio
    combined.export(output_path, format='mp3', bitrate='128k')

    if config.VERBOSE:
        duration_sec = len(combined) / 1000
        print(f"[audio] Saved {duration_sec:.1f}s audio to: {output_path}")

    return output_path


def parse_script_segments(script: str) -> List[Dict[str, Any]]:
    """
    Parse script into voice segments.

    Args:
        script: Full script with voice markers

    Returns:
        List of segment dicts with voice type and text
    """
    segments = []

    # Pattern to match voice markers
    patterns = {
        'intro': r'\[INTRO_VOICE\](.*?)\[/INTRO_VOICE\]',
        'venture': r'\[VENTURE\](.*?)\[/VENTURE\]',
        'scrappy': r'\[SCRAPPY\](.*?)\[/SCRAPPY\]',
    }

    # Find all segments in order
    all_matches = []

    for voice_type, pattern in patterns.items():
        for match in re.finditer(pattern, script, re.DOTALL):
            all_matches.append({
                'voice': voice_type,
                'text': match.group(1).strip(),
                'position': match.start()
            })

    # Sort by position in script
    all_matches.sort(key=lambda x: x['position'])

    return all_matches


async def generate_segment_audio(
    client: ElevenLabs,
    text: str,
    voice_id: str,
    settings: Dict[str, Any],
    audio_config: Dict[str, Any]
) -> bytes:
    """
    Generate audio for a single segment.

    Args:
        client: ElevenLabs client
        text: Text to convert to speech
        voice_id: ElevenLabs voice ID
        settings: Voice settings (stability, similarity, etc.)
        audio_config: Audio output settings

    Returns:
        Audio data as bytes
    """
    try:
        audio = client.generate(
            text=text,
            voice=voice_id,
            voice_settings=VoiceSettings(
                stability=settings.get('stability', 0.5),
                similarity_boost=settings.get('similarity_boost', 0.75),
                style=settings.get('style', 0),
                use_speaker_boost=settings.get('use_speaker_boost', True)
            ),
            model=audio_config.get('model_id', 'eleven_multilingual_v2'),
            output_format=audio_config.get('output_format', 'mp3_44100_128')
        )

        # ElevenLabs returns a generator, collect all chunks
        return b''.join(audio)

    except Exception as e:
        print(f"[audio] Error generating segment: {e}")
        return b''


def combine_audio_segments(
    segments: List[bytes],
    intro_music_path: Optional[str] = None,
    outro_music_path: Optional[str] = None,
    gap_ms: int = 500
) -> AudioSegment:
    """
    Combine audio segments with optional music and transitions.

    Args:
        segments: List of audio segment data (bytes)
        intro_music_path: Optional path to intro music file
        outro_music_path: Optional path to outro music file
        gap_ms: Gap between segments in milliseconds

    Returns:
        Combined AudioSegment
    """
    combined = AudioSegment.empty()

    # Add intro music if available
    if intro_music_path and Path(intro_music_path).exists():
        try:
            intro = AudioSegment.from_mp3(intro_music_path)
            combined += intro.fade_out(1000)
            combined += AudioSegment.silent(duration=gap_ms)
        except Exception as e:
            print(f"[audio] Could not load intro music: {e}")

    # Add segments with small gaps
    for i, segment_bytes in enumerate(segments):
        if not segment_bytes:
            continue

        try:
            audio = AudioSegment.from_mp3(io.BytesIO(segment_bytes))
            if i > 0:
                combined += AudioSegment.silent(duration=gap_ms)
            combined += audio
        except Exception as e:
            print(f"[audio] Error processing segment {i}: {e}")

    # Add outro music if available
    if outro_music_path and Path(outro_music_path).exists():
        try:
            combined += AudioSegment.silent(duration=gap_ms)
            outro = AudioSegment.from_mp3(outro_music_path)
            combined += outro.fade_in(1000)
        except Exception as e:
            print(f"[audio] Could not load outro music: {e}")

    # Normalize audio levels
    if len(combined) > 0:
        combined = combined.normalize()

    return combined


async def generate_clip(
    script: str,
    item_number: int,
    generation_config: Dict[str, Any] = None,
    date: str = None
) -> Optional[Path]:
    """
    Generate a clip for a single item (for Twitter/social).

    Args:
        script: Full episode script
        item_number: Which item (1-4) to extract
        generation_config: Optional configuration dict
        date: Episode date

    Returns:
        Path to clip audio file, or None on failure
    """
    # Parse all segments
    segments = parse_script_segments(script)

    # Find segments for the target item
    # Items are structured as: INTRO_VOICE (setup) + VENTURE + SCRAPPY
    # We want to find segments that belong to item N

    # Simple approach: look for segments after "ITEM {N}" marker
    item_marker = f"ITEM {item_number}"

    # Find position of item in script
    item_pos = script.find(item_marker)
    if item_pos == -1:
        print(f"[audio] Could not find {item_marker} in script")
        return None

    # Find next item position (or end)
    next_item_pos = script.find(f"ITEM {item_number + 1}", item_pos + 1)
    if next_item_pos == -1:
        next_item_pos = len(script)

    # Filter segments that fall within this item's range
    item_segments = [
        s for s in segments
        if item_pos <= s['position'] < next_item_pos
    ]

    if not item_segments:
        print(f"[audio] No segments found for item {item_number}")
        return None

    # Load voice config
    voices_config_path = BASE_DIR / "config" / "voices.yaml"
    with open(voices_config_path) as f:
        voices_config = yaml.safe_load(f)

    # Initialize client
    client = ElevenLabs(api_key=config.ELEVENLABS_API_KEY)

    # Generate audio for each segment
    audio_data = []
    for segment in item_segments:
        voice_type = segment['voice']
        text = segment['text']

        if not text.strip():
            continue

        voice_config = voices_config['voices'].get(voice_type, voices_config['voices']['intro'])
        audio_bytes = await generate_segment_audio(
            client=client,
            text=text,
            voice_id=voice_config['voice_id'],
            settings=voice_config['settings'],
            audio_config=voices_config['audio_settings']
        )
        if audio_bytes:
            audio_data.append(audio_bytes)

    if not audio_data:
        return None

    # Combine
    combined = combine_audio_segments(audio_data, gap_ms=300)

    # Save
    if date is None:
        from datetime import datetime
        date = datetime.now().strftime("%Y-%m-%d")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"clip-{date}-item{item_number}.mp3"

    combined.export(output_path, format='mp3', bitrate='128k')

    if config.VERBOSE:
        duration_sec = len(combined) / 1000
        print(f"[audio] Saved clip ({duration_sec:.1f}s) to: {output_path}")

    return output_path
