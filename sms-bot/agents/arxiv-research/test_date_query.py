#!/usr/bin/env python3
"""
Test date-based query to understand the date format issue
"""

import arxiv
from datetime import datetime, timedelta

print("Testing date-based queries...")
print("=" * 60)

# Test 1: Get recent papers without date filter
print("\n1. Most recent cs.AI papers (no date filter):")
client = arxiv.Client()
search = arxiv.Search(
    query='cat:cs.AI',
    max_results=5,
    sort_by=arxiv.SortCriterion.SubmittedDate,
    sort_order=arxiv.SortOrder.Descending
)

for result in client.results(search):
    print(f"   Published: {result.published}")
    print(f"   Updated: {result.updated}")
    print(f"   Title: {result.title[:60]}...")
    print()

# Test 2: Try query with date range (last 7 days)
print("\n2. Testing date range query (last 7 days):")
today = datetime.now()
week_ago = today - timedelta(days=7)

# Try different date formats
date_formats = [
    (today.strftime("%Y%m%d0000"), today.strftime("%Y%m%d2359")),  # Our current format
    (week_ago.strftime("%Y%m%d"), today.strftime("%Y%m%d")),       # YYYYMMDD
    (week_ago.strftime("%Y-%m-%d"), today.strftime("%Y-%m-%d")),   # YYYY-MM-DD
]

for start, end in date_formats[:1]:  # Test just the first one
    query = f"cat:cs.AI AND submittedDate:[{start} TO {end}]"
    print(f"\nQuery: {query}")

    search = arxiv.Search(
        query=query,
        max_results=5,
        sort_by=arxiv.SortCriterion.SubmittedDate
    )

    count = 0
    for result in client.results(search):
        count += 1
        print(f"   {count}. {result.title[:50]}... ({result.published.date()})")

    print(f"   Total: {count} papers")

print("\n" + "=" * 60)
