"""
Gold/Oil Trader - Amber's Trading Script

Strategy:
- Day 1: Buy SGOL on 2-3% pullback from recent highs
- Day 2+: Add SCO (inverse oil) when oil spikes
- Exit: +5% profit, -5% stop, or end of day

This is a NEW script, separate from the Connors RSI-2 code.
Built for Roxi's framework: 1-5 trades/week, daily updates.
"""

import os
import sys
import json
from datetime import datetime, timedelta
from pathlib import Path
import pytz

# Use local alpaca_client (not trading-fork)
from alpaca_client import AlpacaClient, is_market_open, get_market_status

# Timezone
ET = pytz.timezone('America/New_York')
PT = pytz.timezone('America/Los_Angeles')

# =============================================================================
# CONFIGURATION
# =============================================================================

# Assets
GOLD_SYMBOL = "SGOL"  # Physical gold ETF (low expense ratio)
OIL_INVERSE_SYMBOL = "SCO"  # 2x inverse oil ETF
COPPER_SYMBOL = "CPER"  # United States Copper Index Fund

# Position sizing
BUDGET_PER_SIDE = 250.0  # $250 gold, $250 oil
MAX_POSITION = 250.0

# Entry triggers
PULLBACK_THRESHOLD = -0.02  # 2% pullback from recent high
SPIKE_THRESHOLD = 0.03  # 3% spike (for oil inverse entry)

# Exit rules
PROFIT_TARGET = 0.05  # +5%
STOP_LOSS = -0.05  # -5%

# Lookback for recent high
LOOKBACK_DAYS = 10

# State file
STATE_FILE = Path(__file__).parent / "state.json"
LOG_FILE = Path(__file__).parent / "trade_log.json"


# =============================================================================
# STATE MANAGEMENT
# =============================================================================

def load_state() -> dict:
    """Load current trading state."""
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return json.load(f)
    return {
        "gold_position": None,  # {"entry_price": x, "qty": y, "entry_time": z}
        "oil_position": None,
        "copper_position": None,
        "day": 1,
        "last_check": None,
    }


def save_state(state: dict):
    """Save trading state."""
    with open(STATE_FILE, "w") as f:
        json.dump(state, f, indent=2, default=str)


def log_event(event_type: str, data: dict):
    """Append to trade log."""
    logs = []
    if LOG_FILE.exists():
        with open(LOG_FILE) as f:
            logs = json.load(f)

    logs.append({
        "timestamp": datetime.now(PT).isoformat(),
        "type": event_type,
        **data
    })

    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=2)

    print(f"[{event_type}] {data}")


# =============================================================================
# ANALYSIS
# =============================================================================

def get_recent_high(client: AlpacaClient, symbol: str, days: int = LOOKBACK_DAYS) -> float:
    """Get the highest close in the last N days."""
    bars = client.get_bars(symbol, days=days + 5)  # Extra buffer
    if not bars:
        return None

    # Get last N days of closes
    closes = [bar["high"] for bar in bars[-days:]]
    return max(closes) if closes else None


def calculate_pullback(current_price: float, recent_high: float) -> float:
    """Calculate pullback percentage from recent high."""
    if not recent_high or recent_high == 0:
        return 0
    return (current_price - recent_high) / recent_high


def check_exit_conditions(entry_price: float, current_price: float) -> tuple[bool, str]:
    """Check if we should exit a position."""
    if not entry_price:
        return False, ""

    pnl_pct = (current_price - entry_price) / entry_price

    if pnl_pct >= PROFIT_TARGET:
        return True, f"profit_target ({pnl_pct*100:.1f}%)"

    if pnl_pct <= STOP_LOSS:
        return True, f"stop_loss ({pnl_pct*100:.1f}%)"

    return False, ""


def is_end_of_day() -> bool:
    """Check if we're near market close (last 15 min)."""
    now = datetime.now(ET)
    close_time = now.replace(hour=16, minute=0, second=0)
    return now >= close_time - timedelta(minutes=15)


# =============================================================================
# TRADING LOGIC
# =============================================================================

