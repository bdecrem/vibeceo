"""
Trader Agent - Commodity ETF Trading

Strategy:
- Buy SGOL/CPER on 2-3% pullback from recent highs
- Buy SCO (inverse oil) when oil spikes
- Exit: +5% profit, -5% stop, or end of day

State stored in Supabase (amber_state table).
Designed to run on Railway via scheduler.
"""

import json
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from typing import Optional
import pytz

from alpaca_client import AlpacaClient, is_market_open, get_market_status
from config import (
    GOLD_SYMBOL,
    OIL_INVERSE_SYMBOL,
    COPPER_SYMBOL,
    BUDGET_PER_SIDE,
    PULLBACK_THRESHOLD,
    PROFIT_TARGET,
    STOP_LOSS,
    LOOKBACK_DAYS,
    SUPABASE_URL,
    SUPABASE_KEY,
    VERBOSE,
)

# Timezone
ET = pytz.timezone('America/New_York')
PT = pytz.timezone('America/Los_Angeles')


# =============================================================================
# SUPABASE STATE MANAGEMENT
# =============================================================================

def supabase_request(method: str, endpoint: str, data: Optional[dict] = None) -> dict:
    """Make a request to Supabase REST API."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY required")

    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }

    try:
        if data:
            payload = json.dumps(data).encode()
            req = urllib.request.Request(url, data=payload, method=method, headers=headers)
        else:
            req = urllib.request.Request(url, method=method, headers=headers)

        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else str(e)
        print(f"[trader] Supabase error {e.code}: {error_body}", file=sys.stderr)
        return {"error": error_body}
    except Exception as e:
        print(f"[trader] Supabase error: {e}", file=sys.stderr)
        return {"error": str(e)}


def load_state() -> dict:
    """Load trading state from Supabase."""
    try:
        endpoint = "amber_state?type=eq.trader_state&order=created_at.desc&limit=1"
        result = supabase_request("GET", endpoint)

        if isinstance(result, list) and len(result) > 0:
            content = result[0].get("content", "{}")
            return json.loads(content) if isinstance(content, str) else content

        # Default state
        return {
            "gold_position": None,
            "oil_position": None,
            "copper_position": None,
            "day": 1,
            "last_check": None,
        }
    except Exception as e:
        print(f"[trader] Error loading state: {e}", file=sys.stderr)
        return {"gold_position": None, "oil_position": None, "copper_position": None, "day": 1}


def save_state(state: dict):
    """Save trading state to Supabase."""
    try:
        data = {
            "type": "trader_state",
            "content": json.dumps(state),
            "source": "trader_agent",
            "metadata": {"updated_at": datetime.now(PT).isoformat()},
        }
        supabase_request("POST", "amber_state", data)
        if VERBOSE:
            print(f"[trader] State saved")
    except Exception as e:
        print(f"[trader] Error saving state: {e}", file=sys.stderr)


def log_trade(event_type: str, data: dict):
    """Log a trade event to Supabase."""
    try:
        log_data = {
            "type": "trader_log",
            "content": f"{event_type}: {data.get('symbol', 'unknown')}",
            "source": "trader_agent",
            "metadata": {
                "event_type": event_type,
                "timestamp": datetime.now(PT).isoformat(),
                **data,
            },
        }
        supabase_request("POST", "amber_state", log_data)
        print(f"[{event_type}] {data}")
    except Exception as e:
        print(f"[trader] Error logging trade: {e}", file=sys.stderr)


# =============================================================================
# ANALYSIS
# =============================================================================

def get_recent_high(client: AlpacaClient, symbol: str, days: int = LOOKBACK_DAYS) -> Optional[float]:
    """Get the highest price in the last N days."""
    bars = client.get_bars(symbol, days=days + 5)
    if not bars:
        return None

    highs = [bar["high"] for bar in bars[-days:]]
    return max(highs) if highs else None


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
    """Main trading check - called by scheduler."""
    print(f"\n{'='*60}")
    print(f"Trader Agent - {datetime.now(PT).strftime('%Y-%m-%d %H:%M:%S PT')}")
    print(f"{'='*60}")

    # Check market status
    market = get_market_status()
    print(f"Market: {'OPEN' if market['is_open'] else 'CLOSED'} ({market['current_time_et']})")

    if not market['is_open']:
        print("Market closed. Skipping.")
        return {"status": "market_closed"}

    # Initialize client
    client = AlpacaClient()
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

    trades_executed = []

    # =================================
    # EXIT LOGIC
    # =================================

    for pos, symbol, state_key in [
        (gold_pos, GOLD_SYMBOL, "gold_position"),
        (oil_pos, OIL_INVERSE_SYMBOL, "oil_position"),
        (copper_pos, COPPER_SYMBOL, "copper_position"),
    ]:
        if pos:
            should_exit, reason = check_exit_conditions(
                pos['avg_entry_price'],
                pos['current_price']
            )

            if should_exit or is_end_of_day():
                exit_reason = reason if should_exit else "end_of_day"
                print(f"\n🔴 SELLING {symbol}: {exit_reason}")

                result = client.sell(symbol, reason=exit_reason)
                if result:
                    log_trade("SELL", {
                        "symbol": symbol,
                        "qty": pos['qty'],
                        "entry_price": pos['avg_entry_price'],
                        "exit_price": pos['current_price'],
                        "pnl_pct": pos['unrealized_plpc'],
                        "reason": exit_reason,
                    })
                    state[state_key] = None
                    trades_executed.append(f"SELL {symbol}")

    # =================================
    # ENTRY LOGIC
    # =================================

    # Gold entry
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
                    log_trade("BUY", {
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
                    trades_executed.append(f"BUY {GOLD_SYMBOL}")

    # Copper entry
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
                    log_trade("BUY", {
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
                    trades_executed.append(f"BUY {COPPER_SYMBOL}")

    # =================================
    # DAY 2+: Oil inverse entries
    # =================================

    if state.get("day", 1) >= 2 and not oil_pos and oil_inv_price:
        print(f"\nOil watching: Day {state.get('day', 1)}, ready for SCO entries")

    # Save state
    state["last_check"] = datetime.now(PT).isoformat()
    save_state(state)

    print(f"\n{'='*60}")
    print(f"Check complete. Trades: {len(trades_executed)}")

    return {
        "status": "ok",
        "trades": trades_executed,
        "positions": {
            "gold": bool(gold_pos),
            "oil": bool(oil_pos),
            "copper": bool(copper_pos),
        },
    }


def show_status():
    """Show current portfolio status from Alpaca."""
    print("\n=== Trader Status ===\n")

    # Get actual Alpaca account and positions
    try:
        client = AlpacaClient()
        account = client.get_account()

        print(f"Account ({('PAPER' if client.paper else 'LIVE')}):")
        print(f"  Cash:            ${account['cash']:,.2f}")
        print(f"  Portfolio Value: ${account['portfolio_value']:,.2f}")
        print(f"  Buying Power:    ${account['buying_power']:,.2f}")

        positions = client.get_positions()
        if positions:
            print(f"\nPositions ({len(positions)}):")
            for pos in positions:
                pnl_emoji = "🟢" if pos['unrealized_plpc'] >= 0 else "🔴"
                print(f"  {pos['symbol']}: {pos['qty']:.4f} shares @ ${pos['avg_entry_price']:.2f}")
                print(f"    Current: ${pos['current_price']:.2f} | P&L: {pnl_emoji} {pos['unrealized_plpc']:+.1f}% (${pos['unrealized_pl']:+.2f})")
        else:
            print("\nNo open positions.")

        # Market status
        market = get_market_status()
        print(f"\nMarket: {'OPEN' if market['is_open'] else 'CLOSED'} ({market['current_time_et']})")

    except Exception as e:
        print(f"Error connecting to Alpaca: {e}")

    # Show strategy state from Supabase
    print("\n--- Strategy State (Supabase) ---")
    state = load_state()
    print(f"  Day: {state.get('day', 1)}")
    print(f"  Last check: {state.get('last_check', 'never')}")

    # Get recent trade logs
    try:
        endpoint = "amber_state?type=eq.trader_log&order=created_at.desc&limit=5"
        logs = supabase_request("GET", endpoint)
        if isinstance(logs, list) and logs:
            print(f"\nRecent trades ({len(logs)} shown):")
            for log in logs:
                meta = log.get("metadata", {})
                print(f"  {meta.get('timestamp', '?')}: {meta.get('event_type', '?')} {meta.get('symbol', '')} - {meta.get('reason', '')}")
    except Exception as e:
        print(f"Error fetching logs: {e}")


def monitor(interval_minutes: int = 15):
    """Run continuously, checking every N minutes during market hours."""
    import time

    print(f"\n{'='*60}")
    print("TRADER AGENT - MONITOR MODE")
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
                print(f"[{now_pt.strftime('%H:%M:%S')}] Market closed. ({market['current_time_et']})")

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

    parser = argparse.ArgumentParser(description="Trader Agent")
    parser.add_argument("command", choices=["run", "status", "monitor"],
                        default="run", nargs="?",
                        help="Command to execute")
    parser.add_argument("--interval", type=int, default=15,
                        help="Monitor interval in minutes (default: 15)")

    args = parser.parse_args()

    if args.command == "run":
        result = run_check()
        # Output JSON for TypeScript to parse
        print(f"\n__RESULT__:{json.dumps(result)}")
    elif args.command == "status":
        show_status()
    elif args.command == "monitor":
        monitor(args.interval)
