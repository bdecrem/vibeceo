#!/usr/bin/env python3
"""
Backfill console.md logs to Supabase drift_console_logs table.

Parses the existing console.md file and inserts each cycle as a row.
"""

import os
import re
import sys
from datetime import datetime
from pathlib import Path

# Add parent to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv

# Load environment - try multiple paths
env_paths = [
    Path(__file__).parent.parent.parent.parent / "sms-bot" / ".env.local",
    Path.home() / "Documents" / "code" / "vibeceo" / "sms-bot" / ".env.local",
]
for env_path in env_paths:
    if env_path.exists():
        load_dotenv(env_path, override=True)
        print(f"Loaded env from {env_path}")
        break

from supabase import create_client

# Supabase setup
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")


def parse_time(time_str: str, date_str: str) -> datetime:
    """Parse time string like '22:39:05' with date like '2025-12-12' to datetime."""
    try:
        return datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
    except ValueError:
        return datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")


def extract_decision(line: str) -> dict | None:
    """Extract decision info from a research result line."""
    # Pattern: [Drift] SYMBOL: DECISION (confidence: XX%)
    match = re.search(r'\[Drift\] ([A-Z/]+): (BUY|SELL|HOLD|PASS) \(confidence: (\d+)%\)', line)
    if match:
        return {
            "symbol": match.group(1),
            "decision": match.group(2).lower(),
            "confidence": int(match.group(3)),
        }
    return None


def extract_web_searches(line: str) -> int | None:
    """Extract web search count from line."""
    match = re.search(r'Web searches performed: (\d+)', line)
    if match:
        return int(match.group(1))
    return None


def parse_cycle(cycle_text: str, date_str: str) -> dict | None:
    """Parse a single cycle block into structured data."""
    lines = cycle_text.strip().split('\n')
    if not lines:
        return None

    # Extract cycle number and mode from header
    # Patterns: "--- Cycle 7 (crypto) ---" or "`18:00:52` --- Cycle 8 (crypto) ---"
    header_match = re.search(r'Cycle (\d+) \(([^)]+)\)', lines[0])
    if not header_match:
        return None

    cycle_number = int(header_match.group(1))
    mode = header_match.group(2)

    entries = []
    research_results = {}
    trades = []
    triggers_found = 0
    web_searches = 0
    started_at = None
    completed_at = None
    status = "completed"
    message = ""

    current_research_symbol = None

    for line in lines[1:]:
        # Extract timestamp from line
        time_match = re.search(r'`(\d{2}:\d{2}:\d{2})`', line)
        timestamp = None
        if time_match:
            try:
                timestamp = parse_time(time_match.group(1), date_str)
                if started_at is None:
                    started_at = timestamp
                completed_at = timestamp
            except:
                pass

        # Clean line for entry
        clean_line = re.sub(r'`\d{2}:\d{2}:\d{2}`\s*', '', line).strip()
        if not clean_line:
            continue

        # Add to entries
        entry = {
            "timestamp": timestamp.isoformat() if timestamp else datetime.now().isoformat(),
            "message": clean_line,
        }
        entries.append(entry)

        # Parse specific patterns

        # Scan complete - extract trigger count
        scan_match = re.search(r'Scan complete: (\d+) triggers', clean_line)
        if scan_match:
            triggers_found = int(scan_match.group(1))

        # Research start
        research_match = re.search(r'\[Drift\] Researching ([A-Z/]+):', clean_line)
        if research_match:
            current_research_symbol = research_match.group(1)

        # Research decision
        decision = extract_decision(clean_line)
        if decision and current_research_symbol:
            research_results[decision["symbol"]] = {
                "decision": decision["decision"],
                "confidence": decision["confidence"],
                "thesis": "",  # Not easily extractable from condensed logs
                "searches_performed": [],
                "key_findings": [],
            }

        # Web searches
        ws_count = extract_web_searches(clean_line)
        if ws_count:
            web_searches += ws_count
            if current_research_symbol and current_research_symbol in research_results:
                research_results[current_research_symbol]["searches_performed"] = [f"search_{i+1}" for i in range(ws_count)]

        # Completion message
        if "completed:" in clean_line:
            message = clean_line
            # Extract actions from completion
            actions_match = re.search(r'(\d+) actions', clean_line)
            if actions_match:
                actions_count = int(actions_match.group(1))

        # Trade executions (BUY with budget info)
        if "Budget:" in clean_line and "Invested:" in clean_line:
            # This follows a BUY decision
            pass

        # Blocked trades
        if "SECTOR LIMIT:" in clean_line or "BLOCKED:" in clean_line:
            pass  # These are logged but not actual trades

    if not started_at:
        # Fallback to midnight of the date
        started_at = datetime.strptime(date_str, "%Y-%m-%d")
    if not completed_at:
        completed_at = started_at

    duration = (completed_at - started_at).total_seconds()

    return {
        "cycle_number": cycle_number,
        "mode": mode,
        "log_date": date_str,
        "started_at": started_at.isoformat(),
        "completed_at": completed_at.isoformat(),
        "cycle_duration_seconds": duration,
        "status": status,
        "message": message or f"Processed {triggers_found} triggers",
        "triggers_found": triggers_found,
        "triggers_researched": len(research_results),
        "actions_taken": 0,  # Hard to determine from logs
        "web_searches_performed": web_searches,
        "entries": entries,
        "research_results": research_results,
        "trades": trades,
        "portfolio_snapshot": {},
    }


