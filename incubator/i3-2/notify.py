"""
i3-2 (Drift) Trading Agent - SMS Notifications

Sends trade alerts to configured phone numbers via Twilio.
"""

import os
import urllib.request
import urllib.parse
import urllib.error
from base64 import b64encode
from pathlib import Path

# Phone numbers to notify on trades
NOTIFY_PHONES = [
    "+16508989508",  # Bart
    "+14155056910",  # Partner
]


def _load_twilio_env():
    """Load Twilio credentials from sms-bot/.env.local if not set."""
    if os.getenv("TWILIO_ACCOUNT_SID"):
        return

    env_file = Path(__file__).parent.parent.parent / "sms-bot" / ".env.local"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    if key.startswith("TWILIO"):
                        os.environ[key] = val


def send_sms(to_number: str, body: str) -> bool:
    """
    Send SMS via Twilio.

    Returns True if sent successfully, False otherwise.
    """
    _load_twilio_env()

    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_PHONE_NUMBER")

    if not all([account_sid, auth_token, from_number]):
        print("⚠️  SMS notification skipped: Twilio credentials not configured")
        return False

    payload = urllib.parse.urlencode({
        "To": to_number,
        "From": from_number,
        "Body": body,
    }).encode("utf-8")

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    request = urllib.request.Request(url, data=payload)
    basic_auth = b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("ascii")
    request.add_header("Authorization", f"Basic {basic_auth}")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(request) as response:
            return True
    except urllib.error.HTTPError as e:
        print(f"⚠️  SMS failed to {to_number}: {e}")
        return False


def notify_trade(signal: str, asset: str, amount: float, reasoning: str, confidence: int = None):
    """
    Send trade notification to all configured phones.

    Args:
        signal: "BUY" or "SELL" or "PASS"
        asset: Asset symbol (e.g., "NVDA")
        amount: Dollar amount (for BUY) or quantity (for SELL)
        reasoning: Brief explanation / thesis
        confidence: Optional confidence level (0-100)
    """
    emoji = "🟢" if signal == "BUY" else "🔴" if signal == "SELL" else "⏸️"

    conf_str = f" ({confidence}% conf)" if confidence else ""

    if signal == "BUY":
        msg = f"{emoji} Drift TRADE: {signal} ${amount:.2f} of {asset}{conf_str}\n\n{reasoning[:100]}"
    elif signal == "SELL":
        msg = f"{emoji} Drift TRADE: {signal} {asset}{conf_str}\n\n{reasoning[:100]}"
    else:
        msg = f"{emoji} Drift PASS: {asset}\n\n{reasoning[:100]}"

    for phone in NOTIFY_PHONES:
        send_sms(phone, msg)
        print(f"📱 SMS sent to {phone}")


def notify_startup(assets: list, cash: float):
    """
    Send startup notification when agent begins running.

    Args:
        assets: List of assets being watched
        cash: Available cash balance
    """
    msg = f"🤖 Drift (i3-2) Trading Agent started!\n\nWatching: {', '.join(assets[:5])}...\nCash: ${cash:,.2f}\n\nWill SMS you on each trade."

    for phone in NOTIFY_PHONES:
        send_sms(phone, msg)
        print(f"📱 Startup SMS sent to {phone}")


def notify_research(asset: str, thesis: str, confidence: int, decision: str):
    """
    Send research completion notification.

    Args:
        asset: Asset researched
        thesis: The research thesis
        confidence: Confidence level (0-100)
        decision: BUY/SELL/PASS
    """
    emoji = "🔍"
    msg = f"{emoji} Drift RESEARCH: {asset}\n\nThesis: {thesis[:80]}...\nConfidence: {confidence}%\nDecision: {decision}"

    for phone in NOTIFY_PHONES:
        send_sms(phone, msg)
        print(f"📱 Research SMS sent to {phone}")


if __name__ == "__main__":
    # Test SMS
    notify_trade("BUY", "NVDA", 100.00, "Profit-taking dip in strong stock. Buying fear.", confidence=76)
