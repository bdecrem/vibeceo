#!/usr/bin/env python3
"""
Author Enrichment Agent - Fetch GitHub stars and OpenAlex data

This script enriches Author nodes in Neo4j with:
1. GitHub stars - extracted from paper abstracts, aggregated per author
2. OpenAlex data - affiliations, h-index, citations

Usage:
    python3 enrich_authors.py --arxiv-ids 2501.12345v1,2501.12346v1
    python3 enrich_authors.py --all  # Process all papers in database
"""

import argparse
import os
import re
import sys
import time
from collections import defaultdict
from typing import Dict, List, Set, Optional
from urllib.parse import urlparse

import requests
from neo4j import GraphDatabase

# GitHub API configuration
GITHUB_API_BASE = "https://api.github.com"
GITHUB_TOKEN = os.getenv("GITHUB_API_TOKEN")

# OpenAlex API configuration
OPENALEX_API_BASE = "https://api.openalex.org"
OPENALEX_EMAIL = os.getenv("OPENALEX_EMAIL", "bart@advisorsfoundry.com")  # For polite pool (10 req/sec)

# Rate limiting and retry configuration
MAX_RETRIES = 5
BASE_DELAY = 1  # seconds
MAX_DELAY = 32  # seconds
REQUEST_DELAY = 0.1  # Base delay between requests (10 req/sec with polite pool)
BATCH_SIZE = 50  # OpenAlex allows up to 50 IDs per request

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

# Institution tier mapping (for notability bonus)
TIER_1_INSTITUTIONS = {
    "openai", "deepmind", "google brain", "meta ai", "fair",
    "microsoft research", "anthropic", "stanford", "mit",
    "berkeley", "carnegie mellon", "cmu"
}

TIER_2_INSTITUTIONS = {
    "harvard", "princeton", "yale", "oxford", "cambridge",
    "toronto", "nyu", "cornell", "ucla", "ucsd", "uw", "washington"
}


def extract_github_repos_from_abstract(abstract: str) -> List[str]:
    """Extract GitHub repository URLs from paper abstract."""
    # Match github.com/username/repo (with various URL formats)
    pattern = r'github\.com/([a-zA-Z0-9_-]+)/([a-zA-Z0-9_.-]+)'
    matches = re.findall(pattern, abstract, re.IGNORECASE)

    repos = []
    for username, repo in matches:
        # Clean up repo name (remove trailing punctuation, .git, etc)
        repo = re.sub(r'\.(git|html?)$', '', repo)
        repo = re.sub(r'[.,;:\)]+$', '', repo)
        repos.append(f"{username}/{repo}")

    return repos


def get_github_repo_stars(owner: str, repo: str) -> Optional[int]:
    """Fetch star count for a GitHub repository."""
    url = f"{GITHUB_API_BASE}/repos/{owner}/{repo}"
    headers = {}

    if GITHUB_TOKEN:
        headers["Authorization"] = f"token {GITHUB_TOKEN}"

    try:
        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code == 200:
            data = response.json()
            return data.get("stargazers_count", 0)
        elif response.status_code == 404:
            print(f"  ⚠️  Repo not found: {owner}/{repo}")
            return None
        elif response.status_code == 403:
            print(f"  ⚠️  GitHub rate limit exceeded")
            return None
        else:
            print(f"  ⚠️  GitHub API error {response.status_code} for {owner}/{repo}")
            return None

    except Exception as e:
        print(f"  ⚠️  Error fetching {owner}/{repo}: {e}")
        return None


def make_request_with_backoff(url: str, params: Dict, headers: Dict, context: str) -> Optional[Dict]:
    """Make HTTP request with exponential backoff on rate limit errors."""
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(url, params=params, headers=headers, timeout=10)

            if response.status_code == 200:
                return response.json()
            elif response.status_code == 404:
                return None
            elif response.status_code == 429:
                # Rate limit - exponential backoff
                delay = min(BASE_DELAY * (2 ** attempt), MAX_DELAY)
                print(f"  ⚠️  Rate limited (429) - waiting {delay}s before retry {attempt + 1}/{MAX_RETRIES}")
                time.sleep(delay)
                continue
            else:
                print(f"  ⚠️  API error {response.status_code} for {context}")
                print(f"       URL: {response.url}")
                print(f"       Response: {response.text[:200]}")
                return None

        except Exception as e:
            print(f"  ⚠️  Error fetching {context}: {e}")
            return None

    print(f"  ❌ Max retries exceeded for {context}")
    return None


