#!/usr/bin/env python3
"""
i3-1 Weekly Strategist Runner

Generates a weekly trading strategy using LLM + WebSearch.
Outputs state/strategy.json for the Daily Executor to use.

Usage:
    python i3_1_run_strategist.py              # Run strategist
    python i3_1_run_strategist.py --verbose    # With progress output
    python i3_1_run_strategist.py --dry-run    # Show prompt only
"""

import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from strategist.weekly_strategist import main

if __name__ == '__main__':
    raise SystemExit(main())
