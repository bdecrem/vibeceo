#!/usr/bin/env python3
"""
Send a one-off SMS through Twilio using project credentials.

Usage example:
  python3 send_manual_sms.py --to +16508989508 --body "AI Papers Daily test"

The script auto-loads environment variables from ../.env.local if present.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from base64 import b64encode
from pathlib import Path
import unicodedata

REQUIRED_ENV_VARS = (
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_PHONE_NUMBER",
)


def load_env_file() -> None:
    """Populate os.environ with values from ../.env.local if not already set."""
    script_dir = Path(__file__).resolve().parent
    env_file = script_dir.parent / ".env.local"

    if not env_file.exists():
        return

    with env_file.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line or line.startswith("#"):
                continue

            key, sep, value = line.partition("=")
            if sep != "=":
                continue

            key = key.strip()
            if key and key not in os.environ:
                os.environ[key] = value.strip()


def load_env_var(name: str) -> str:
    value = os.getenv(name)
    if not value:
        print(f"Missing required environment variable: {name}", file=sys.stderr)
        print(
            "Set it manually or add it to sms-bot/.env.local (TWILIO_*)",
            file=sys.stderr,
        )
        sys.exit(1)
    return value


def clean_for_sms(text: str) -> str:
    """Normalize smart quotes/dashes and strip invisible characters."""

    replacements = {
        "‘": "'",   # left single quote
        "’": "'",   # right single quote
        "“": '"',   # left double quote
        "”": '"',   # right double quote
        "–": "-",   # en dash
        "—": "-",   # em dash
        " ": " ",  # non-breaking space -> regular space
    }

    normalized = text
    for original, replacement in replacements.items():
        normalized = normalized.replace(original, replacement)

    # Remove zero-width and other invisible formatting characters
    normalized = ''.join(
        char for char in normalized
        if unicodedata.category(char) != 'Cf'
    )

    return normalized


def send_sms(to_number: str, body: str) -> dict:
    account_sid = load_env_var("TWILIO_ACCOUNT_SID")
    auth_token = load_env_var("TWILIO_AUTH_TOKEN")
    from_number = load_env_var("TWILIO_PHONE_NUMBER")

    clean_body = clean_for_sms(body)

    payload = urllib.parse.urlencode(
        {
            "To": to_number,
            "From": from_number,
            "Body": clean_body,
        }
    ).encode("utf-8")

    url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
    request = urllib.request.Request(url, data=payload)
    basic_auth = b64encode(f"{account_sid}:{auth_token}".encode("utf-8")).decode("ascii")
    request.add_header("Authorization", f"Basic {basic_auth}")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(request) as response:
            response_body = response.read().decode("utf-8")
            return json.loads(response_body)
    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")
        print("Twilio API request failed:", file=sys.stderr)
        print(error_body, file=sys.stderr)
        sys.exit(1)


def main() -> None:
    load_env_file()

    parser = argparse.ArgumentParser(description="Send an SMS through Twilio")
    parser.add_argument("--to", required=True, help="Destination number in E.164 format")
    parser.add_argument("--body", required=True, help="Message body to send")

    args = parser.parse_args()

    result = send_sms(args.to, args.body)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
