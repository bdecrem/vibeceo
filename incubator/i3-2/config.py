"""
Drift (i3-2) Trading Agent Configuration

Stock-focused swing trader with agentic research.
All config values can be overridden via environment variables.
"""

import os
from pathlib import Path

# Load environment from sms-bot/.env.local (shared secrets)
# Note: override=False so run_control.py can set paper keys before importing
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / "sms-bot" / ".env.local"
    if env_path.exists():
        load_dotenv(env_path, override=False)
except ImportError:
    pass  # dotenv not installed, rely on shell env

# ============ TRADING MODE ============
# Options: "paper" or "live"
# DANGER: Only set to "live" after proving profitability in paper mode!
# SWITCHED TO LIVE: 2025-12-12 by user decision
TRADING_MODE = os.getenv("TRADING_MODE", "live")

# ============ AGENT IDENTITY ============
AGENT_NAME = "Drift"
AGENT_COLOR = "#1a3d2e"  # Dark forest green

# ============ WATCHLIST ============
# Optimized for RSI-2 mean reversion based on research (2025-12-16)
# Key insight: Defensive sectors (utilities, staples, healthcare) show strongest mean-reversion
# Momentum stocks (TSLA, PLTR) removed — they trend, don't revert
WATCHLIST = [
    # ETFs — cleanest mean-reversion, can't go to zero
    "SPY", "QQQ", "XLU", "XLP", "XLV", "XLF", "XLE", "SMH",
    # Defensive / Mean-reversion core
    "KO", "PG", "JNJ",  # Consumer staples + healthcare — textbook mean-reverters
    # Mega-cap Tech — mature, established ranges
    "AAPL", "MSFT", "GOOGL", "AMZN", "META",
    # Semis — keeping but watching if they actually bounce or just trend
    "NVDA", "AMD",
    # Growth — established companies, not pure momentum
    "CRM", "NFLX", "UBER",
    # Financials — work well for mean-reversion
    "JPM", "GS", "V", "MA",
    # Energy
    "XOM", "CVX",
]

# Sector groupings - used to prevent over-concentration
# Grouped by CORRELATION during selloffs, not just industry
SECTOR_MAP = {
    # Mega-cap tech (move together in risk-off)
    "AAPL": "mega_tech", "MSFT": "mega_tech", "GOOGL": "mega_tech", "AMZN": "mega_tech",
    "META": "mega_tech",
    # Semis (even more correlated - AI trade)
    "NVDA": "semis", "AMD": "semis", "AVGO": "semis", "INTC": "semis",
    # Growth/SaaS
    "CRM": "saas", "NOW": "saas", "SNOW": "saas",
    # Consumer/Media
    "NFLX": "consumer", "UBER": "consumer",
    # Financials
    "JPM": "financials", "GS": "financials", "V": "financials", "MA": "financials",
    # Energy
    "XOM": "energy", "CVX": "energy",
    # Defensive - Consumer Staples (low correlation to tech, mean-revert well)
    "KO": "staples", "PG": "staples", "PEP": "staples", "WMT": "staples", "COST": "staples",
    # Defensive - Healthcare
    "JNJ": "healthcare", "UNH": "healthcare", "PFE": "healthcare", "LLY": "healthcare",
    # ETFs - each is its own sector to allow multiple
    "SPY": "etf_broad", "QQQ": "etf_tech", "SMH": "etf_semis",
    "XLF": "etf_fin", "XLE": "etf_energy",
    "XLU": "etf_utilities", "XLP": "etf_staples", "XLV": "etf_health",
    # Crypto (currently disabled)
    "BTC/USD": "crypto", "BTCUSD": "crypto", "ETH/USD": "crypto", "ETHUSD": "crypto",
}

# Max positions per sector (prevents all-in on correlated names)
MAX_POSITIONS_PER_SECTOR = 2
MAX_CRYPTO_POSITIONS = 3  # Crypto gets more slots since no PDT limits

# Crypto assets - DISABLED to reduce API costs
# Was burning ~$35/day researching BTC/ETH every 15 min with Opus
# Re-enable if we want 24/7 trading capability back
CRYPTO_WATCHLIST = []  # ["BTC/USD", "ETH/USD"]

