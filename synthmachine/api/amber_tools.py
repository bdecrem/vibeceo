#!/usr/bin/env python3
"""
SynthMachine Python Bindings for Amber

This module provides Python wrappers for the TR-909 drum machine.
Amber can use these to generate drum patterns programmatically.

Usage:
    from amber_tools import render_909_pattern, list_presets, get_preset

    # Render a preset pattern
    wav_path = render_909_pattern(preset='techno-basic', bars=4)

    # Render a custom pattern
    pattern = {
        'kick': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        'snare': [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        'ch': [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
    }
    wav_path = render_909_pattern(pattern=pattern, bpm=140, bars=2)
"""

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Union

# Path to the synthmachine directory
SYNTHMACHINE_DIR = Path(__file__).parent.parent.resolve()

# Available presets
PRESETS = [
    {'id': 'techno-basic', 'name': 'Techno Basic', 'bpm': 130, 'description': 'Classic four-on-floor with offbeat hats'},
    {'id': 'detroit-shuffle', 'name': 'Detroit Shuffle', 'bpm': 125, 'description': 'Syncopated Detroit groove with rim shots'},
    {'id': 'house-classic', 'name': 'House Classic', 'bpm': 122, 'description': 'Chicago house with open hats on upbeats'},
    {'id': 'breakbeat', 'name': 'Breakbeat', 'bpm': 135, 'description': 'Syncopated kick and snare pattern'},
    {'id': 'minimal', 'name': 'Minimal', 'bpm': 128, 'description': 'Sparse, accent-driven pattern'},
    {'id': 'acid-house', 'name': 'Acid House', 'bpm': 126, 'description': 'Driving acid pattern with tom accents'},
    {'id': 'electro-funk', 'name': 'Electro Funk', 'bpm': 115, 'description': 'Funky electro groove with snare rolls'},
    {'id': 'industrial', 'name': 'Industrial', 'bpm': 140, 'description': 'Relentless industrial stomp'},
]


def list_presets() -> List[Dict]:
    """Return a list of available preset patterns."""
    return PRESETS


def get_preset(preset_id: str) -> Optional[Dict]:
    """Get a preset by ID."""
    for preset in PRESETS:
        if preset['id'] == preset_id:
            return preset
    return None


def _convert_simple_pattern(simple_pattern: Dict[str, List[int]]) -> Dict:
    """
    Convert a simple pattern (voice: [0,1,0,1...]) to the full format.

    Simple format: {'kick': [1, 0, 0, 0, ...]}  (1=hit, 0=rest)
    Full format: {'kick': [{'velocity': 1}, {'velocity': 0}, ...]}
    """
    full_pattern = {}
    for voice, steps in simple_pattern.items():
        full_pattern[voice] = [
            {'velocity': 0.8 if s else 0, 'accent': False}
            for s in steps
        ]
    return full_pattern


def render_909_pattern(
    preset: Optional[str] = None,
    pattern: Optional[Dict[str, List]] = None,
    bpm: int = 128,
    bars: int = 2,
    output_path: Optional[str] = None,
) -> str:
    """
    Render a TR-909 drum pattern to a WAV file.

    Args:
        preset: Preset pattern ID (e.g., 'techno-basic', 'house-classic')
        pattern: Custom pattern dict with voice arrays. Can be:
                 - Simple: {'kick': [1, 0, 0, 0, ...]} (1=hit, 0=rest)
                 - Full: {'kick': [{'velocity': 0.8, 'accent': False}, ...]}
        bpm: Tempo in beats per minute (default: 128, or preset's BPM)
        bars: Number of bars to render (default: 2)
        output_path: Where to save the WAV file. If None, creates a temp file.

    Returns:
        Path to the generated WAV file.

    Raises:
        ValueError: If neither preset nor pattern is provided.
        RuntimeError: If rendering fails.

    Example:
        # Using a preset
        >>> wav = render_909_pattern(preset='techno-basic', bars=4)

        # Custom pattern (simple format)
        >>> pattern = {
        ...     'kick': [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0],
        ...     'snare': [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
        ...     'ch': [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
        ... }
        >>> wav = render_909_pattern(pattern=pattern, bpm=140)
    """
    if not preset and not pattern:
        raise ValueError("Either 'preset' or 'pattern' must be provided")

    # Generate output path if not provided
    if not output_path:
        fd, output_path = tempfile.mkstemp(suffix='.wav', prefix='tr909_')
        os.close(fd)

    # Build CLI command
    cli_path = SYNTHMACHINE_DIR / 'dist' / 'api' / 'cli.js'
    cmd = ['node', str(cli_path), 'render', '--output', output_path]

    if preset:
        cmd.extend(['--preset', preset])
    elif pattern:
        # Convert simple pattern if needed
        if pattern and isinstance(list(pattern.values())[0][0], (int, float)):
            pattern = _convert_simple_pattern(pattern)
        cmd.extend(['--pattern', json.dumps(pattern)])

    cmd.extend(['--bpm', str(bpm), '--bars', str(bars)])

    # Run the CLI
    try:
        result = subprocess.run(
            cmd,
            cwd=str(SYNTHMACHINE_DIR),
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            raise RuntimeError(f"Rendering failed: {result.stderr}")

        # CLI outputs the path on stdout
        return result.stdout.strip() or output_path

    except subprocess.TimeoutExpired:
        raise RuntimeError("Rendering timed out after 30 seconds")
    except FileNotFoundError:
        raise RuntimeError(
            f"Node.js CLI not found. Make sure to build first: cd {SYNTHMACHINE_DIR} && npm run build"
        )


def quick_beat(style: str = 'techno', bars: int = 2) -> str:
    """
    Quick helper to generate a beat with minimal configuration.

    Args:
        style: One of 'techno', 'house', 'breakbeat', 'minimal', 'acid', 'electro', 'industrial'
        bars: Number of bars (default: 2)

    Returns:
        Path to the generated WAV file.
    """
    style_map = {
        'techno': 'techno-basic',
        'house': 'house-classic',
        'breakbeat': 'breakbeat',
        'minimal': 'minimal',
        'acid': 'acid-house',
        'electro': 'electro-funk',
        'industrial': 'industrial',
        'detroit': 'detroit-shuffle',
    }

    preset_id = style_map.get(style.lower(), 'techno-basic')
    return render_909_pattern(preset=preset_id, bars=bars)


if __name__ == '__main__':
    # Demo: render all presets
    import sys

    if len(sys.argv) > 1:
        # Render a specific preset
        preset_id = sys.argv[1]
        output = sys.argv[2] if len(sys.argv) > 2 else None
        path = render_909_pattern(preset=preset_id, bars=2, output_path=output)
        print(f"Generated: {path}")
    else:
        # List presets
        print("TR-909 Presets:")
        for p in list_presets():
            print(f"  {p['id']:20} {p['name']} ({p['bpm']} BPM)")
            print(f"  {'':20} {p['description']}\n")
