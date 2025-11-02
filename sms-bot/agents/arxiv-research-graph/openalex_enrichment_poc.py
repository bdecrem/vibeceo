#!/usr/bin/env python3
"""
OpenAlex Enrichment POC - Paper-Based Matching

Tests the paper-based matching approach with 100 papers from June 2025.
Proves that we can reliably match authors via their position in the author list.

Usage:
    python3 openalex_enrichment_poc.py --dry-run  # Test without writing to Neo4j
    python3 openalex_enrichment_poc.py           # Actually enrich the database
"""

import argparse
import os
import re
import sys
import time
from typing import Dict, List, Optional, Tuple
from difflib import SequenceMatcher

import requests
from neo4j import GraphDatabase

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

# OpenAlex configuration
OPENALEX_API_BASE = "https://api.openalex.org"
OPENALEX_EMAIL = os.getenv("OPENALEX_EMAIL", "bart@advisorsfoundry.com")

# Matching thresholds
NAME_SIMILARITY_THRESHOLD = 0.75  # 75% similarity required
BATCH_SIZE = 50  # OpenAlex allows up to 50 DOIs per request
REQUEST_DELAY = 0.15  # Be polite (6-7 req/sec)

# Statistics
stats = {
    'papers_processed': 0,
    'papers_found_in_openalex': 0,
    'authors_total': 0,
    'authors_matched': 0,
    'authors_enriched': 0,
    'high_confidence_matches': 0,
    'medium_confidence_matches': 0,
    'low_confidence_matches': 0,
}


def name_similarity(name1: str, name2: str) -> float:
    """Calculate similarity between two author names.

    Handles different formats:
    - "John Smith" vs "Smith, John"
    - "J. Smith" vs "John Smith"
    """
    # Normalize: lowercase, remove extra whitespace
    n1 = ' '.join(name1.lower().split())
    n2 = ' '.join(name2.lower().split())

    # Direct comparison
    direct_sim = SequenceMatcher(None, n1, n2).ratio()

    # Try reversing second name (handle "Last, First" format)
    if ',' in n2:
        parts = n2.split(',')
        reversed_n2 = f"{parts[1].strip()} {parts[0].strip()}"
        reversed_sim = SequenceMatcher(None, n1, reversed_n2).ratio()
        return max(direct_sim, reversed_sim)

    return direct_sim


def fetch_openalex_papers_batch(arxiv_ids: List[str]) -> List[Dict]:
    """Fetch papers from OpenAlex by arXiv DOI."""
    if not arxiv_ids:
        return []

    # Remove version suffixes (v1, v2, etc)
    clean_ids = [re.sub(r'v\d+$', '', aid) for aid in arxiv_ids]

    # Format as DOIs
    doi_list = [f"10.48550/arxiv.{aid}" for aid in clean_ids]
    filter_str = "|".join(doi_list)

    url = f"{OPENALEX_API_BASE}/works"
    params = {
        "filter": f"doi:{filter_str}",
        "per-page": 200,
        "select": "id,doi,title,authorships",
        "mailto": OPENALEX_EMAIL,
    }

    try:
        response = requests.get(url, params=params, timeout=30)

        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])
        else:
            print(f"⚠️  OpenAlex API error {response.status_code}")
            return []

    except Exception as e:
        print(f"⚠️  Error fetching from OpenAlex: {e}")
        return []


def fetch_author_profiles_batch(author_ids: List[str]) -> List[Dict]:
    """Fetch author profiles from OpenAlex."""
    if not author_ids:
        return []

    # Remove the https://openalex.org/ prefix
    clean_ids = [aid.replace("https://openalex.org/", "") for aid in author_ids]
    filter_str = "|".join(clean_ids)

    url = f"{OPENALEX_API_BASE}/authors"
    params = {
        "filter": f"openalex:{filter_str}",
        "per-page": 200,
        "select": "id,display_name,summary_stats,cited_by_count,works_count,last_known_institutions",
        "mailto": OPENALEX_EMAIL,
    }

    try:
        response = requests.get(url, params=params, timeout=30)

        if response.status_code == 200:
            data = response.json()
            return data.get("results", [])
        else:
            print(f"⚠️  OpenAlex API error {response.status_code}")
            return []

    except Exception as e:
        print(f"⚠️  Error fetching author profiles: {e}")
        return []


def extract_arxiv_id_from_doi(doi: str) -> str:
    """Extract arXiv ID from DOI string."""
    # DOI format: https://doi.org/10.48550/arxiv.2506.01234
    match = re.search(r'arxiv\.(\d+\.\d+)', doi, re.IGNORECASE)
    if match:
        return match.group(1)
    return ""


