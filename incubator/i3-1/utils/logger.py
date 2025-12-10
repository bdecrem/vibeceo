"""
i3-1 Trading Agent - Verbose Logging

Every decision is narrated, not just logged.
Designed for observability during experimentation.
"""

from datetime import datetime
from typing import Any


def log_banner():
    """Print startup banner."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   i3-1 TRADING AGENT                                         ║
║   Token Tank Experiment                                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
""")


def log_decision(action: str, asset: str, reasoning: str, confidence: int, mode: str):
    """Log a trading decision with full context."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Emoji based on action
    emoji = {"BUY": "🟢", "SELL": "🔴", "HOLD": "⏸️"}.get(action.upper(), "❓")

    print(f"""
╔══════════════════════════════════════════════════════════════╗
║ {emoji} TRADING DECISION @ {timestamp}
╠══════════════════════════════════════════════════════════════╣
║ Action:     {action.upper()}
║ Asset:      {asset}
║ Confidence: {confidence}%
║ Mode:       {mode}
╠══════════════════════════════════════════════════════════════╣
║ Reasoning:
║ {_wrap_text(reasoning, 58)}
╚══════════════════════════════════════════════════════════════╝
""")


def log_trade_executed(action: str, asset: str, quantity: float, price: float, order_id: str):
    """Log a successfully executed trade."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    emoji = "🟢" if action.upper() == "BUY" else "🔴"
    total = quantity * price

    print(f"""
║ {emoji} TRADE EXECUTED @ {timestamp}
║ {action.upper()} {quantity} {asset} @ ${price:,.2f} = ${total:,.2f}
║ Order ID: {order_id}
""")


def log_portfolio(positions: list[dict], cash: float, total_value: float):
    """Log current portfolio status."""
    timestamp = datetime.now().strftime("%H:%M:%S")
    invested = total_value - cash

    print(f"""
📊 PORTFOLIO STATUS @ {timestamp}
├── Cash:      ${cash:,.2f}
├── Invested:  ${invested:,.2f}
├── Total:     ${total_value:,.2f}
└── Positions: {len(positions)}""")

    if positions:
        for pos in positions:
            symbol = pos.get("symbol", "???")
            qty = pos.get("qty", 0)
            market_value = pos.get("market_value", 0)
            pnl = pos.get("unrealized_pl", 0)
            pnl_pct = pos.get("unrealized_plpc", 0)
            pnl_emoji = "📈" if float(pnl) >= 0 else "📉"
            print(f"    {pnl_emoji} {symbol}: {qty} @ ${float(market_value):,.2f} ({float(pnl_pct)*100:+.1f}%)")
    print()


def log_mode_switch(old_mode: str, new_mode: str):
    """Log when strategy mode changes."""
    print(f"🔄 MODE SWITCH: {old_mode} → {new_mode}")


def log_analysis_start(asset: str, mode: str):
    """Log when starting to analyze an asset."""
    print(f"\n{'='*60}")
    print(f"🔍 Analyzing {asset} (Mode {mode})...")


def log_analysis_data(data_source: str, summary: str):
    """Log data being used for analysis."""
    print(f"   📥 {data_source}: {summary[:50]}{'...' if len(summary) > 50 else ''}")


def log_sleep(minutes: int):
    """Log when agent is sleeping."""
    print(f"\n💤 Sleeping {minutes} minutes until next check...")


def log_error(context: str, error: Any):
    """Log an error."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"""
❌ ERROR @ {timestamp}
   Context: {context}
   Error:   {error}
""")


def log_warning(message: str):
    """Log a warning."""
    print(f"⚠️  {message}")


def log_info(message: str):
    """Log informational message."""
    print(f"ℹ️  {message}")


def log_success(message: str):
    """Log success message."""
    print(f"✅ {message}")


def _wrap_text(text: str, width: int) -> str:
    """Wrap text to fit in log box."""
    words = text.split()
    lines = []
    current_line = "║ "

    for word in words:
        if len(current_line) + len(word) + 1 <= width:
            current_line += word + " "
        else:
            lines.append(current_line.rstrip())
            current_line = "║ " + word + " "

    if current_line.strip():
        lines.append(current_line.rstrip())

    return "\n".join(lines) if lines else text
