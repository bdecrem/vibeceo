#!/usr/bin/env python3
"""
Kochi Fuzzy Matching - Simplified Version

Matches authors from new papers to existing authors in Neo4j database
using contextual signals (co-authors, affiliation, research area).

Usage:
    python3 kochi_fuzzy_match.py --date 2025-10-12
    python3 kochi_fuzzy_match.py --date-start 2025-10-01 --date-end 2025-10-31
    python3 kochi_fuzzy_match.py --arxiv-ids 2510.12345v1,2510.12346v1
    python3 kochi_fuzzy_match.py --all --limit 100
"""

import argparse
import os
import sys
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Set
from dataclasses import dataclass

from neo4j import GraphDatabase

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

# Matching thresholds
CONFIDENCE_THRESHOLD_MERGE = 80  # Use existing author
CONFIDENCE_THRESHOLD_LINK = 60   # Create new + mark POSSIBLY_SAME_AS
MAX_SCORE = 100

# Signal weights (simplified version - 3 signals)
WEIGHT_COAUTHOR_2_PLUS = 50
WEIGHT_COAUTHOR_1 = 25
WEIGHT_NAME_AFFILIATION = 30
WEIGHT_RESEARCH_AREA_2_PLUS = 20


@dataclass
class MatchResult:
    """Result of fuzzy matching between new author and candidate."""
    candidate_kid: str
    candidate_name: str
    confidence: int
    signals: List[str]
    reasoning: str


@dataclass
class AuthorAction:
    """Decision on what to do with a new author."""
    action: str  # 'USE_EXISTING', 'CREATE_WITH_LINK', 'CREATE_NEW'
    existing_kid: Optional[str] = None
    possible_duplicate_kid: Optional[str] = None
    confidence: int = 0
    reasoning: str = ""


