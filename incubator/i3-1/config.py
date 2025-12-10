"""
i3-1 Trading Agent Configuration

Change these values to switch modes, assets, and behavior.
All changes take effect on next run.

Usage:
    STRATEGY_MODE = "A"  →  "B" or "C" to switch strategies
    ASSET_CLASSES = ["crypto"]  →  ["stocks"] or ["crypto", "stocks"]
"""

import os

# ============ TRADING MODE ============
# Options: "paper" or "live"
# DANGER: Only set to "live" after proving profitability in paper mode!
TRADING_MODE = os.getenv("TRADING_MODE", "paper")

# ============ STRATEGY MODE ============
# Options: "A" (Sentiment), "B" (Technical), "C" (Hybrid)
#
# Mode A: Uses crypto-research reports from Supabase
# Mode B: Uses technical indicators (RSI, moving averages)
# Mode C: Combines both approaches
STRATEGY_MODE = os.getenv("STRATEGY_MODE", "A")

# ============ ASSET CLASSES ============
# Options: ["crypto"], ["stocks"], ["crypto", "stocks"]
ASSET_CLASSES = os.getenv("ASSET_CLASSES", "crypto,stocks").split(",")

# ============ ASSETS ============
# 20 liquid assets across crypto and stocks for diversification
ASSETS = {
    "crypto": [
        "BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD", "LINK/USD",
        "DOGE/USD", "MATIC/USD", "DOT/USD", "ATOM/USD", "UNI/USD"
    ],
    "stocks": [
        "SPY", "QQQ", "NVDA", "TSLA", "AAPL",
        "MSFT", "GOOGL", "AMZN", "COIN", "MSTR"
    ],
}

# ============ TIMING ============
CHECK_INTERVAL_MINUTES = int(os.getenv("CHECK_INTERVAL_MINUTES", "15"))
MARKET_HOURS_ONLY = os.getenv("MARKET_HOURS_ONLY", "false").lower() == "true"

# Executor timing (Mode D)
CRYPTO_CHECK_INTERVAL_HOURS = int(os.getenv("CRYPTO_CHECK_INTERVAL_HOURS", "4"))
STOCK_CHECK_TIMES = os.getenv("STOCK_CHECK_TIMES", "09:45,15:45").split(",")  # EST

# ============ RISK LIMITS ============
MAX_POSITION_SIZE_PCT = int(os.getenv("MAX_POSITION_SIZE_PCT", "25"))  # Max % of portfolio per position
MAX_DAILY_TRADES = int(os.getenv("MAX_DAILY_TRADES", "10"))
STOP_LOSS_PCT = int(os.getenv("STOP_LOSS_PCT", "5"))  # Hard stop loss for all positions
MIN_CONFIDENCE = int(os.getenv("MIN_CONFIDENCE", "70"))  # Min confidence to execute trade
MAX_TOTAL_EXPOSURE_PCT = int(os.getenv("MAX_TOTAL_EXPOSURE_PCT", "80"))  # Max % of portfolio deployed

# ============ STATE PATHS ============
STATE_DIR = os.path.join(os.path.dirname(__file__), "state")
STRATEGY_FILE = os.path.join(STATE_DIR, "strategy.json")
EXECUTION_LOG_FILE = os.path.join(STATE_DIR, "execution_log.json")

# ============ ALPACA ============
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
ALPACA_BASE_URL = os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets")

# ============ LOGGING ============
VERBOSE = os.getenv("VERBOSE", "true").lower() == "true"
LOG_REASONING = os.getenv("LOG_REASONING", "true").lower() == "true"

# ============ HELPERS ============

def get_enabled_assets() -> list[str]:
    """Return list of all enabled assets based on ASSET_CLASSES."""
    assets = []
    for asset_class in ASSET_CLASSES:
        asset_class = asset_class.strip()
        if asset_class in ASSETS:
            assets.extend(ASSETS[asset_class])
    return assets


def get_mode_name(mode: str) -> str:
    """Return human-readable name for a mode."""
    names = {
        "A": "Sentiment",
        "B": "Technical",
        "C": "Hybrid",
    }
    return names.get(mode, "Unknown")


def print_config():
    """Print current configuration (for verbose logging)."""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║ i3-1 TRADING AGENT - CONFIGURATION                             ║
╠══════════════════════════════════════════════════════════════╣
║ Trading Mode:    {TRADING_MODE.upper():10}  {"⚠️  REAL MONEY!" if TRADING_MODE == "live" else "📝 Paper"}
║ Strategy Mode:   {STRATEGY_MODE} ({get_mode_name(STRATEGY_MODE)})
║ Asset Classes:   {", ".join(ASSET_CLASSES)}
║ Assets:          {", ".join(get_enabled_assets())}
║ Check Interval:  {CHECK_INTERVAL_MINUTES} minutes
║ Min Confidence:  {MIN_CONFIDENCE}%
║ Max Position:    {MAX_POSITION_SIZE_PCT}% of portfolio
║ Stop Loss:       {STOP_LOSS_PCT}%
║ Verbose:         {VERBOSE}
╚══════════════════════════════════════════════════════════════╝
""")
