#!/usr/bin/env python3
"""
Quick test to verify arXiv API is working
"""

import arxiv

print("Testing arXiv API connection...")
print("=" * 60)

client = arxiv.Client()
search = arxiv.Search(
    query='cat:cs.AI',
    max_results=10,
    sort_by=arxiv.SortCriterion.SubmittedDate,
    sort_order=arxiv.SortOrder.Descending
)

count = 0
for result in client.results(search):
    count += 1
    print(f"{count}. {result.title[:70]}")
    print(f"   Published: {result.published.date()}")
    print(f"   Categories: {result.categories}")
    print()

print("=" * 60)
print(f"Total papers fetched: {count}")
print("\n✅ arXiv API is working!" if count > 0 else "\n❌ No papers found")
