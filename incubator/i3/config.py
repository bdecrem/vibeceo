"""
i3 Trading Agent Configuration

Change these values to switch modes, assets, and behavior.
All changes take effect on next run.

Usage:
    STRATEGY_MODE = "A"  →  "B" or "C" to switch strategies
    ASSET_CLASSES = ["crypto"]  →  ["stocks"] or ["crypto", "stocks"]
"""

import os
from pathlib import Path

# Load .env.local from sms-bot if credentials not already set
# i3 (Vega) uses its OWN Alpaca account: ALPACA_API_KEY_I3 / ALPACA_SECRET_KEY_I3
if not os.getenv("ALPACA_API_KEY_I3"):
    env_file = Path(__file__).parent.parent.parent / "sms-bot" / ".env.local"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    if key.startswith("ALPACA"):
                        os.environ[key] = val

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
ASSET_CLASSES = os.getenv("ASSET_CLASSES", "crypto").split(",")

# ============ ASSETS ============
# Define which assets to trade in each class
ASSETS = {
    "crypto": ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD"],
    "stocks": ["SPY", "QQQ"],
}

# ============ RSI-2 STRATEGY SETTINGS ============
# Larry Connors RSI-2 Mean Reversion parameters
RSI_PERIOD = int(os.getenv("RSI_PERIOD", "2"))
RSI_OVERSOLD = int(os.getenv("RSI_OVERSOLD", "10"))      # Buy when RSI < this
RSI_OVERBOUGHT = int(os.getenv("RSI_OVERBOUGHT", "90"))  # Sell when RSI > this
MA_TREND_PERIOD = int(os.getenv("MA_TREND_PERIOD", "200"))  # Trend filter
MA_EXIT_PERIOD = int(os.getenv("MA_EXIT_PERIOD", "5"))      # Exit signal

# ============ TIMING ============
CHECK_INTERVAL_MINUTES = int(os.getenv("CHECK_INTERVAL_MINUTES", "15"))
MARKET_HOURS_ONLY = os.getenv("MARKET_HOURS_ONLY", "false").lower() == "true"

# ============ RISK LIMITS ============
MAX_POSITION_SIZE_PCT = int(os.getenv("MAX_POSITION_SIZE_PCT", "25"))  # Max % of portfolio per position
MAX_DAILY_TRADES = int(os.getenv("MAX_DAILY_TRADES", "10"))
STOP_LOSS_PCT = int(os.getenv("STOP_LOSS_PCT", "5"))
MIN_CONFIDENCE = int(os.getenv("MIN_CONFIDENCE", "70"))  # Min confidence to execute trade

# ============ ALPACA ============
# i3 (Vega) uses its own dedicated Alpaca account
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY_I3")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY_I3")
ALPACA_BASE_URL = os.getenv("ALPACA_BASE_URL_I3", "https://paper-api.alpaca.markets")

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
║ i3 TRADING AGENT - CONFIGURATION                             ║
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