def run_check():
    """Main trading check - run this periodically."""
    print(f"\n{'='*60}")
    print(f"Gold/Oil Trader - {datetime.now(PT).strftime('%Y-%m-%d %H:%M:%S PT')}")
    print(f"{'='*60}")

    # Check market status
    market = get_market_status()
    print(f"Market: {'OPEN' if market['is_open'] else 'CLOSED'} ({market['current_time_et']})")

    if not market['is_open']:
        print("Market closed. Skipping.")
        return

    # Initialize client (LIVE mode)
    client = AlpacaClient(paper=False)
    state = load_state()

    # Get current prices
    gold_price = client.get_latest_price(GOLD_SYMBOL)
    oil_inv_price = client.get_latest_price(OIL_INVERSE_SYMBOL)
    copper_price = client.get_latest_price(COPPER_SYMBOL)

    print(f"\nPrices:")
    print(f"  {GOLD_SYMBOL}: ${gold_price:.2f}" if gold_price else f"  {GOLD_SYMBOL}: N/A")
    print(f"  {OIL_INVERSE_SYMBOL}: ${oil_inv_price:.2f}" if oil_inv_price else f"  {OIL_INVERSE_SYMBOL}: N/A")
    print(f"  {COPPER_SYMBOL}: ${copper_price:.2f}" if copper_price else f"  {COPPER_SYMBOL}: N/A")

    # Get account info
    account = client.get_account()
    print(f"\nAccount:")
    print(f"  Cash: ${account['cash']:.2f}")
    print(f"  Portfolio: ${account['portfolio_value']:.2f}")

    # Check current positions
    positions = client.get_positions()
    gold_pos = next((p for p in positions if p['symbol'] == GOLD_SYMBOL), None)
    oil_pos = next((p for p in positions if p['symbol'] == OIL_INVERSE_SYMBOL), None)
    copper_pos = next((p for p in positions if p['symbol'] == COPPER_SYMBOL), None)

    if gold_pos:
        print(f"\nGold position: {gold_pos['qty']:.4f} shares @ ${gold_pos['avg_entry_price']:.2f}")
        print(f"  Current: ${gold_pos['current_price']:.2f}, P&L: {gold_pos['unrealized_plpc']:.1f}%")

    if oil_pos:
        print(f"\nOil position: {oil_pos['qty']:.4f} shares @ ${oil_pos['avg_entry_price']:.2f}")
        print(f"  Current: ${oil_pos['current_price']:.2f}, P&L: {oil_pos['unrealized_plpc']:.1f}%")

    if copper_pos:
        print(f"\nCopper position: {copper_pos['qty']:.4f} shares @ ${copper_pos['avg_entry_price']:.2f}")
        print(f"  Current: ${copper_pos['current_price']:.2f}, P&L: {copper_pos['unrealized_plpc']:.1f}%")

    # =================================
    # EXIT LOGIC
    # =================================

    # Check gold exit
    if gold_pos:
        should_exit, reason = check_exit_conditions(
            gold_pos['avg_entry_price'],
            gold_pos['current_price']
        )

        if should_exit or is_end_of_day():
            exit_reason = reason if should_exit else "end_of_day"
            print(f"\n🔴 SELLING {GOLD_SYMBOL}: {exit_reason}")

            result = client.sell(GOLD_SYMBOL, reason=exit_reason)
            if result:
                log_event("SELL", {
                    "symbol": GOLD_SYMBOL,
                    "qty": gold_pos['qty'],
                    "entry_price": gold_pos['avg_entry_price'],
                    "exit_price": gold_pos['current_price'],
                    "pnl_pct": gold_pos['unrealized_plpc'],
                    "reason": exit_reason,
                })
                state["gold_position"] = None

    # Check oil exit
    if oil_pos:
        should_exit, reason = check_exit_conditions(
            oil_pos['avg_entry_price'],
            oil_pos['current_price']
        )

        if should_exit or is_end_of_day():
            exit_reason = reason if should_exit else "end_of_day"
            print(f"\n🔴 SELLING {OIL_INVERSE_SYMBOL}: {exit_reason}")

            result = client.sell(OIL_INVERSE_SYMBOL, reason=exit_reason)
            if result:
                log_event("SELL", {
                    "symbol": OIL_INVERSE_SYMBOL,
                    "qty": oil_pos['qty'],
                    "entry_price": oil_pos['avg_entry_price'],
                    "exit_price": oil_pos['current_price'],
                    "pnl_pct": oil_pos['unrealized_plpc'],
                    "reason": exit_reason,
                })
                state["oil_position"] = None

    # Check copper exit
    if copper_pos:
        should_exit, reason = check_exit_conditions(
            copper_pos['avg_entry_price'],
            copper_pos['current_price']
        )

        if should_exit or is_end_of_day():
            exit_reason = reason if should_exit else "end_of_day"
            print(f"\n🔴 SELLING {COPPER_SYMBOL}: {exit_reason}")

            result = client.sell(COPPER_SYMBOL, reason=exit_reason)
            if result:
                log_event("SELL", {
                    "symbol": COPPER_SYMBOL,
                    "qty": copper_pos['qty'],
                    "entry_price": copper_pos['avg_entry_price'],
                    "exit_price": copper_pos['current_price'],
                    "pnl_pct": copper_pos['unrealized_plpc'],
                    "reason": exit_reason,
                })
                state["copper_position"] = None

    # =================================
    # ENTRY LOGIC
    # =================================

    if not gold_pos and gold_price:
        recent_high = get_recent_high(client, GOLD_SYMBOL)
        if recent_high:
            pullback = calculate_pullback(gold_price, recent_high)
            print(f"\nGold analysis:")
            print(f"  Recent high: ${recent_high:.2f}")
            print(f"  Pullback: {pullback*100:.1f}%")

            if pullback <= PULLBACK_THRESHOLD:
                print(f"\n🟢 BUYING {GOLD_SYMBOL}: {pullback*100:.1f}% pullback detected")

                result = client.buy(GOLD_SYMBOL, BUDGET_PER_SIDE, reason=f"pullback {pullback*100:.1f}%")
                if result:
                    log_event("BUY", {
                        "symbol": GOLD_SYMBOL,
                        "notional": BUDGET_PER_SIDE,
                        "price": gold_price,
                        "recent_high": recent_high,
                        "pullback_pct": pullback * 100,
                        "reason": "pullback_entry",
                    })
                    state["gold_position"] = {
                        "entry_price": gold_price,
                        "entry_time": datetime.now(PT).isoformat(),
                    }

    # Copper entry (same pullback logic as gold)
    if not copper_pos and copper_price:
        recent_high = get_recent_high(client, COPPER_SYMBOL)
        if recent_high:
            pullback = calculate_pullback(copper_price, recent_high)
            print(f"\nCopper analysis:")
            print(f"  Recent high: ${recent_high:.2f}")
            print(f"  Pullback: {pullback*100:.1f}%")

            if pullback <= PULLBACK_THRESHOLD:
                print(f"\n🟢 BUYING {COPPER_SYMBOL}: {pullback*100:.1f}% pullback detected")

                result = client.buy(COPPER_SYMBOL, BUDGET_PER_SIDE, reason=f"pullback {pullback*100:.1f}%")
                if result:
                    log_event("BUY", {
                        "symbol": COPPER_SYMBOL,
                        "notional": BUDGET_PER_SIDE,
                        "price": copper_price,
                        "recent_high": recent_high,
                        "pullback_pct": pullback * 100,
                        "reason": "pullback_entry",
                    })
                    state["copper_position"] = {
                        "entry_price": copper_price,
                        "entry_time": datetime.now(PT).isoformat(),
                    }

    # =================================
    # DAY 2+: Oil inverse entries
    # =================================

    if state.get("day", 1) >= 2 and not oil_pos and oil_inv_price:
        # TODO: Add oil spike detection logic
        # For now, just log that we're watching
        print(f"\nOil watching: Day {state.get('day', 1)}, ready for SCO entries")

    # Save state
    state["last_check"] = datetime.now(PT).isoformat()
    save_state(state)

    print(f"\n{'='*60}")
    print("Check complete.")


