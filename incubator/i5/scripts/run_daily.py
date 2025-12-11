#!/usr/bin/env python3
"""
Run the daily i5 podcast pipeline.

Usage:
    python scripts/run_daily.py
    python scripts/run_daily.py --dry-run
    python scripts/run_daily.py --skip-review
"""

import argparse
import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.pipeline import DailyPipeline


async def main():
    parser = argparse.ArgumentParser(description="Run daily i5 pipeline")
    parser.add_argument("--dry-run", action="store_true",
                        help="Run pipeline without publishing")
    parser.add_argument("--skip-review", action="store_true",
                        help="Skip human review step")
    parser.add_argument("--config", default="config/settings.yaml",
                        help="Path to config file")

    args = parser.parse_args()

    pipeline = DailyPipeline(config_path=args.config)

    if args.dry_run:
        print("=== DRY RUN MODE ===")
        # Just run through screening, don't publish

    result = await pipeline.run()

    print("\n=== RESULT ===")
    for k, v in result.items():
        print(f"{k}: {v}")


if __name__ == "__main__":
    asyncio.run(main())
