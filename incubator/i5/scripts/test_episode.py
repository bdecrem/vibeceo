#!/usr/bin/env python3
"""
Test episode generation with sample papers.

Usage:
    cd incubator/i5
    python scripts/test_episode.py
"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# Load config (this also loads env vars from sms-bot/.env.local)
import config

from src.generation import script_writer, audio_generator

# Sample papers for testing
SAMPLE_PAPERS = [
    {
        "id": "test-001",
        "title": "Efficient 70B Parameter Models on Consumer GPUs via Dynamic Quantization",
        "abstract": "We present a novel quantization method enabling 70B parameter language models to run on single consumer GPUs (RTX 4090) with less than 2% quality degradation. Our approach dynamically adjusts precision based on layer importance...",
        "score": 85,
        "desperate_user": "Indie developers spending $200+/month on API calls",
        "obvious_business": "Local inference desktop app",
        "tags": ["efficiency_jump", "capability_unlock"]
    },
    {
        "id": "test-002",
        "title": "Zero-Shot Code Migration Between Programming Languages",
        "abstract": "We introduce CodeBridge, a system that converts codebases between programming languages without training examples. Given a Python repository, CodeBridge produces functionally equivalent Rust code with 94% test pass rate...",
        "score": 78,
        "desperate_user": "Companies with legacy codebases needing modernization",
        "obvious_business": "Code migration consulting tool",
        "tags": ["automation", "capability_unlock"]
    },
    {
        "id": "test-003",
        "title": "Real-Time Voice Cloning from 3-Second Samples",
        "abstract": "We demonstrate voice cloning requiring only 3 seconds of reference audio, running in real-time on mobile devices. Quality metrics match systems requiring 30+ minutes of training data...",
        "score": 72,
        "desperate_user": "Content creators needing voiceover in multiple languages",
        "obvious_business": "Dubbing/localization service",
        "tags": ["efficiency_jump", "automation"]
    },
    {
        "id": "test-004",
        "title": "Autonomous Bug Detection and Repair in Production Systems",
        "abstract": "We present BugHunter, an agent that monitors production logs, identifies anomalies, traces them to code defects, and generates verified patches. In deployment at three companies, BugHunter resolved 67% of detected issues without human intervention...",
        "score": 81,
        "desperate_user": "On-call engineers drowning in alerts",
        "obvious_business": "AI SRE service",
        "tags": ["automation", "capability_unlock"]
    }
]


async def main():
    print("=== i5 Test Episode Generation ===\n")

    # Load config
    import yaml
    with open("config/settings.yaml") as f:
        config = yaml.safe_load(f)

    # Generate script
    print("Generating script...")
    script = await script_writer.generate(
        papers=SAMPLE_PAPERS,
        date="2025-01-15",
        config=config
    )

    # Save script
    output_dir = Path("data/test_output")
    output_dir.mkdir(parents=True, exist_ok=True)

    script_path = output_dir / "test_script.md"
    with open(script_path, "w") as f:
        f.write(script)
    print(f"Script saved to: {script_path}")

    # Optionally generate audio
    response = input("\nGenerate audio? (y/n): ")
    if response.lower() == 'y':
        print("Generating audio...")
        audio_path = await audio_generator.generate(script, config)
        print(f"Audio saved to: {audio_path}")

    print("\nDone!")


if __name__ == "__main__":
    asyncio.run(main())