# Broader news monitoring list - we scan news for these but don't actively trade them
# unless they show up as big movers. This catches news-driven opportunities.
NEWS_MONITOR_LIST = [
    # Everything in WATCHLIST plus...
    # More tech
    "INTC", "AVGO", "ORCL", "ADBE", "NOW", "SNOW", "MDB", "DDOG", "NET", "CRWD",
    # Consumer
    "WMT", "COST", "TGT", "HD", "LOW", "NKE", "SBUX", "MCD",
    # Healthcare
    "UNH", "JNJ", "PFE", "MRNA", "LLY", "ABBV",
    # Industrial/Other
    "BA", "CAT", "GE", "UPS", "FDX",
    # Hot/Volatile names (more likely to have news-driven moves)
    "COIN", "HOOD", "RIVN", "LCID", "SOFI", "AFRM", "UPST",
    # Meme/retail favorites
    "GME", "AMC", "BBBY", "WISH",
]

# ============ QUANTITATIVE TRIGGERS ============
# These thresholds determine what gets flagged for research
RSI_OVERSOLD = 20          # RSI-2 below this = oversold, potential buy
RSI_OVERBOUGHT = 80        # RSI-2 above this = overbought, potential sell
PULLBACK_THRESHOLD = -2.0  # Down this much in 5 days = pullback candidate
BREAKOUT_THRESHOLD = 3.0   # Up this much on high volume = breakout candidate
NEWS_MOVE_THRESHOLD = 5.0  # Stock moved this much = news-driven, research it

# ============ TREND FILTER ============
# Only buy oversold stocks that are in UPTRENDS (above 200MA)
# This is from Connors RSI-2 - prevents catching falling knives
REQUIRE_UPTREND = True     # If True, only buy when price > 200MA
UPTREND_MA_PERIOD = 200    # Use 200-day MA as trend filter

# ============ PORTFOLIO LIMITS ============
MAX_PORTFOLIO_VALUE = 500  # Total budget agent can use
MAX_POSITIONS = 12  # Max simultaneous positions
MIN_POSITION_SIZE = 25  # Minimum $ per position
MAX_POSITION_SIZE = 75  # Maximum $ per position (~15% of budget)
CASH_RESERVE_PCT = 15  # Keep 15% cash for opportunities
MAX_SECTOR_EXPOSURE_PCT = 40  # Max 40% in correlated positions

# ============ RISK MANAGEMENT ============
DEFAULT_STOP_LOSS_PCT = 5  # Default stop loss
MAX_STOP_LOSS_PCT = 8  # Never set stop wider than this
DAILY_LOSS_LIMIT_PCT = 5  # Stop trading if down 5% in a day
WEEKLY_LOSS_LIMIT_PCT = 10  # Reduce size if down 10% in a week

# ============ EXIT TRIGGERS ============
PROFIT_TARGET_PCT = 5  # Review position when up this much
STOP_CHECK_PCT = -3  # Review position when down this much (thesis check)

# ============ PDT MANAGEMENT ============
MAX_DAY_TRADES_PER_WEEK = 3  # PDT rule: max 3 day trades per 5 business days
DAY_TRADE_RESERVE = 1  # Always keep 1 day trade for emergencies

# ============ TIMING ============
SCAN_INTERVAL_MINUTES = 15  # Check markets every 15 minutes
RESEARCH_TIMEOUT_SECONDS = 180  # Max 3 minutes for research per decision
MAX_RESEARCH_SEARCHES = 5  # Cap web searches per research session

# ============ RESEARCH COOLDOWN ============
# Prevent re-researching same symbol repeatedly
RESEARCH_COOLDOWN_MINUTES = 120  # 2 hours minimum between researching same symbol
RESEARCH_COOLDOWN_PRICE_OVERRIDE = 3.0  # Skip cooldown if price moved >3%
NEWS_SCAN_INTERVAL_MINUTES = 60  # General news scan once per hour

# ============ CONFIDENCE THRESHOLDS ============
MIN_CONFIDENCE_TO_TRADE = 55  # Don't trade below this confidence
HIGH_CONFIDENCE_THRESHOLD = 75  # Scale up position size above this
VERY_HIGH_CONFIDENCE_THRESHOLD = 85  # Max position size above this

# ============ ALPACA ============
# i3-2 (Drift) uses main Alpaca account in LIVE mode
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
# LIVE TRADING ENABLED - 2025-12-12
# Hardcoded to prevent env var override - this is REAL MONEY
ALPACA_BASE_URL = "https://api.alpaca.markets"

# ============ ANTHROPIC (for agentic research) ============
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
RESEARCH_MODEL = "claude-opus-4-5-20251101"  # Model for research/decisions - Opus for better judgment
SCAN_MODEL = "claude-sonnet-4-20250514"  # Model for light scans (cheaper, just filtering)

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
║  Budget:           ${MAX_PORTFOLIO_VALUE}
║  Watchlist:        {len(WATCHLIST)} stocks + {len(CRYPTO_WATCHLIST)} crypto
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
