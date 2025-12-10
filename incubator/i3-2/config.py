"""
Drift (i3-2) Trading Agent Configuration

Stock-focused swing trader with agentic research.
All config values can be overridden via environment variables.
"""

import os
from pathlib import Path

# Load environment from sms-bot/.env.local (shared secrets)
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / "sms-bot" / ".env.local"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass  # dotenv not installed, rely on shell env

# ============ TRADING MODE ============
# Options: "paper" or "live"
# DANGER: Only set to "live" after proving profitability in paper mode!
TRADING_MODE = os.getenv("TRADING_MODE", "paper")

# ============ AGENT IDENTITY ============
AGENT_NAME = "Drift"
AGENT_COLOR = "#1a3d2e"  # Dark forest green

# ============ WATCHLIST ============
# Stocks we actively monitor and trade
# High liquidity, good news coverage, suitable for swing trading
WATCHLIST = [
    # Mega-cap Tech
    "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA",
    # Growth/Momentum
    "AMD", "CRM", "PLTR", "NFLX", "UBER",
    # Financials
    "JPM", "GS", "V", "MA",
    # Energy
    "XOM", "CVX",
    # ETFs
    "SPY", "QQQ", "SMH", "XLF", "XLE",
]

# ============ PORTFOLIO LIMITS ============
MAX_POSITIONS = 12  # Max simultaneous positions
MIN_POSITION_SIZE = 65  # Minimum $ per position
MAX_POSITION_SIZE = 150  # Maximum $ per position (15% of $1000)
CASH_RESERVE_PCT = 15  # Keep 15% cash for opportunities
MAX_SECTOR_EXPOSURE_PCT = 40  # Max 40% in correlated positions

# ============ RISK MANAGEMENT ============
DEFAULT_STOP_LOSS_PCT = 5  # Default stop loss
MAX_STOP_LOSS_PCT = 8  # Never set stop wider than this
DAILY_LOSS_LIMIT_PCT = 5  # Stop trading if down 5% in a day
WEEKLY_LOSS_LIMIT_PCT = 10  # Reduce size if down 10% in a week

# ============ PDT MANAGEMENT ============
MAX_DAY_TRADES_PER_WEEK = 3  # PDT rule: max 3 day trades per 5 business days
DAY_TRADE_RESERVE = 1  # Always keep 1 day trade for emergencies

# ============ TIMING ============
SCAN_INTERVAL_MINUTES = 15  # Check markets every 15 minutes
RESEARCH_TIMEOUT_SECONDS = 180  # Max 3 minutes for research per decision
MAX_RESEARCH_SEARCHES = 5  # Cap web searches per research session

# ============ CONFIDENCE THRESHOLDS ============
MIN_CONFIDENCE_TO_TRADE = 55  # Don't trade below this confidence
HIGH_CONFIDENCE_THRESHOLD = 75  # Scale up position size above this
VERY_HIGH_CONFIDENCE_THRESHOLD = 85  # Max position size above this

# ============ ALPACA ============
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
ALPACA_BASE_URL = os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")

# ============ ANTHROPIC (for agentic research) ============
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
RESEARCH_MODEL = "claude-sonnet-4-20250514"  # Model for research/decisions
SCAN_MODEL = "claude-sonnet-4-20250514"  # Model for light scans (could use haiku for cost)

# ============ PATHS ============
BASE_DIR = Path(__file__).parent
STATE_DIR = BASE_DIR / "state"
JOURNAL_DIR = BASE_DIR / "journal"

# Ensure directories exist
STATE_DIR.mkdir(exist_ok=True)
JOURNAL_DIR.mkdir(exist_ok=True)

# State files
PDT_STATE_FILE = STATE_DIR / "pdt_tracker.json"
POSITIONS_STATE_FILE = STATE_DIR / "positions.json"
DAILY_STATE_FILE = STATE_DIR / "daily_state.json"

# ============ LOGGING ============
VERBOSE = os.getenv("VERBOSE", "true").lower() == "true"
LOG_ALL_SCANS = os.getenv("LOG_ALL_SCANS", "false").lower() == "true"

# ============ HELPERS ============

def get_position_size(confidence: int, available_cash: float) -> float:
    """
    Calculate position size based on confidence level.

    Higher confidence = larger position (up to limits).
    """
    if confidence < MIN_CONFIDENCE_TO_TRADE:
        return 0

    # Base size
    base_size = MIN_POSITION_SIZE

    # Scale up for higher confidence
    if confidence >= VERY_HIGH_CONFIDENCE_THRESHOLD:
        base_size = MAX_POSITION_SIZE
    elif confidence >= HIGH_CONFIDENCE_THRESHOLD:
        # Linear scale between 75-85%
        scale = (confidence - HIGH_CONFIDENCE_THRESHOLD) / (VERY_HIGH_CONFIDENCE_THRESHOLD - HIGH_CONFIDENCE_THRESHOLD)
        base_size = MIN_POSITION_SIZE + scale * (MAX_POSITION_SIZE - MIN_POSITION_SIZE)

    # Don't exceed available cash (minus reserve)
    max_from_cash = available_cash * (1 - CASH_RESERVE_PCT / 100)

    return min(base_size, max_from_cash, MAX_POSITION_SIZE)


def print_config():
    """Print current configuration."""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  DRIFT (i3-2) - THE REASONING TRADER                         ║
╠══════════════════════════════════════════════════════════════╣
║  Trading Mode:     {TRADING_MODE.upper():10}  {"⚠️  REAL MONEY!" if TRADING_MODE == "live" else "📝 Paper"}
║  Watchlist:        {len(WATCHLIST)} stocks
║  Max Positions:    {MAX_POSITIONS}
║  Position Size:    ${MIN_POSITION_SIZE}-${MAX_POSITION_SIZE}
║  Scan Interval:    {SCAN_INTERVAL_MINUTES} minutes
║  Min Confidence:   {MIN_CONFIDENCE_TO_TRADE}%
║  PDT Limit:        {MAX_DAY_TRADES_PER_WEEK} day trades/week
║  Verbose:          {VERBOSE}
╚══════════════════════════════════════════════════════════════╝
""")


if __name__ == "__main__":
    print_config()
