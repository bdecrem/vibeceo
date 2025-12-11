"""
i5: Daily Research Intelligence Podcast Configuration

All config values can be overridden via environment variables.
API keys loaded from sms-bot/.env.local (shared secrets).
"""

import os
from pathlib import Path

# Load environment from sms-bot/.env.local (shared secrets)
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / "sms-bot" / ".env.local"
    if env_path.exists():
        load_dotenv(env_path, override=True)
except ImportError:
    pass  # dotenv not installed, rely on shell env

# ============ PROJECT IDENTITY ============
PROJECT_NAME = "i5"
PROJECT_DESCRIPTION = "Daily Research Intelligence Podcast"

# ============ API KEYS ============
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

# ============ MODELS ============
SCREENING_MODEL_STAGE1 = "claude-haiku"  # Fast/cheap for guillotine
SCREENING_MODEL_STAGE2 = "claude-sonnet-4-20250514"  # Better judgment for sniff test
SCRIPT_MODEL = "claude-sonnet-4-20250514"  # Quality for final scripts

# ============ PATHS ============
BASE_DIR = Path(__file__).parent
CONFIG_DIR = BASE_DIR / "config"
PROMPTS_DIR = BASE_DIR / "prompts"
DATA_DIR = BASE_DIR / "data"
STATE_DIR = DATA_DIR / "state"
OUTPUT_DIR = DATA_DIR / "output"

# Ensure directories exist
DATA_DIR.mkdir(exist_ok=True)
STATE_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# ============ PIPELINE SETTINGS ============
DAILY_PICKS = 4  # Papers per episode
BACKUP_COUNT = 4  # Extra picks in case of issues
STAGE1_PASS_RATE = 0.15  # ~15% survive guillotine
STAGE2_PASS_RATE = 0.30  # ~30% of stage1 survivors pass

# ============ AUDIO ============
ELEVENLABS_MODEL = "eleven_multilingual_v2"
AUDIO_OUTPUT_FORMAT = "mp3_44100_128"

# ============ LOGGING ============
VERBOSE = os.getenv("VERBOSE", "true").lower() == "true"


def print_config():
    """Print current configuration."""
    has_anthropic = bool(ANTHROPIC_API_KEY)
    has_elevenlabs = bool(ELEVENLABS_API_KEY)

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  i5 - DAILY RESEARCH INTELLIGENCE PODCAST                    ║
╠══════════════════════════════════════════════════════════════╣
║  Anthropic API:    {"✓ Configured" if has_anthropic else "✗ Missing":20}
║  ElevenLabs API:   {"✓ Configured" if has_elevenlabs else "✗ Missing":20}
║  Daily Picks:      {DAILY_PICKS}
║  Stage 1 Model:    {SCREENING_MODEL_STAGE1}
║  Stage 2 Model:    {SCREENING_MODEL_STAGE2}
║  Script Model:     {SCRIPT_MODEL}
║  Verbose:          {VERBOSE}
╚══════════════════════════════════════════════════════════════╝
""")


if __name__ == "__main__":
    print_config()