def parse_console_md(file_path: str) -> list[dict]:
    """Parse console.md and return list of cycle records."""
    with open(file_path, 'r') as f:
        content = f.read()

    cycles = []
    current_date = None

    # Split by date headers
    date_pattern = r'## (\d{4}-\d{2}-\d{2})'

    # Find all dates
    date_matches = list(re.finditer(date_pattern, content))

    for i, match in enumerate(date_matches):
        current_date = match.group(1)
        start_pos = match.end()

        # Find end position (next date or end of file)
        if i + 1 < len(date_matches):
            end_pos = date_matches[i + 1].start()
        else:
            end_pos = len(content)

        date_content = content[start_pos:end_pos]

        # Split into cycles - handle both formats
        # Format 1: "\n--- Cycle N (mode) ---"
        # Format 2: "`timestamp` --- Cycle N (mode) ---"
        cycle_pattern = r'(?:^|\n)(?:`\d{2}:\d{2}:\d{2}`\s*)?--- Cycle \d+ \([^)]+\) ---'
        cycle_starts = list(re.finditer(cycle_pattern, date_content))

        for j, cycle_match in enumerate(cycle_starts):
            cycle_start = cycle_match.start()

            # Find end of this cycle
            if j + 1 < len(cycle_starts):
                cycle_end = cycle_starts[j + 1].start()
            else:
                cycle_end = len(date_content)

            cycle_text = date_content[cycle_start:cycle_end].strip()

            if cycle_text:
                parsed = parse_cycle(cycle_text, current_date)
                if parsed:
                    cycles.append(parsed)

    return cycles


def backfill_to_supabase(cycles: list[dict], dry_run: bool = False):
    """Insert cycles into Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Error: Supabase credentials not found")
        return

    client = create_client(SUPABASE_URL, SUPABASE_KEY)

    print(f"Found {len(cycles)} cycles to backfill")

    if dry_run:
        print("\n[DRY RUN] Would insert the following cycles:")
        for c in cycles[:5]:  # Show first 5
            print(f"  - Cycle {c['cycle_number']} ({c['mode']}) on {c['log_date']}: {c['triggers_found']} triggers, {c['web_searches_performed']} searches")
        if len(cycles) > 5:
            print(f"  ... and {len(cycles) - 5} more")
        return

    # Insert in batches
    batch_size = 50
    inserted = 0

    for i in range(0, len(cycles), batch_size):
        batch = cycles[i:i + batch_size]
        try:
            result = client.table("drift_console_logs").insert(batch).execute()
            inserted += len(result.data) if result.data else 0
            print(f"Inserted batch {i // batch_size + 1}: {len(batch)} cycles")
        except Exception as e:
            print(f"Error inserting batch: {e}")
            # Try one by one for this batch
            for cycle in batch:
                try:
                    client.table("drift_console_logs").insert(cycle).execute()
                    inserted += 1
                except Exception as e2:
                    print(f"  Failed cycle {cycle['cycle_number']} ({cycle['log_date']}): {e2}")

    print(f"\nDone! Inserted {inserted}/{len(cycles)} cycles")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Backfill console.md to Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Parse but don't insert")
    parser.add_argument("--file", default=None, help="Path to console.md")
    args = parser.parse_args()

    # Find console.md
    if args.file:
        console_path = args.file
    else:
        console_path = Path(__file__).parent.parent / "console.md"

    if not Path(console_path).exists():
        print(f"Error: {console_path} not found")
        sys.exit(1)

    print(f"Parsing {console_path}...")
    cycles = parse_console_md(console_path)

    # Sort by date and cycle number (oldest first for insertion)
    cycles.sort(key=lambda c: (c["log_date"], c["cycle_number"]))

    backfill_to_supabase(cycles, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
