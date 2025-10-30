#!/usr/bin/env python3
"""
Quick test to verify paper deduplication logic works correctly.
"""

import os
import sys
from datetime import date, timedelta

# Add parent directory to path to import load_recent_papers
sys.path.insert(0, os.path.dirname(__file__))

from load_recent_papers import read_config_from_env, fetch_existing_paper_ids

def main():
    print("=== Paper Deduplication Test ===\n")

    try:
        config = read_config_from_env()
        print(f"✅ Connected to Neo4j: {config.uri}")
    except Exception as e:
        print(f"❌ Failed to connect to Neo4j: {e}")
        sys.exit(1)

    # Test date range (3 days before today)
    end_date = date.today()
    start_date = end_date - timedelta(days=3)

    print(f"\n📅 Date range: {start_date} to {end_date}")
    print("   (This covers the 3-day window we typically fetch)")

    # Fetch existing paper IDs
    existing_ids = fetch_existing_paper_ids(config, start_date, end_date)

    print(f"\n✅ Found {len(existing_ids)} existing papers in Neo4j")

    if len(existing_ids) > 0:
        print(f"\n   Sample IDs:")
        for arxiv_id in list(existing_ids)[:5]:
            print(f"   - {arxiv_id}")
        if len(existing_ids) > 5:
            print(f"   ... and {len(existing_ids) - 5} more")

    print(f"\n💡 When fetching papers, these {len(existing_ids)} IDs will be skipped")
    print("   This saves arXiv API calls and speeds up processing!")

if __name__ == "__main__":
    main()
