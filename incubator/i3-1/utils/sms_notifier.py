"""
i3-1 Trading Agent - SMS Notifications

Send trade alerts via Twilio SMS.
Uses the existing Twilio infrastructure from sms-bot.
"""

import os
from typing import Optional

# Twilio credentials from environment
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
NOTIFY_PHONE_NUMBER = os.getenv("NOTIFY_PHONE_NUMBER", "+16508989508")  # Default admin


def is_sms_configured() -> bool:
    """Check if Twilio SMS is configured."""
    return all([
        TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN,
        TWILIO_PHONE_NUMBER,
    ])


def send_sms(message: str, to_number: str = None) -> bool:
    """
    Send an SMS message via Twilio.

    Args:
        message: Message text (max 1600 chars for SMS)
        to_number: Recipient phone number (default: NOTIFY_PHONE_NUMBER)

    Returns:
        True if sent successfully, False otherwise
    """
    if not is_sms_configured():
        print("⚠️  SMS not configured (missing Twilio credentials)")
        return False

    to_number = to_number or NOTIFY_PHONE_NUMBER

    try:
        from twilio.rest import Client

        client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

        # Truncate message if too long
        if len(message) > 1600:
            message = message[:1597] + "..."

        sms = client.messages.create(
            body=message,
            from_=TWILIO_PHONE_NUMBER,
            to=to_number,
        )

        print(f"📱 SMS sent: {sms.sid}")
        return True

    except ImportError:
        print("⚠️  twilio package not installed")
        return False
    except Exception as e:
        print(f"❌ SMS failed: {e}")
        return False


def send_trade_alert(
    signal: str,
    asset: str,
    reasoning: str,
    confidence: int,
    order_id: str = None,
) -> bool:
    """
    Send a trade alert SMS.

    Args:
        signal: "BUY" or "SELL"
        asset: Asset symbol
        reasoning: Why the trade was made
        confidence: Confidence level (0-100)
        order_id: Optional order ID

    Returns:
        True if sent successfully
    """
    emoji = "🟢" if signal == "BUY" else "🔴"

    message = f"""
{emoji} i3-1 TRADE ALERT

{signal} {asset}
Confidence: {confidence}%

Reason: {reasoning[:200]}

Order: {order_id or 'N/A'}
""".strip()

    return send_sms(message)


def send_daily_summary(
    trades_count: int,
    portfolio_value: float,
    pnl_pct: float,
    top_holdings: list[str],
) -> bool:
    """
    Send a daily summary SMS.

    Args:
        trades_count: Number of trades today
        portfolio_value: Current portfolio value
        pnl_pct: Today's P&L percentage
        top_holdings: List of top holdings

    Returns:
        True if sent successfully
    """
    pnl_emoji = "📈" if pnl_pct >= 0 else "📉"

    message = f"""
📊 i3-1 DAILY SUMMARY

Portfolio: ${portfolio_value:,.2f}
Today's P&L: {pnl_pct:+.2f}% {pnl_emoji}
Trades: {trades_count}

Holdings: {', '.join(top_holdings[:5]) or 'None'}
""".strip()

    return send_sms(message)


def send_strategy_update(
    thesis: str,
    focus_assets: list[str],
    market_regime: str,
) -> bool:
    """
    Send a strategy update SMS (when new weekly strategy is generated).

    Args:
        thesis: Market thesis
        focus_assets: Assets to focus on
        market_regime: risk_on/risk_off/mixed

    Returns:
        True if sent successfully
    """
    regime_emoji = {
        "risk_on": "🚀",
        "risk_off": "🛡️",
        "mixed": "⚖️",
    }.get(market_regime, "❓")

    message = f"""
🧠 i3-1 NEW STRATEGY

{regime_emoji} Regime: {market_regime.upper()}

Thesis: {thesis[:200]}

Focus: {', '.join(focus_assets[:6])}
""".strip()

    return send_sms(message)
