"""
Gold/Oil Trader Configuration

Amber's trading project with Roxi.
Strategy: Gold up on uncertainty, oil down on uncertainty.

LIVE TRADING - Real money via Alpaca
"""

import os
from pathlib import Path

# Load environment from sms-bot/.env.local
try:
    from dotenv import load_dotenv
    env_path = Path(__file__).parent.parent.parent / "sms-bot" / ".env.local"
    if env_path.exists():
        load_dotenv(env_path, override=False)
except ImportError:
    pass

# ============ TRADING MODE ============
# LIVE TRADING - This is real money!
TRADING_MODE = "live"

# ============ STRATEGY ============
# Assets
GOLD_SYMBOL = "SGOL"  # Physical gold ETF
OIL_INVERSE_SYMBOL = "SCO"  # 2x inverse oil ETF
COPPER_SYMBOL = "CPER"  # United States Copper Index Fund

# Trigger indicators (for regime check)
DOLLAR_ETF = "UUP"  # Dollar bull ETF (inverse = gold bullish)
GOLD_PROXY = "GLD"  # Main gold ETF for trend confirmation
VIX_PROXY = "UVXY"  # VIX ETF for risk sentiment (VIXY not on Alpaca)

# Position sizing
BUDGET_PER_SIDE = 250.0  # $250 gold, $250 oil
MAX_POSITION = 250.0

# Entry triggers
PULLBACK_THRESHOLD = -0.02  # 2% pullback from recent high (for gold entry)
SPIKE_THRESHOLD = 0.03  # 3% spike (for oil inverse entry)

# Exit rules (Roxi's framework)
PROFIT_TARGET = 0.05  # +5%
STOP_LOSS = -0.05  # -5%
EOD_EXIT = True  # Exit at end of day

# Lookback for analysis
LOOKBACK_DAYS = 10

# ============ ALPACA - LIVE ============
ALPACA_API_KEY = os.getenv("ALPACA_API_KEY")
ALPACA_SECRET_KEY = os.getenv("ALPACA_SECRET_KEY")
ALPACA_BASE_URL = "https://api.alpaca.markets"  # LIVE, not paper

# ============ EMAIL ============
# Daily updates go to Roxi via ambercc@
ROXI_EMAIL = "roxiwen@gmail.com"
AMBER_CC_EMAIL = "ambercc@intheamber.com"

# ============ PATHS ============
BASE_DIR = Path(__file__).parent
STATE_FILE = BASE_DIR / "state.json"
LOG_FILE = BASE_DIR / "trade_log.json"

# ============ LOGGING ============
VERBOSE = True


def print_config():
    """Print current configuration."""
    print(f"""
╔══════════════════════════════════════════════════════════════╗
║  GOLD/OIL/COPPER TRADER - Amber's Roxi Project               ║
╠══════════════════════════════════════════════════════════════╣
║  Trading Mode:     LIVE  ⚠️  REAL MONEY!
║  Gold Asset:       {GOLD_SYMBOL}
║  Oil Asset:        {OIL_INVERSE_SYMBOL}
║  Copper Asset:     {COPPER_SYMBOL}
║  Budget/Side:      ${BUDGET_PER_SIDE}
║  Pullback Entry:   {abs(PULLBACK_THRESHOLD)*100}%
║  Profit Target:    +{PROFIT_TARGET*100}%
║  Stop Loss:        {STOP_LOSS*100}%
║  EOD Exit:         {EOD_EXIT}
╚══════════════════════════════════════════════════════════════╝
""")


if __name__ == "__main__":
    print_config()