def get_openalex_works_batch(arxiv_ids: List[str]) -> List[Dict]:
    """Fetch multiple papers from OpenAlex in a single batch request.

    Note: OpenAlex has an indexing delay of days to weeks for new papers.
    Very recent arXiv papers may not be available yet.
    """
    if not arxiv_ids:
        return []

    # Remove version suffixes and format as DOI
    # OpenAlex indexes arXiv papers by their DOI: 10.48550/arxiv.XXXXX
    clean_ids = [re.sub(r'v\d+$', '', aid) for aid in arxiv_ids]
    doi_list = [f"10.48550/arxiv.{aid}" for aid in clean_ids]

    # Join with pipe for batch query
    filter_str = "|".join(doi_list)

    url = f"{OPENALEX_API_BASE}/works"
    params = {
        "filter": f"doi:{filter_str}",
        "per-page": 200,
        "select": "id,ids,authorships,cited_by_count",
        "mailto": OPENALEX_EMAIL,
    }

    result = make_request_with_backoff(url, params, {}, f"batch of {len(arxiv_ids)} papers")

    if result and "results" in result:
        return result["results"]
    return []


def search_openalex_author_by_name(author_name: str) -> Optional[Dict]:
    """Search OpenAlex for an author by display name.

    Returns the best match (highest relevance score) or None.
    Includes relevance_score for confidence tracking.
    """
    url = f"{OPENALEX_API_BASE}/authors"
    params = {
        "search": author_name,
        "per-page": 1,  # Only get top result
        "select": "id,display_name,relevance_score,works_count,cited_by_count,summary_stats,last_known_institutions",
        "mailto": OPENALEX_EMAIL,
    }

    result = make_request_with_backoff(url, params, {}, f"author search: {author_name}")

    if result and "results" in result and len(result["results"]) > 0:
        return result["results"][0]
    return None


def get_institution_tier(affiliation: str) -> int:
    """Determine institution tier based on affiliation string."""
    if not affiliation:
        return 0

    affiliation_lower = affiliation.lower()

    for inst in TIER_1_INSTITUTIONS:
        if inst in affiliation_lower:
            return 50  # Top tier bonus

    for inst in TIER_2_INSTITUTIONS:
        if inst in affiliation_lower:
            return 30  # Second tier bonus

    # Any other institution
    return 10


def normalize_author_name(name: str) -> str:
    """Normalize author name for matching."""
    # Remove extra whitespace, convert to lowercase
    return ' '.join(name.lower().split())


def enrich_from_github(driver, arxiv_ids: List[str]) -> Dict[str, int]:
    """Enrich authors with GitHub star counts from paper abstracts."""
    print("\n=== GitHub Enrichment ===\n")

    # Fetch papers with abstracts from Neo4j
    with driver.session(database=NEO4J_DATABASE) as session:
        query = """
        MATCH (p:Paper)
        WHERE p.arxiv_id IN $arxiv_ids AND p.abstract IS NOT NULL
        MATCH (a:Author)-[:AUTHORED]->(p)
        RETURN p.arxiv_id AS arxiv_id, p.abstract AS abstract,
               collect(a.name) AS authors
        """
        result = session.run(query, arxiv_ids=arxiv_ids)
        papers = [dict(record) for record in result]

    if not papers:
        print("No papers found with abstracts")
        return {}

    print(f"Processing {len(papers)} papers for GitHub repos...\n")

    # Extract GitHub repos and map to authors
    author_stars = defaultdict(int)
    repo_cache = {}

    for paper in papers:
        arxiv_id = paper["arxiv_id"]
        abstract = paper["abstract"]
        authors = paper["authors"]

        repos = extract_github_repos_from_abstract(abstract)

        if not repos:
            continue

        print(f"📄 {arxiv_id}: Found {len(repos)} repo(s)")

        for repo_full in repos:
            owner, repo = repo_full.split('/')

            # Check cache first
            if repo_full in repo_cache:
                stars = repo_cache[repo_full]
            else:
                stars = get_github_repo_stars(owner, repo)
                if stars is not None:
                    repo_cache[repo_full] = stars
                    time.sleep(0.1)  # Be nice to GitHub API

            if stars is not None and stars > 0:
                print(f"  ⭐ {repo_full}: {stars} stars")
                # Credit all authors of this paper
                for author in authors:
                    author_stars[author] += stars

            # Rate limiting for GitHub API
            time.sleep(REQUEST_DELAY)

    print(f"\n✓ Enriched {len(author_stars)} authors with GitHub data")
    return dict(author_stars)