def get_neo4j_papers(driver, start_date: str, end_date: str, limit: int) -> List[Dict]:
    """Fetch papers from Neo4j with their authors."""
    with driver.session(database=NEO4J_DATABASE) as session:
        query = """
        MATCH (p:Paper)
        WHERE p.published_date >= date($start_date)
          AND p.published_date <= date($end_date)
        WITH p
        ORDER BY p.published_date DESC
        LIMIT $limit

        MATCH (a:Author)-[r:AUTHORED]->(p)
        WHERE a.canonical_kid IS NOT NULL

        RETURN p.arxiv_id as arxiv_id,
               p.title as title,
               collect({
                 kid: a.kochi_author_id,
                 name: a.name,
                 canonical_kid: a.canonical_kid,
                 position: r.position,
                 has_enrichment: (a.h_index IS NOT NULL OR a.citation_count IS NOT NULL)
               }) as authors
        """

        result = session.run(
            query,
            start_date=start_date,
            end_date=end_date,
            limit=limit
        )

        papers = []
        for record in result:
            # Sort authors by position
            authors = sorted(record["authors"], key=lambda x: x.get("position", 999))
            papers.append({
                "arxiv_id": record["arxiv_id"],
                "title": record["title"],
                "authors": authors
            })

        return papers


def match_authors(neo4j_authors: List[Dict], openalex_authorships: List[Dict]) -> List[Tuple[Dict, Dict, float]]:
    """Match Neo4j authors to OpenAlex authors.

    Returns: List of (neo4j_author, openalex_author, confidence_score)
    """
    matches = []

    # Both lists should be in position order
    for i, neo4j_auth in enumerate(neo4j_authors):
        if i >= len(openalex_authorships):
            # More Neo4j authors than OpenAlex (shouldn't happen, but handle it)
            break

        oa_auth = openalex_authorships[i]

        # Calculate name similarity
        neo4j_name = neo4j_auth['name']
        oa_raw_name = oa_auth.get('raw_author_name', '')
        oa_display_name = oa_auth.get('author', {}).get('display_name', '')

        # Try matching against both raw name and display name
        sim_raw = name_similarity(neo4j_name, oa_raw_name)
        sim_display = name_similarity(neo4j_name, oa_display_name)
        similarity = max(sim_raw, sim_display)

        if similarity >= NAME_SIMILARITY_THRESHOLD:
            matches.append((neo4j_auth, oa_auth, similarity))

    return matches


def update_neo4j_author(driver, kid: str, openalex_data: Dict, confidence: float, dry_run: bool):
    """Update author in Neo4j with OpenAlex data."""

    openalex_id = openalex_data['id']
    h_index = openalex_data.get('summary_stats', {}).get('h_index')
    citation_count = openalex_data.get('cited_by_count')
    works_count = openalex_data.get('works_count')

    # Get institution
    institutions = openalex_data.get('last_known_institutions', [])
    institution = None
    institution_country = None
    if institutions:
        institution = institutions[0].get('display_name')
        institution_country = institutions[0].get('country_code')

    if dry_run:
        print(f"    [DRY RUN] Would update {kid}:")
        print(f"      openalex_id: {openalex_id}")
        if h_index:
            print(f"      h_index: {h_index}")
        if citation_count:
            print(f"      citations: {citation_count:,}")
        if institution:
            print(f"      institution: {institution}")
        return

    with driver.session(database=NEO4J_DATABASE) as session:
        query = """
        MATCH (a:Author {kochi_author_id: $kid})
        SET a.openalex_id = $openalex_id,
            a.openalex_match_confidence = $confidence,
            a.openalex_match_type = 'paper_position',
            a.h_index = $h_index,
            a.citation_count = $citation_count,
            a.works_count = $works_count,
            a.affiliation = CASE WHEN $institution IS NOT NULL THEN $institution ELSE a.affiliation END,
            a.institution_country = $institution_country,
            a.last_updated = datetime()
        RETURN a.kochi_author_id as kid
        """

        result = session.run(
            query,
            kid=kid,
            openalex_id=openalex_id,
            confidence=confidence,
            h_index=h_index,
            citation_count=citation_count,
            works_count=works_count,
            institution=institution,
            institution_country=institution_country
        )

        if result.single():
            stats['authors_enriched'] += 1


