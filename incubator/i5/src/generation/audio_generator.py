"""
Audio generation using ElevenLabs.

Converts scripts to multi-voice audio files.
"""

import asyncio
import re
from pathlib import Path
from typing import List, Dict, Any, Tuple

# TODO: pip install elevenlabs
# from elevenlabs import VoiceSettings
# from elevenlabs.client import ElevenLabs

import yaml


async def generate(script: str, config: Dict[str, Any]) -> Path:
    """
    Generate full episode audio from script.

    Args:
        script: Episode script with voice markers
        config: Configuration dict

    Returns:
        Path to generated audio file
    """
    # Load voice config
    voices_config_path = Path(__file__).parent.parent.parent / "config/voices.yaml"
    with open(voices_config_path) as f:
        voices_config = yaml.safe_load(f)

    # Parse script into segments
    segments = parse_script_segments(script)

    print(f"[audio] Parsed {len(segments)} segments from script")

    # Generate audio for each segment
    audio_segments = []
    for i, segment in enumerate(segments):
        voice_type = segment['voice']
        text = segment['text']

        print(f"[audio] Generating segment {i+1}/{len(segments)} ({voice_type}): {text[:50]}...")

        # TODO: Implement actual ElevenLabs API call
        # voice_config = voices_config['voices'][voice_type]
        # audio_data = await generate_segment_audio(
        #     text=text,
        #     voice_id=voice_config['voice_id'],
        #     settings=voice_config['settings'],
        #     config=voices_config
        # )
        # audio_segments.append(audio_data)

    # Combine segments with transitions
    # TODO: Implement audio combination
    # combined = combine_audio_segments(
    #     segments=audio_segments,
    #     intro_music=config['audio']['intro_music'],
    #     outro_music=config['audio']['outro_music']
    # )

    # Save to file
    from datetime import datetime
    date = datetime.now().strftime("%Y-%m-%d")
    output_dir = Path("data/audio")
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"episode-{date}.mp3"

    # TODO: Save actual audio
    # with open(output_path, 'wb') as f:
    #     f.write(combined)

    # For now, just touch the file
    output_path.touch()

    print(f"[audio] Would save audio to: {output_path}")

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
    text: str,
    voice_id: str,
    settings: Dict[str, Any],
    config: Dict[str, Any]
) -> bytes:
    """
    Generate audio for a single segment.

    Args:
        text: Text to convert to speech
        voice_id: ElevenLabs voice ID
        settings: Voice settings (stability, similarity, etc.)
        config: Voice configuration

    Returns:
        Audio data as bytes
    """
    # TODO: Implement ElevenLabs API call
    # client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])
    #
    # audio = client.generate(
    #     text=text,
    #     voice=voice_id,
    #     voice_settings=VoiceSettings(
    #         stability=settings['stability'],
    #         similarity_boost=settings['similarity_boost'],
    #         style=settings.get('style', 0),
    #         use_speaker_boost=settings.get('use_speaker_boost', True)
    #     ),
    #     model=config['audio_settings']['model_id'],
    #     output_format=config['audio_settings']['output_format']
    # )
    #
    # return b''.join(audio)

    return b''


def combine_audio_segments(
    segments: List[bytes],
    intro_music: str,
    outro_music: str
) -> bytes:
    """
    Combine audio segments with music and transitions.

    Args:
        segments: List of audio segment data
        intro_music: Path to intro music file
        outro_music: Path to outro music file

    Returns:
        Combined audio as bytes
    """
    # TODO: Implement audio combination using pydub
    # from pydub import AudioSegment
    #
    # combined = AudioSegment.empty()
    #
    # # Add intro music
    # if Path(intro_music).exists():
    #     intro = AudioSegment.from_mp3(intro_music)
    #     combined += intro.fade_out(1000)
    #
    # # Add segments with small gaps
    # for segment in segments:
    #     audio = AudioSegment.from_mp3(io.BytesIO(segment))
    #     combined += AudioSegment.silent(duration=500)  # 0.5s gap
    #     combined += audio
    #
    # # Add outro music
    # if Path(outro_music).exists():
    #     outro = AudioSegment.from_mp3(outro_music)
    #     combined += outro.fade_in(1000)
    #
    # # Normalize audio levels
    # combined = combined.normalize()
    #
    # # Export
    # buffer = io.BytesIO()
    # combined.export(buffer, format='mp3', bitrate='128k')
    # return buffer.getvalue()

    return b''


async def generate_clip(
    script: str,
    item_number: int,
    config: Dict[str, Any]
) -> Path:
    """
    Generate a clip for a single item (for Twitter).

    Args:
        script: Full episode script
        item_number: Which item (1-4) to extract
        config: Configuration dict

    Returns:
        Path to clip audio file
    """
    # TODO: Extract item segment and generate shorter clip
    pass
