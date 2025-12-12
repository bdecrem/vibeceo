"""
i3-2 (Drift) Trading Agent - SMS Notifications

Sends trade alerts to subscribers via Twilio.
Subscribers managed via $DRIFT SUBSCRIBE command in sms-bot.
"""

import os
import json
import urllib.request
import urllib.parse
import urllib.error
from base64 import b64encode
from pathlib import Path

# Agent slug - must match DRIFT_AGENT_SLUG in sms-bot/commands/drift.ts
DRIFT_AGENT_SLUG = "drift-trader"

# Fallback phone numbers (founders always get notified)
FALLBACK_PHONES = [
    "+16508989508",  # Bart
    "+14155056910",  # Partner
]

# SMS limits (UCS-2 encoding)
MAX_SMS_CODE_UNITS = 670  # 10 segments max


def _load_supabase_env():
    """Load Supabase credentials from sms-bot/.env.local if not set."""
    if os.getenv("SUPABASE_URL"):
        return

    env_file = Path(__file__).parent.parent.parent / "sms-bot" / ".env.local"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    if key.startswith("SUPABASE") or key.startswith("NEXT_PUBLIC_SUPABASE"):
                        os.environ[key] = val


def _get_subscribers() -> list[str]:
    """
    Fetch subscriber phone numbers from Supabase.

    Returns list of phone numbers subscribed to drift-trader agent.
    Falls back to FALLBACK_PHONES if Supabase is unavailable.
    """
    _load_supabase_env()

    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        print("⚠️  Supabase not configured, using fallback phones")
        return list(FALLBACK_PHONES)

    try:
        # Query agent_subscriptions joined with sms_subscribers
        # First get subscriber IDs from agent_subscriptions
        url = f"{supabase_url}/rest/v1/agent_subscriptions?agent_slug=eq.{DRIFT_AGENT_SLUG}&active=eq.true&select=subscriber_id"
        request = urllib.request.Request(url)
        request.add_header("apikey", supabase_key)
        request.add_header("Authorization", f"Bearer {supabase_key}")

        with urllib.request.urlopen(request, timeout=10) as response:
            subscriptions = json.loads(response.read().decode())

        if not subscriptions:
            print("📭 No Drift subscribers found, using fallback phones")
            return list(FALLBACK_PHONES)

        subscriber_ids = [s["subscriber_id"] for s in subscriptions]

        # Now get phone numbers from sms_subscribers
        ids_param = ",".join(f'"{sid}"' for sid in subscriber_ids)
        url = f"{supabase_url}/rest/v1/sms_subscribers?id=in.({ids_param})&consent_given=eq.true&unsubscribed=eq.false&select=phone_number"
        request = urllib.request.Request(url)
        request.add_header("apikey", supabase_key)
        request.add_header("Authorization", f"Bearer {supabase_key}")

        with urllib.request.urlopen(request, timeout=10) as response:
            subscribers = json.loads(response.read().decode())

        phones = [s["phone_number"] for s in subscribers if s.get("phone_number")]

        # Always include fallback phones (founders)
        all_phones = set(phones + FALLBACK_PHONES)

        print(f"📱 Found {len(phones)} subscribers + {len(FALLBACK_PHONES)} founders = {len(all_phones)} total")
        return list(all_phones)

    except Exception as e:
        print(f"⚠️  Failed to fetch subscribers: {e}")
        return list(FALLBACK_PHONES)


def _count_ucs2_units(text: str) -> int:
    """Count UCS-2 code units (emojis count as 2+)."""
    count = 0
    for char in text:
        code = ord(char)
        count += 2 if code > 0xFFFF else 1
    return count


def _extract_first_sentence(text: str) -> str:
    """
    Extract first complete sentence from text.
    Returns the sentence with its ending punctuation.
    Handles decimal numbers (e.g., "RSI at 0.0" won't break on the decimal).
    """
    import re

    # Clean up whitespace
    cleaned = re.sub(r'[\r\n]+', ' ', text)
    cleaned = re.sub(r'\s+', ' ', cleaned).strip()

    if not cleaned:
        return ""

    # Find sentence boundary: period/!/?  followed by space+capital or end of string
    # This avoids breaking on decimals like "0.0" or "27.9"
    match = re.search(r'^(.+?[.!?])(?:\s+[A-Z]|$)', cleaned)
    if match:
        return match.group(1).strip()

    # Fallback: find first . ! or ? that's followed by space (not digit)
    match = re.search(r'^(.+?[.!?])(?:\s+[^0-9]|$)', cleaned)
    if match:
        return match.group(1).strip()

    # No clear sentence ending - return first 150 chars with ellipsis
    if len(cleaned) > 150:
        # Find last space before 150
        truncated = cleaned[:150]
        last_space = truncated.rfind(' ')
        if last_space > 100:
            return truncated[:last_space] + "..."
        return truncated + "..."

    return cleaned