def process_papers_batch(driver, papers: List[Dict], dry_run: bool):
    """Process a batch of papers."""
    print(f"\n📦 Processing batch of {len(papers)} papers...")

    # Extract arXiv IDs
    arxiv_ids = [p['arxiv_id'] for p in papers]

    # Fetch from OpenAlex
    print(f"   Fetching from OpenAlex...")
    openalex_papers = fetch_openalex_papers_batch(arxiv_ids)

    if not openalex_papers:
        print(f"   ❌ No papers found in OpenAlex")
        return

    print(f"   ✅ Found {len(openalex_papers)} papers in OpenAlex")
    stats['papers_found_in_openalex'] += len(openalex_papers)

    # Create lookup by arXiv ID
    openalex_by_arxiv = {}
    for oa_paper in openalex_papers:
        arxiv_id = extract_arxiv_id_from_doi(oa_paper.get('doi', ''))
        if arxiv_id:
            openalex_by_arxiv[arxiv_id] = oa_paper

    # Match authors for each paper
    all_matches = []

    for paper in papers:
        stats['papers_processed'] += 1
        arxiv_id_clean = re.sub(r'v\d+$', '', paper['arxiv_id'])

        if arxiv_id_clean not in openalex_by_arxiv:
            continue

        oa_paper = openalex_by_arxiv[arxiv_id_clean]
        oa_authorships = oa_paper.get('authorships', [])

        stats['authors_total'] += len(paper['authors'])

        # Match authors
        matches = match_authors(paper['authors'], oa_authorships)

        for neo4j_auth, oa_auth, confidence in matches:
            stats['authors_matched'] += 1

            # Track confidence distribution
            if confidence >= 0.95:
                stats['high_confidence_matches'] += 1
            elif confidence >= 0.85:
                stats['medium_confidence_matches'] += 1
            else:
                stats['low_confidence_matches'] += 1

            # Only enrich if they don't already have enrichment
            if not neo4j_auth.get('has_enrichment'):
                all_matches.append({
                    'kid': neo4j_auth['kid'],
                    'name': neo4j_auth['name'],
                    'openalex_author_id': oa_auth['author']['id'],
                    'confidence': confidence,
                    'raw_name': oa_auth.get('raw_author_name', '')
                })

    if not all_matches:
        print(f"   No new authors to enrich")
        return

    print(f"   📊 Matched {len(all_matches)} authors")

    # Fetch author profiles in batch
    author_ids = [m['openalex_author_id'] for m in all_matches]
    print(f"   Fetching {len(author_ids)} author profiles...")
    author_profiles = fetch_author_profiles_batch(author_ids)

    # Create lookup
    profiles_by_id = {p['id']: p for p in author_profiles}

    # Update Neo4j
    enriched_count = 0
    for match in all_matches:
        profile = profiles_by_id.get(match['openalex_author_id'])
        if profile:
            update_neo4j_author(
                driver,
                match['kid'],
                profile,
                match['confidence'],
                dry_run
            )
            enriched_count += 1

            if not dry_run and enriched_count % 10 == 0:
                print(f"   ✅ Enriched {enriched_count}/{len(all_matches)} authors...")

    print(f"   ✅ Enriched {enriched_count} authors")


def main():
    parser = argparse.ArgumentParser(description="OpenAlex Enrichment POC")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Test without writing to Neo4j"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Number of papers to process (default: 100)"
    )

    args = parser.parse_args()

    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j credentials")
        print("   Set NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
        sys.exit(1)

    print("=" * 70)
    print("OpenAlex Enrichment POC - Paper-Based Matching")
    print("=" * 70)
    print()
    print(f"Mode: {'DRY RUN (no database changes)' if args.dry_run else 'LIVE (will update database)'}")
    print(f"Target: {args.limit} papers from June 2025")
    print()

    # Connect to Neo4j
    driver = GraphDatabase.driver(
        NEO4J_URI,
        auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
    )

    try:
        # Get papers from early June 2025 (better OpenAlex coverage)
        print("📚 Fetching papers from Neo4j...")
        papers = get_neo4j_papers(
            driver,
            start_date='2025-06-01',
            end_date='2025-06-05',
            limit=args.limit
        )

        if not papers:
            print("❌ No papers found")
            sys.exit(1)

        print(f"✅ Found {len(papers)} papers with canonical authors")

        # Process in batches
        for i in range(0, len(papers), BATCH_SIZE):
            batch = papers[i:i + BATCH_SIZE]
            process_papers_batch(driver, batch, args.dry_run)

            # Rate limiting
            if i + BATCH_SIZE < len(papers):
                time.sleep(REQUEST_DELAY)

        # Print summary
        print()
        print("=" * 70)
        print("RESULTS")
        print("=" * 70)
        print()
        print(f"📄 Papers processed:           {stats['papers_processed']}")
        print(f"✅ Papers found in OpenAlex:   {stats['papers_found_in_openalex']}")
        print(f"   Coverage: {stats['papers_found_in_openalex']/stats['papers_processed']*100:.1f}%")
        print()
        print(f"👥 Authors total:              {stats['authors_total']}")
        print(f"✅ Authors matched:            {stats['authors_matched']}")
        print(f"   Match rate: {stats['authors_matched']/stats['authors_total']*100:.1f}%")
        print()
        print(f"📊 Match confidence:")
        print(f"   High (>95%):    {stats['high_confidence_matches']}")
        print(f"   Medium (85-95%): {stats['medium_confidence_matches']}")
        print(f"   Low (75-85%):    {stats['low_confidence_matches']}")
        print()
        print(f"🎯 Authors enriched:           {stats['authors_enriched']}")
        if stats['authors_matched'] > 0:
            print(f"   Enrichment rate: {stats['authors_enriched']/stats['authors_matched']*100:.1f}%")
        print()

        if args.dry_run:
            print("💡 This was a DRY RUN. Run without --dry-run to actually update the database.")
        else:
            print("✅ Database updated successfully!")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
