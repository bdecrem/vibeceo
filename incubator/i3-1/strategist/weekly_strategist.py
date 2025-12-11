"""
i3-1 Trading Agent - Weekly Strategist

LLM-powered market research agent that produces a weekly trading thesis.
Uses claude-agent-sdk with WebSearch to research macro conditions,
crypto sentiment, and sector momentum.

Output: state/strategy.json with focus assets, biases, and thesis.
"""

import argparse
import asyncio
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path

from claude_code_sdk import ClaudeCodeOptions, query

# Assets we can trade (from config)
ALL_ASSETS = {
    "crypto": ["BTC/USD", "ETH/USD", "SOL/USD", "AVAX/USD", "LINK/USD",
               "DOGE/USD", "MATIC/USD", "DOT/USD", "ATOM/USD", "UNI/USD"],
    "stocks": ["SPY", "QQQ", "NVDA", "TSLA", "AAPL",
               "MSFT", "GOOGL", "AMZN", "COIN", "MSTR"],
}

PROMPT_TEMPLATE = """
You are a macro trading strategist preparing a weekly thesis for an automated trading system.

**YOU HAVE WEB SEARCH ACCESS - USE IT!** Use the WebSearch tool extensively to research current market conditions.

Today is {date_str}. You are preparing the thesis for the week of {week_start} to {week_end}.

## Your Task

Research and produce a weekly trading strategy that will guide an automated executor.
The executor can only trade these assets:

**Crypto:** BTC/USD, ETH/USD, SOL/USD, AVAX/USD, LINK/USD, DOGE/USD, MATIC/USD, DOT/USD, ATOM/USD, UNI/USD
**Stocks:** SPY, QQQ, NVDA, TSLA, AAPL, MSFT, GOOGL, AMZN, COIN, MSTR

## Research Steps (use WebSearch for each)

1. **Macro Environment**
   - Search: "Federal Reserve interest rate outlook {month_year}"
   - Search: "US economic data week ahead {date_str}"
   - Search: "market risk sentiment {date_str}"

2. **Crypto Market**
   - Search: "Bitcoin price analysis {date_str}"
   - Search: "cryptocurrency market sentiment {date_str}"
   - Search: "Bitcoin ETF flows {month_year}"

3. **Equity Market**
   - Search: "stock market outlook {date_str}"
   - Search: "tech sector momentum {date_str}"
   - Search: "earnings calendar this week"

4. **Key Events**
   - Search: "economic calendar {week_start}"
   - Search: "crypto events this week {date_str}"

## Output Format

After completing your research, you MUST use the Write tool to save a JSON file to: {output_path}

The JSON must have this exact structure:
```json
{{
  "generated_at": "{generated_at}",
  "valid_until": "{valid_until}",
  "thesis": "2-3 sentence market thesis",
  "market_regime": "risk_on | risk_off | mixed",
  "focus_assets": ["asset1", "asset2", ...],
  "avoid_assets": ["asset1", ...],
  "biases": [
    {{
      "asset": "BTC/USD",
      "bias": "bullish | bearish | neutral",
      "reasoning": "1-2 sentence reasoning",
      "confidence": 75
    }}
  ],
  "max_exposure_pct": 60,
  "key_events": ["Event 1", "Event 2"],
  "sources": ["https://source1.com", "https://source2.com"]
}}
```

## Guidelines

1. **focus_assets**: Pick 4-8 assets with clear directional views. Include asset symbols exactly as listed above.
2. **avoid_assets**: Assets with high uncertainty or negative outlook
3. **biases**: Must include an entry for EVERY asset in focus_assets
4. **confidence**: 0-100, where 70+ means high conviction
5. **max_exposure_pct**: How much of portfolio to deploy (20-80 typical)
6. **market_regime**:
   - "risk_on" = favor growth, crypto, tech
   - "risk_off" = favor defensive, reduce exposure
   - "mixed" = selective opportunities

## Critical Rules

- Use WebSearch for EVERY research step - do not make up data
- Include actual URLs in sources
- Focus on actionable insights, not generic commentary
- The executor will use this to make real trades - be specific and confident
- ALWAYS use the Write tool to save the JSON to the specified path

Now begin your research and produce the weekly strategy.
"""