def _truncate_to_fit(text: str, max_units: int) -> str:
    """
    Truncate text to fit within max_units, ending at word boundary.
    Adds '...' if truncated.
    """
    if _count_ucs2_units(text) <= max_units:
        return text

    # Reserve space for "..."
    target = max_units - 3

    # Find truncation point at word boundary
    words = text.split()
    result = ""
    for word in words:
        test = (result + " " + word).strip() if result else word
        if _count_ucs2_units(test) > target:
            break
        result = test

    # If we got something, add ellipsis
    if result:
        return result + "..."

    # Fallback: hard cut if no word boundary found
    chars = list(text)
    result = ""
    for char in chars:
        if _count_ucs2_units(result + char + "...") > max_units:
            break
        result += char
    return result + "..."


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

    Format: Compact single-message with complete sentence.
    Example: 🟢 Drift BUY $60 GOOGL — RSI-2 oversold in strong name with solid fundamentals.

    Args:
        signal: "BUY" or "SELL" or "PASS"
        asset: Asset symbol (e.g., "NVDA")
        amount: Dollar amount (for BUY) or quantity (for SELL)
        reasoning: Brief explanation / thesis
        confidence: Optional confidence level (0-100)
    """
    emoji = "🟢" if signal == "BUY" else "🔴" if signal == "SELL" else "⏸️"

    # Build compact header
    if signal == "BUY":
        header = f"{emoji} Drift BUY ${amount:.0f} {asset}"
    elif signal == "SELL":
        header = f"{emoji} Drift SELL {asset}"
    else:
        header = f"{emoji} Drift PASS {asset}"

    # Extract first complete sentence from reasoning
    sentence = _extract_first_sentence(reasoning)

    # Build message: header — sentence
    if sentence:
        msg = f"{header} — {sentence}"
    else:
        msg = header

    # If still too long, truncate the sentence part
    if _count_ucs2_units(msg) > MAX_SMS_CODE_UNITS:
        header_part = f"{header} — "
        remaining = MAX_SMS_CODE_UNITS - _count_ucs2_units(header_part)
        msg = header_part + _truncate_to_fit(sentence, remaining)

    phones = _get_subscribers()
    for phone in phones:
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

    phones = _get_subscribers()
    for phone in phones:
        send_sms(phone, msg)
        print(f"📱 Startup SMS sent to {phone}")


def notify_research(asset: str, thesis: str, confidence: int, decision: str):
    """
    Send research completion notification.

    Format: Compact single line with decision and first sentence of thesis.
    Example: 🔍 Drift GOOGL BUY 82% — Strong fundamentals with oversold technicals.

    Args:
        asset: Asset researched
        thesis: The research thesis
        confidence: Confidence level (0-100)
        decision: BUY/SELL/PASS
    """
    emoji = "🔍"

    # Compact header: emoji + agent + asset + decision + confidence
    header = f"{emoji} Drift {asset} {decision} {confidence}%"

    # Extract first complete sentence from thesis
    sentence = _extract_first_sentence(thesis)

    # Build message
    if sentence:
        msg = f"{header} — {sentence}"
    else:
        msg = header

    # If too long, truncate
    if _count_ucs2_units(msg) > MAX_SMS_CODE_UNITS:
        header_part = f"{header} — "
        remaining = MAX_SMS_CODE_UNITS - _count_ucs2_units(header_part)
        msg = header_part + _truncate_to_fit(sentence, remaining)

    phones = _get_subscribers()
    for phone in phones:
        send_sms(phone, msg)
        print(f"📱 Research SMS sent to {phone}")


if __name__ == "__main__":
    # Test SMS with long reasoning that should truncate at word boundary
    long_reasoning = (
        "GOOGL presents a high-conviction swing trade opportunity with RSI-2 at oversold "
        "13.5 levels despite the broader market showing mixed signals. The technical setup "
        "suggests a mean reversion play while fundamentals remain strong with growing AI "
        "and cloud revenue streams that position the company well for continued growth."
    )
    notify_trade("BUY", "GOOGL", 75.00, long_reasoning, confidence=82)