def show_status():
    """Show current status without trading."""
    state = load_state()
    print(f"\nState: {json.dumps(state, indent=2)}")

    if LOG_FILE.exists():
        with open(LOG_FILE) as f:
            logs = json.load(f)
        print(f"\nRecent trades ({len(logs)} total):")
        for log in logs[-5:]:
            print(f"  {log['timestamp']}: {log['type']} {log.get('symbol', '')} - {log.get('reason', '')}")


def advance_day():
    """Advance to next day (for testing)."""
    state = load_state()
    state["day"] = state.get("day", 1) + 1
    save_state(state)
    print(f"Advanced to Day {state['day']}")


def monitor(interval_minutes=15):
    """Run continuously, checking every N minutes during market hours."""
    import time

    print(f"\n{'='*60}")
    print("GOLD/OIL TRADER - MONITOR MODE")
    print(f"Checking every {interval_minutes} minutes during market hours")
    print(f"Press Ctrl+C to stop")
    print(f"{'='*60}\n")

    while True:
        try:
            market = get_market_status()
            now_pt = datetime.now(PT)

            if market["is_open"]:
                print(f"\n[{now_pt.strftime('%H:%M:%S')}] Market OPEN - running check...")
                run_check()
            else:
                next_open = market.get("next_open", "unknown")
                print(f"[{now_pt.strftime('%H:%M:%S')}] Market closed. Next open: {next_open}")

            # Sleep until next check
            print(f"Sleeping {interval_minutes} minutes...")
            time.sleep(interval_minutes * 60)

        except KeyboardInterrupt:
            print("\n\nMonitor stopped.")
            break
        except Exception as e:
            print(f"Error: {e}")
            print(f"Retrying in {interval_minutes} minutes...")
            time.sleep(interval_minutes * 60)


# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Gold/Oil Trader")
    parser.add_argument("command", choices=["run", "status", "advance", "monitor"],
                        default="run", nargs="?",
                        help="Command to execute")
    parser.add_argument("--interval", type=int, default=15,
                        help="Monitor interval in minutes (default: 15)")

    args = parser.parse_args()

    if args.command == "run":
        run_check()
    elif args.command == "status":
        show_status()
    elif args.command == "advance":
        advance_day()
    elif args.command == "monitor":
        monitor(args.interval)