def build_prompt(output_path: Path, report_date: datetime) -> str:
    """Build the strategist prompt with dates filled in."""
    date_str = report_date.strftime('%Y-%m-%d')
    month_year = report_date.strftime('%B %Y')
    generated_at = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')

    # Calculate week bounds
    week_start = report_date
    week_end = report_date + timedelta(days=7)
    valid_until = (report_date + timedelta(days=7)).strftime('%Y-%m-%dT%H:%M:%SZ')

    return PROMPT_TEMPLATE.format(
        date_str=date_str,
        month_year=month_year,
        generated_at=generated_at,
        valid_until=valid_until,
        week_start=week_start.strftime('%Y-%m-%d'),
        week_end=week_end.strftime('%Y-%m-%d'),
        output_path=str(output_path),
    )


async def run_strategist(output_path: Path, report_date: datetime, verbose: bool) -> None:
    """
    Run the weekly strategist agent.

    Args:
        output_path: Where to save strategy.json
        report_date: Date to generate strategy for
        verbose: Whether to print progress
    """
    options = ClaudeCodeOptions(
        permission_mode='acceptEdits',
        allowed_tools=['Read', 'Write', 'WebSearch', 'WebFetch'],
        cwd=str(output_path.parent),
    )

    prompt = build_prompt(output_path, report_date)

    if verbose:
        print(f"🧠 Starting Weekly Strategist for {report_date.strftime('%Y-%m-%d')}")
        print(f"📁 Output: {output_path}")
        print("🔍 Researching markets...")

    async for message in query(prompt=prompt, options=options):
        if not verbose:
            continue

        # Log progress
        if hasattr(message, 'type'):
            msg_type = message.type
            if msg_type == 'tool_use':
                print(f"  🔧 Using tool...")
            elif msg_type == 'text':
                # Don't print full text, just note progress
                pass


def ensure_directory(path: Path) -> None:
    """Create directory if it doesn't exist."""
    path.mkdir(parents=True, exist_ok=True)


def validate_strategy(strategy_path: Path) -> bool:
    """
    Validate that the generated strategy is well-formed.

    Returns True if valid, False otherwise.
    """
    if not strategy_path.exists():
        return False

    try:
        with open(strategy_path, 'r') as f:
            data = json.load(f)

        required_fields = [
            'generated_at', 'valid_until', 'thesis', 'market_regime',
            'focus_assets', 'biases', 'max_exposure_pct'
        ]

        for field in required_fields:
            if field not in data:
                print(f"❌ Missing required field: {field}")
                return False

        # Validate biases cover focus assets
        focus_assets = set(data.get('focus_assets', []))
        biased_assets = set(b['asset'] for b in data.get('biases', []))

        missing_biases = focus_assets - biased_assets
        if missing_biases:
            print(f"⚠️  Missing biases for: {missing_biases}")

        return True

    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON: {e}")
        return False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='i3-1 Weekly Strategist - Generate trading thesis'
    )
    parser.add_argument(
        '--output-dir',
        default=None,
        help='Directory for strategy.json (default: ./state/)'
    )
    parser.add_argument(
        '--date',
        help='Strategy date YYYY-MM-DD (default: today)'
    )
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Print progress'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show prompt without running'
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Determine date
    report_date = (
        datetime.strptime(args.date, '%Y-%m-%d')
        if args.date
        else datetime.now()
    )

    # Determine output path
    if args.output_dir:
        output_dir = Path(args.output_dir).expanduser().resolve()
    else:
        # Default to state/ directory in same folder as this script
        script_dir = Path(__file__).parent.parent
        output_dir = script_dir / 'state'

    ensure_directory(output_dir)
    output_path = output_dir / 'strategy.json'

    # Dry run - just show the prompt
    if args.dry_run:
        print("=== DRY RUN - Prompt ===\n")
        print(build_prompt(output_path, report_date))
        return 0

    # Run the strategist
    try:
        asyncio.run(run_strategist(output_path, report_date, verbose=args.verbose))
    except Exception as exc:
        print(json.dumps({'status': 'error', 'error': str(exc)}))
        return 1

    # Validate output
    if not validate_strategy(output_path):
        print(json.dumps({'status': 'error', 'error': 'invalid_strategy'}))
        return 2

    # Success
    result = {
        'status': 'success',
        'output_file': str(output_path),
        'date': report_date.strftime('%Y-%m-%d'),
    }
    print(json.dumps(result))

    if args.verbose:
        print(f"\n✅ Strategy saved to {output_path}")
        with open(output_path, 'r') as f:
            data = json.load(f)
        print(f"📊 Thesis: {data.get('thesis', 'N/A')[:100]}...")
        print(f"🎯 Focus: {', '.join(data.get('focus_assets', []))}")

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