class KochiFuzzyMatcher:
    """Simplified Kochi Fuzzy Matching engine."""

    def __init__(self, driver):
        self.driver = driver
        self.database = NEO4J_DATABASE

    def find_author_candidates(self, author_name: str) -> List[Dict]:
        """
        Find existing authors with same or similar name.
        Returns list of candidate authors with their metadata.
        """
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (a:Author)
            WHERE toLower(trim(a.name)) = toLower(trim($name))
            RETURN
                a.kochi_author_id as kid,
                a.name as name,
                a.affiliation as affiliation,
                a.paper_count as paper_count,
                coalesce(a.openalex_matched_name, '') as openalex_name
            """
            result = session.run(query, name=author_name)
            return [dict(record) for record in result]

    def get_candidate_coauthors(self, candidate_kid: str) -> Set[str]:
        """Get set of co-author names for a candidate author."""
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (candidate:Author {kochi_author_id: $kid})-[:AUTHORED]->(p:Paper)
                  <-[:AUTHORED]-(coauthor:Author)
            WHERE coauthor.kochi_author_id <> $kid
            RETURN DISTINCT coauthor.name as name
            """
            result = session.run(query, kid=candidate_kid)
            return {record["name"] for record in result}

    def get_candidate_categories(self, candidate_kid: str) -> Set[str]:
        """Get set of research categories for a candidate author."""
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (a:Author {kochi_author_id: $kid})-[:AUTHORED]->(p:Paper)
                  -[:IN_CATEGORY]->(c:Category)
            RETURN DISTINCT c.name as category
            """
            result = session.run(query, kid=candidate_kid)
            return {record["category"] for record in result}

    def calculate_coauthor_overlap(
        self,
        new_paper_coauthors: List[str],
        candidate_kid: str
    ) -> int:
        """
        Signal 1: Co-author network overlap (0-50 points)

        Strong signal: Same person likely publishes with same collaborators.
        """
        candidate_coauthors = self.get_candidate_coauthors(candidate_kid)

        # Count overlap
        shared = len(set(new_paper_coauthors) & candidate_coauthors)

        if shared >= 2:
            return WEIGHT_COAUTHOR_2_PLUS  # 50 points - very strong signal
        elif shared == 1:
            return WEIGHT_COAUTHOR_1  # 25 points - moderate signal
        else:
            return 0

    def check_name_affiliation_match(
        self,
        new_author_name: str,
        new_author_affiliation: Optional[str],
        candidate: Dict
    ) -> int:
        """
        Signal 2: Exact name + affiliation match (0-30 points)

        If we have affiliation data and it matches exactly.
        """
        # Exact name match (already filtered by find_candidates)
        name_matches = (
            new_author_name.lower().strip() ==
            candidate['name'].lower().strip()
        )

        if not name_matches:
            return 0

        # Check affiliation if available
        if new_author_affiliation and candidate.get('affiliation'):
            new_aff_lower = new_author_affiliation.lower().strip()
            cand_aff_lower = candidate['affiliation'].lower().strip()

            if new_aff_lower == cand_aff_lower:
                return WEIGHT_NAME_AFFILIATION  # 30 points
            elif new_aff_lower in cand_aff_lower or cand_aff_lower in new_aff_lower:
                return 20  # Partial affiliation match

        # Name matches but no affiliation data
        return 15  # Weak signal without affiliation

    def calculate_research_area_overlap(
        self,
        new_paper_categories: List[str],
        candidate_kid: str
    ) -> int:
        """
        Signal 3: Research area overlap (0-20 points)

        Same research categories suggests same person.
        """
        candidate_categories = self.get_candidate_categories(candidate_kid)

        overlap = len(set(new_paper_categories) & candidate_categories)

        if overlap >= 2:
            return WEIGHT_RESEARCH_AREA_2_PLUS  # 20 points
        elif overlap == 1:
            return 10  # Weak signal
        else:
            return 0

    def match_author(
        self,
        author_name: str,
        paper_data: Dict,
        paper_coauthors: List[str]
    ) -> MatchResult:
        """
        Run fuzzy matching for one author against one candidate.

        Returns confidence score (0-100) and reasoning.
        """
        candidate_kid = paper_data['candidate_kid']
        candidate_name = paper_data['candidate_name']

        score = 0
        signals = []

        # Signal 1: Co-author overlap
        coauthor_score = self.calculate_coauthor_overlap(
            paper_coauthors,
            candidate_kid
        )
        if coauthor_score > 0:
            score += coauthor_score
            signals.append(f"coauthors:{coauthor_score}")

        # Signal 2: Name + Affiliation
        name_score = self.check_name_affiliation_match(
            author_name,
            paper_data.get('affiliation'),
            {
                'name': candidate_name,
                'affiliation': paper_data.get('candidate_affiliation')
            }
        )
        if name_score > 0:
            score += name_score
            signals.append(f"name:{name_score}")

        # Signal 3: Research area
        area_score = self.calculate_research_area_overlap(
            paper_data.get('categories', []),
            candidate_kid
        )
        if area_score > 0:
            score += area_score
            signals.append(f"area:{area_score}")

        confidence = min(score, MAX_SCORE)
        reasoning = self._generate_reasoning(signals, confidence)

        return MatchResult(
            candidate_kid=candidate_kid,
            candidate_name=candidate_name,
            confidence=confidence,
            signals=signals,
            reasoning=reasoning
        )

    def _generate_reasoning(self, signals: List[str], confidence: int) -> str:
        """Generate human-readable reasoning for match."""
        if not signals:
            return "No matching signals found"

        parts = []
        for signal in signals:
            sig_type, score = signal.split(':')
            score_int = int(score)

            if sig_type == 'coauthors':
                if score_int >= 50:
                    parts.append("2+ shared co-authors (strong)")
                elif score_int >= 25:
                    parts.append("1 shared co-author (moderate)")
            elif sig_type == 'name':
                if score_int >= 30:
                    parts.append("exact name + affiliation")
                elif score_int >= 20:
                    parts.append("exact name + partial affiliation")
                else:
                    parts.append("exact name")
            elif sig_type == 'area':
                if score_int >= 20:
                    parts.append("2+ shared categories")
                else:
                    parts.append("1 shared category")

        return " + ".join(parts)

    def decide_author_action(
        self,
        author_name: str,
        paper_arxiv_id: str,
        paper_categories: List[str],
        paper_coauthors: List[str],
        paper_affiliation: Optional[str] = None
    ) -> AuthorAction:
        """
        Main decision function: determine what to do with new author.

        Returns action: USE_EXISTING, CREATE_WITH_LINK, or CREATE_NEW
        """
        # Find candidates with same name
        candidates = self.find_author_candidates(author_name)

        if not candidates:
            return AuthorAction(
                action='CREATE_NEW',
                confidence=100,
                reasoning="No existing authors with this name"
            )

        # Run matching against each candidate
        best_match = None
        best_confidence = 0

        for candidate in candidates:
            paper_data = {
                'candidate_kid': candidate['kid'],
                'candidate_name': candidate['name'],
                'candidate_affiliation': candidate.get('affiliation'),
                'categories': paper_categories,
                'affiliation': paper_affiliation
            }

            result = self.match_author(author_name, paper_data, paper_coauthors)

            if result.confidence > best_confidence:
                best_match = result
                best_confidence = result.confidence

        # Make decision based on confidence
        if best_confidence >= CONFIDENCE_THRESHOLD_MERGE:
            return AuthorAction(
                action='USE_EXISTING',
                existing_kid=best_match.candidate_kid,
                confidence=best_confidence,
                reasoning=best_match.reasoning
            )

        elif best_confidence >= CONFIDENCE_THRESHOLD_LINK:
            return AuthorAction(
                action='CREATE_WITH_LINK',
                possible_duplicate_kid=best_match.candidate_kid,
                confidence=best_confidence,
                reasoning=best_match.reasoning
            )

        else:
            return AuthorAction(
                action='CREATE_NEW',
                confidence=100 - best_confidence,
                reasoning=f"Low confidence ({best_confidence}%) - {best_match.reasoning if best_match else 'no signals'}"
            )

    def generate_kid(self) -> str:
        """Generate new Kochi Author ID."""
        return f"KA_{uuid.uuid4().hex[:12]}"

    def create_author_with_kid(
        self,
        author_name: str,
        paper_arxiv_id: str,
        affiliation: Optional[str] = None
    ) -> str:
        """Create new author node with Kochi ID."""
        kid = self.generate_kid()

        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (p:Paper {arxiv_id: $arxiv_id})
            MERGE (a:Author {name: $name})
            ON CREATE SET
                a.kochi_author_id = $kid,
                a.first_seen = p.published_date,
                a.last_seen = p.published_date,
                a.paper_count = 0,
                a.created_at = datetime()
            ON MATCH SET
                a.kochi_author_id = coalesce(a.kochi_author_id, $kid),
                a.last_seen = p.published_date
            SET a.last_matched_date = datetime()
            RETURN a.kochi_author_id as kid
            """

            result = session.run(
                query,
                kid=kid,
                name=author_name,
                arxiv_id=paper_arxiv_id
            )
            record = result.single()
            return record['kid'] if record else kid

    def create_possibly_same_as_relationship(
        self,
        kid1: str,
        kid2: str,
        confidence: int,
        reason: str
    ):
        """Create POSSIBLY_SAME_AS relationship between two authors."""
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (a1:Author {kochi_author_id: $kid1})
            MATCH (a2:Author {kochi_author_id: $kid2})
            MERGE (a1)-[r:POSSIBLY_SAME_AS]->(a2)
            SET r.confidence = $confidence,
                r.reason = $reason,
                r.created_date = datetime(),
                r.reviewed = false
            """
            session.run(
                query,
                kid1=kid1,
                kid2=kid2,
                confidence=confidence,
                reason=reason
            )

    def link_author_to_paper(self, kid: str, paper_arxiv_id: str, position: int):
        """Link author to paper with authorship relationship."""
        with self.driver.session(database=self.database) as session:
            query = """
            MATCH (a:Author {kochi_author_id: $kid})
            MATCH (p:Paper {arxiv_id: $arxiv_id})
            MERGE (a)-[r:AUTHORED]->(p)
            SET r.position = $position,
                r.created_at = coalesce(r.created_at, datetime()),
                r.last_updated = datetime()
            """
            session.run(
                query,
                kid=kid,
                arxiv_id=paper_arxiv_id,
                position=position
            )


def get_papers_to_process(driver, args) -> List[Dict]:
    """Get list of papers based on command line arguments."""
    with driver.session(database=NEO4J_DATABASE) as session:
        if args.arxiv_ids:
            arxiv_ids = [id.strip() for id in args.arxiv_ids.split(',')]
            query = """
            MATCH (p:Paper)
            WHERE p.arxiv_id IN $arxiv_ids
            RETURN p.arxiv_id as arxiv_id,
                   p.title as title,
                   p.categories as categories,
                   p.published_date as published_date
            """
            result = session.run(query, arxiv_ids=arxiv_ids)

        elif args.date:
            query = """
            MATCH (p:Paper)
            WHERE p.published_date = date($date)
            RETURN p.arxiv_id as arxiv_id,
                   p.title as title,
                   p.categories as categories,
                   p.published_date as published_date
            """
            if args.limit:
                query += f" LIMIT {args.limit}"
            result = session.run(query, date=args.date)

        elif args.date_start and args.date_end:
            query = """
            MATCH (p:Paper)
            WHERE p.published_date >= date($start_date)
              AND p.published_date <= date($end_date)
            RETURN p.arxiv_id as arxiv_id,
                   p.title as title,
                   p.categories as categories,
                   p.published_date as published_date
            """
            if args.limit:
                query += f" LIMIT {args.limit}"
            result = session.run(query, start_date=args.date_start, end_date=args.date_end)

        elif args.all:
            query = """
            MATCH (p:Paper)
            RETURN p.arxiv_id as arxiv_id,
                   p.title as title,
                   p.categories as categories,
                   p.published_date as published_date
            """
            if args.limit:
                query += f" LIMIT {args.limit}"
            result = session.run(query)

        else:
            return []

        return [dict(record) for record in result]


def get_paper_authors(driver, arxiv_id: str) -> List[Dict]:
    """Get authors for a specific paper."""
    with driver.session(database=NEO4J_DATABASE) as session:
        query = """
        MATCH (a:Author)-[r:AUTHORED]->(p:Paper {arxiv_id: $arxiv_id})
        RETURN a.name as name,
               coalesce(a.affiliation, '') as affiliation,
               coalesce(r.position, 0) as position
        ORDER BY r.position
        """
        result = session.run(query, arxiv_id=arxiv_id)
        return [dict(record) for record in result]


def main():
    parser = argparse.ArgumentParser(
        description="Kochi Fuzzy Matching - Match authors using contextual signals"
    )
    parser.add_argument("--arxiv-ids", help="Comma-separated list of arXiv IDs")
    parser.add_argument("--date", help="Process papers from specific date (YYYY-MM-DD)")
    parser.add_argument("--date-start", help="Process papers from date range start")
    parser.add_argument("--date-end", help="Process papers from date range end")
    parser.add_argument("--all", action="store_true", help="Process all papers")
    parser.add_argument("--limit", type=int, help="Limit number of papers")
    parser.add_argument("--dry-run", action="store_true",
                       help="Show decisions without making changes")

    args = parser.parse_args()

    # Validate environment
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j environment variables")
        sys.exit(1)

    # Connect to Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))
    matcher = KochiFuzzyMatcher(driver)

    try:
        # Get papers to process
        papers = get_papers_to_process(driver, args)

        if not papers:
            print("❌ No papers found matching criteria")
            sys.exit(1)

        print(f"\n🚀 Processing {len(papers)} papers...\n")

        # Stats
        stats = {
            'total_authors': 0,
            'new_authors': 0,
            'matched_existing': 0,
            'possible_duplicates': 0
        }

        # Process each paper
        for idx, paper in enumerate(papers, 1):
            arxiv_id = paper['arxiv_id']
            categories = paper['categories']

            print(f"📄 {idx}/{len(papers)} {arxiv_id}: {paper['title'][:60]}...")

            # Get authors for this paper
            authors = get_paper_authors(driver, arxiv_id)
            stats['total_authors'] += len(authors)

            # Get co-author names (excluding current author)
            author_names = [a['name'] for a in authors]

            # Process each author
            for author in authors:
                author_name = author['name']
                coauthors = [n for n in author_names if n != author_name]

                # Run fuzzy matching
                action = matcher.decide_author_action(
                    author_name=author_name,
                    paper_arxiv_id=arxiv_id,
                    paper_categories=categories,
                    paper_coauthors=coauthors,
                    paper_affiliation=author.get('affiliation')
                )

                # Execute action
                if args.dry_run:
                    print(f"  [DRY RUN] {author_name}: {action.action} "
                          f"(confidence: {action.confidence}%) - {action.reasoning}")
                else:
                    if action.action == 'USE_EXISTING':
                        # Link to existing author
                        matcher.link_author_to_paper(
                            action.existing_kid,
                            arxiv_id,
                            author['position']
                        )
                        stats['matched_existing'] += 1
                        print(f"  ✅ {author_name}: Matched to {action.existing_kid} "
                              f"({action.confidence}%)")

                    elif action.action == 'CREATE_WITH_LINK':
                        # Link to existing author by name, but flag as uncertain match
                        # Since one name = one Author node, we can't create a "new" author
                        # Instead, we link the paper and create a POSSIBLY_SAME_AS for review
                        new_kid = matcher.create_author_with_kid(
                            author_name,
                            arxiv_id,
                            author.get('affiliation')
                        )
                        matcher.link_author_to_paper(new_kid, arxiv_id, author['position'])

                        # Only create POSSIBLY_SAME_AS if it's actually a different author
                        if new_kid != action.possible_duplicate_kid:
                            matcher.create_possibly_same_as_relationship(
                                new_kid,
                                action.possible_duplicate_kid,
                                action.confidence,
                                action.reasoning
                            )
                            stats['possible_duplicates'] += 1
                            print(f"  ⚠️  {author_name}: Linked to {new_kid}, "
                                  f"possibly same as {action.possible_duplicate_kid} "
                                  f"({action.confidence}%)")
                        else:
                            # Same author - this is essentially USE_EXISTING
                            print(f"  ✅ {author_name}: Linked to existing {new_kid} "
                                  f"({action.confidence}%)")

                        stats['new_authors'] += 1

                    else:  # CREATE_NEW
                        # Create brand new author
                        new_kid = matcher.create_author_with_kid(
                            author_name,
                            arxiv_id,
                            author.get('affiliation')
                        )
                        matcher.link_author_to_paper(new_kid, arxiv_id, author['position'])
                        stats['new_authors'] += 1
                        print(f"  🆕 {author_name}: New author {new_kid}")

        # Print summary
        print("\n" + "="*60)
        print("📊 Summary")
        print("="*60)
        print(f"Total authors processed: {stats['total_authors']}")
        if stats['total_authors'] > 0:
            print(f"Matched to existing: {stats['matched_existing']} "
                  f"({stats['matched_existing']/stats['total_authors']*100:.1f}%)")
        else:
            print(f"Matched to existing: {stats['matched_existing']}")
        print(f"New authors created: {stats['new_authors']}")
        print(f"Possible duplicates flagged: {stats['possible_duplicates']}")
        print()

        if args.dry_run:
            print("ℹ️  This was a dry run. No changes were made.")
        else:
            print("✅ Fuzzy matching complete!")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