def enrich_from_openalex(driver, arxiv_ids: List[str], max_authors: Optional[int] = None) -> Dict[str, Dict]:
    """Enrich authors with OpenAlex data (h-index, citations, affiliations).

    This queries OpenAlex by AUTHOR NAME (not paper ID), so it works even for
    brand new papers that aren't indexed yet - we get the author's existing profile.
    """
    print("\n=== OpenAlex Enrichment ===\n")

    # Get author names from Neo4j for these papers
    with driver.session(database=NEO4J_DATABASE) as session:
        query = """
        MATCH (p:Paper)-[:AUTHORED]-(a:Author)
        WHERE p.arxiv_id IN $arxiv_ids
        RETURN DISTINCT a.name AS author_name
        """
        result = session.run(query, arxiv_ids=arxiv_ids)
        author_names = [record["author_name"] for record in result]

    if not author_names:
        print("No authors found in Neo4j for these papers")
        return {}

    # Limit authors if specified
    if max_authors and max_authors < len(author_names):
        print(f"Found {len(author_names)} unique authors from {len(arxiv_ids)} papers")
        print(f"Limiting to first {max_authors} authors (use --max-authors to change)\n")
        author_names = author_names[:max_authors]
    else:
        print(f"Found {len(author_names)} unique authors from {len(arxiv_ids)} papers\n")

    # Search OpenAlex for each author by name
    print(f"Searching OpenAlex for {len(author_names)} authors...\n")
    author_data = {}
    found_count = 0

    for idx, author_name in enumerate(author_names, 1):
        # Search for this author
        author = search_openalex_author_by_name(author_name)

        if author:
            found_count += 1
            openalex_name = author.get("display_name")
            relevance_score = author.get("relevance_score", 0)

            # h_index is in summary_stats
            summary_stats = author.get("summary_stats", {})
            h_index = summary_stats.get("h_index") if summary_stats else None

            citation_count = author.get("cited_by_count")

            # Get institution from last_known_institutions
            institutions = author.get("last_known_institutions", [])
            affiliation_str = None
            if institutions:
                inst = institutions[0]
                affiliation_str = inst.get("display_name")

            # Determine match type and confidence
            is_exact_match = (openalex_name.lower() == author_name.lower())
            match_type = "exact" if is_exact_match else "fuzzy"

            # Normalize relevance score to 0-1 range (OpenAlex scores vary widely)
            # High relevance (>10000) = high confidence, low relevance (<1000) = low confidence
            if relevance_score > 10000:
                confidence = "high"
            elif relevance_score > 5000:
                confidence = "medium"
            else:
                confidence = "low"

            if h_index or citation_count or affiliation_str:
                print(f"  {idx}/{len(author_names)} 👤 {author_name}")
                if not is_exact_match:
                    print(f"     → Matched to: {openalex_name} [confidence: {confidence}, score: {relevance_score:.0f}]")
                if affiliation_str:
                    print(f"     🏛️  {affiliation_str}")
                if h_index:
                    print(f"     📊 h-index: {h_index}")
                if citation_count:
                    print(f"     📚 {citation_count:,} citations")

                # Use the original Neo4j name as key for matching later
                normalized_name = normalize_author_name(author_name)
                author_data[normalized_name] = {
                    "original_name": author_name,
                    "matched_name": openalex_name,  # NEW: Store who we matched to
                    "match_type": match_type,       # NEW: exact or fuzzy
                    "match_confidence": confidence,  # NEW: high, medium, low
                    "relevance_score": relevance_score,  # NEW: Raw OpenAlex score
                    "affiliation": affiliation_str,
                    "h_index": h_index,
                    "citation_count": citation_count,
                    "institution_tier": get_institution_tier(affiliation_str)
                }
        else:
            if (idx - 1) % 10 == 0:  # Print progress every 10 authors
                print(f"  Searching... {idx}/{len(author_names)}")

        # Rate limiting
        time.sleep(REQUEST_DELAY)

    print(f"\n✓ Found {found_count}/{len(author_names)} authors in OpenAlex")
    print(f"✓ Enriched {len(author_data)} authors with complete data")
    return author_data


