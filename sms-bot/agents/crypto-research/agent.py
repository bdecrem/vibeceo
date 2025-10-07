import argparse
import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query

PROMPT_TEMPLATE = """
You are a professional crypto research analyst. Generate a comprehensive daily research report on Bitcoin (BTC) and Ethereum (ETH).

**YOU HAVE WEB SEARCH ACCESS - USE IT!** You have the WebSearch tool available. Use it extensively.

Follow these explicit steps:

1. Search for Bitcoin price
   - Use WebSearch with query: "Bitcoin price today {date_str}"
   - Extract the current price, 24h change, volume from the search results

2. Search for Ethereum price
   - Use WebSearch with query: "Ethereum price today {date_str}"
   - Extract the current price, 24h change, volume from the search results

3. Search for Bitcoin news
   - Use WebSearch with query: "Bitcoin news today {date_str}"
   - Read the search results and extract 3-5 key news items with sources

4. Search for Ethereum news
   - Use WebSearch with query: "Ethereum news today {date_str}"
   - Read the search results and extract 3-5 key news items with sources

5. Search for on-chain data
   - Use WebSearch with query: "Bitcoin on-chain metrics {month_year}"
   - Use WebSearch with query: "Ethereum network activity {month_year}"
   - Extract any relevant metrics from search results

6. Compile all data you found from the searches into a professional report.

7. USE THE WRITE TOOL to save the report to: {output_path}

Critical rules:
- DO NOT say "data unavailable" – you have WebSearch access and must use it.
- Extract actual numbers and data from search results whenever possible.
- Include URLs from your search results as sources.
- If search results do not include exact numbers, provide the best available approximation and note any uncertainty.

Report structure:

# Daily Crypto Research Brief
**Date:** {date_str}
**Generated:** {generated_at}

---

## Executive Summary
[2-3 sentence TL;DR of the market]

---

## Bitcoin (BTC)

### Price Action
- Current Price: $X,XXX
- 24h Change: +X.X% ($XXX)
- 24h Volume: $XX.XB

### Key Developments
- [Development 1 with source]
- [Development 2 with source]
- [Development 3 with source]

### On-Chain Metrics
- [Metric 1]
- [Metric 2]

---

## Ethereum (ETH)

### Price Action
- Current Price: $X,XXX
- 24h Change: +X.X% ($XXX)
- 24h Volume: $XX.XB

### Key Developments
- [Development 1 with source]
- [Development 2 with source]

### Network Activity
- [Activity 1]
- [Activity 2]

---

## Market Sentiment

**Overall Sentiment:** [Bullish/Bearish/Neutral]

**Key Factors:**
- [Factor 1]
- [Factor 2]
- [Factor 3]

---

## Risk Factors to Watch
- [Risk 1]
- [Risk 2]

---

## Sources

- List every reference that informed the report.
- Use this exact markdown format for each entry: `- [Source Name](https://example.com) - one sentence on what the source contributes`.
- Group related links together by repeating the source name if needed.

Important: Always use the Write tool to save the markdown report to the provided path.
"""


def build_prompt(output_path: Path, report_date: datetime) -> str:
    date_str = report_date.strftime('%Y-%m-%d')
    month_year = report_date.strftime('%B %Y')
    generated_at = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')

    return PROMPT_TEMPLATE.format(
        date_str=date_str,
        month_year=month_year,
        generated_at=generated_at,
        output_path=str(output_path),
    )


async def run_agent(output_path: Path, report_date: datetime, verbose: bool) -> None:
    options = ClaudeAgentOptions(
        permission_mode='acceptEdits',
        allowed_tools=['Read', 'Write', 'WebSearch', 'WebFetch', 'Bash'],
        cwd=str(output_path.parent),
    )

    prompt = build_prompt(output_path, report_date)

    async for message in query(prompt=prompt, options=options):
        if not verbose:
            continue

        # When verbose we emit a minimal log so the caller can track progress
        if hasattr(message, 'type'):
            print(f"agent_message:{message.type}")


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Run the crypto research agent.')
    parser.add_argument('--output-dir', required=True, help='Directory to store generated reports')
    parser.add_argument('--date', help='Report date in YYYY-MM-DD (defaults to today)')
    parser.add_argument('--verbose', action='store_true', help='Emit progress logs')
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    report_date = (
        datetime.strptime(args.date, '%Y-%m-%d')
        if args.date
        else datetime.now()
    )

    output_dir = Path(args.output_dir).expanduser().resolve()
    ensure_directory(output_dir)
    output_path = output_dir / f"crypto_research_{report_date.strftime('%Y-%m-%d')}.md"

    try:
        asyncio.run(run_agent(output_path, report_date, verbose=args.verbose))
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({'status': 'error', 'error': str(exc)}))
        return 1

    if not output_path.exists():
        print(json.dumps({'status': 'error', 'error': 'report_not_created'}))
        return 2

    result_payload = {
        'status': 'success',
        'output_file': str(output_path),
        'date': report_date.strftime('%Y-%m-%d'),
    }

    print(json.dumps(result_payload))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
