#!/usr/bin/env python3
"""Test what OpenAlex actually returns for a paper."""

import requests
import json

# Test with a known arXiv paper
arxiv_id = "2402.08075"  # From the Feb 2024 range being processed

# Build DOI
doi = f"https://doi.org/10.48550/arXiv.{arxiv_id}"

# Query OpenAlex
url = "https://api.openalex.org/works"
params = {
    'filter': f'doi:{doi}',
    'per_page': 1
}

response = requests.get(url, params=params)
data = response.json()

if data['results']:
    paper = data['results'][0]
    print(f"Title: {paper.get('title')}")
    print(f"\nAuthorships ({len(paper.get('authorships', []))}):")
    print(json.dumps(paper.get('authorships', []), indent=2))
else:
    print("No results found")