def update_neo4j_authors(driver, github_stars: Dict[str, int], openalex_data: Dict[str, Dict]):
    """Update Author nodes in Neo4j with enriched data."""
    print("\n=== Updating Neo4j ===\n")

    with driver.session(database=NEO4J_DATABASE) as session:
        updated_count = 0

        # Update GitHub stars
        for author_name, stars in github_stars.items():
            session.run("""
                MATCH (a:Author {name: $name})
                SET a.github_stars = coalesce(a.github_stars, 0) + $stars
            """, name=author_name, stars=stars)
            updated_count += 1

        # Update OpenAlex data
        for normalized_name, data in openalex_data.items():
            original_name = data["original_name"]

            # Try to match by normalized name first, then original
            result = session.run("""
                MATCH (a:Author)
                WHERE toLower(trim(a.name)) = $normalized_name
                SET a.h_index = coalesce($h_index, a.h_index),
                    a.citation_count = coalesce($citation_count, a.citation_count),
                    a.affiliation = coalesce($affiliation, a.affiliation),
                    a.institution_tier = $institution_tier,
                    a.openalex_matched_name = $matched_name,
                    a.openalex_match_type = $match_type,
                    a.openalex_match_confidence = $match_confidence,
                    a.openalex_relevance_score = $relevance_score
                RETURN count(a) AS updated
            """,
                normalized_name=normalized_name,
                h_index=data["h_index"],
                citation_count=data["citation_count"],
                affiliation=data["affiliation"],
                institution_tier=data["institution_tier"],
                matched_name=data["matched_name"],
                match_type=data["match_type"],
                match_confidence=data["match_confidence"],
                relevance_score=data["relevance_score"]
            )

            record = result.single()
            if record and record["updated"] > 0:
                updated_count += 1

    print(f"✓ Updated {updated_count} author records in Neo4j\n")


def main():
    parser = argparse.ArgumentParser(description="Enrich author data with GitHub and OpenAlex")
    parser.add_argument("--arxiv-ids", help="Comma-separated list of arXiv IDs to process")
    parser.add_argument("--all", action="store_true", help="Process all papers in database")
    parser.add_argument("--date", help="Process papers from specific date (YYYY-MM-DD)")
    parser.add_argument("--date-start", help="Process papers from date range start (YYYY-MM-DD)")
    parser.add_argument("--date-end", help="Process papers from date range end (YYYY-MM-DD)")
    parser.add_argument("--limit", type=int, help="Limit number of papers to process")
    parser.add_argument("--max-authors", type=int, help="Maximum number of authors to enrich")

    args = parser.parse_args()

    # Validate environment
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j environment variables")
        sys.exit(1)

    # Connect to Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    try:
        # Determine which papers to process
        if args.arxiv_ids:
            arxiv_ids = [id.strip() for id in args.arxiv_ids.split(',')]
        elif args.date:
            # Single date
            with driver.session(database=NEO4J_DATABASE) as session:
                query = """
                MATCH (p:Paper)
                WHERE p.published_date = date($date)
                RETURN p.arxiv_id AS arxiv_id
                """
                if args.limit:
                    query += f" LIMIT {args.limit}"
                result = session.run(query, date=args.date)
                arxiv_ids = [record["arxiv_id"] for record in result]
        elif args.date_start and args.date_end:
            # Date range
            with driver.session(database=NEO4J_DATABASE) as session:
                query = """
                MATCH (p:Paper)
                WHERE p.published_date >= date($start_date)
                  AND p.published_date <= date($end_date)
                RETURN p.arxiv_id AS arxiv_id
                """
                if args.limit:
                    query += f" LIMIT {args.limit}"
                result = session.run(query, start_date=args.date_start, end_date=args.date_end)
                arxiv_ids = [record["arxiv_id"] for record in result]
        elif args.date_start or args.date_end:
            print("❌ Must specify both --date-start and --date-end for date range")
            sys.exit(1)
        elif args.all:
            with driver.session(database=NEO4J_DATABASE) as session:
                query = "MATCH (p:Paper) RETURN p.arxiv_id AS arxiv_id"
                if args.limit:
                    query += f" LIMIT {args.limit}"
                result = session.run(query)
                arxiv_ids = [record["arxiv_id"] for record in result]
        else:
            print("❌ Must specify --arxiv-ids, --date, --date-start/--date-end, or --all")
            sys.exit(1)

        print(f"\n🚀 Processing {len(arxiv_ids)} papers...")

        # Enrich from both sources
        github_stars = enrich_from_github(driver, arxiv_ids)
        openalex_data = enrich_from_openalex(driver, arxiv_ids, max_authors=args.max_authors)

        # Update Neo4j
        update_neo4j_authors(driver, github_stars, openalex_data)

        print("✅ Author enrichment complete!")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
