#!/usr/bin/env python3
"""
Initialize Kochi Author IDs for existing authors in Neo4j database.

This script adds kochi_author_id to all existing Author nodes that don't have one.
Run this once before using the fuzzy matching system.

Usage:
    python3 initialize_kochi_ids.py
    python3 initialize_kochi_ids.py --dry-run  # See what would happen
"""

import argparse
import os
import sys
from neo4j import GraphDatabase

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")


def count_authors_without_kids(driver):
    """Count how many authors don't have Kochi IDs yet."""
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run("""
            MATCH (a:Author)
            WHERE a.kochi_author_id IS NULL
            RETURN count(a) as count
        """)
        record = result.single()
        return record['count'] if record else 0


def count_total_authors(driver):
    """Count total authors in database."""
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run("""
            MATCH (a:Author)
            RETURN count(a) as count
        """)
        record = result.single()
        return record['count'] if record else 0


def initialize_kochi_ids(driver, dry_run=False):
    """
    Add kochi_author_id to all authors that don't have one.

    Uses Neo4j's randomUUID() function to generate unique IDs.
    Format: KA_{12_character_uuid}
    """
    with driver.session(database=NEO4J_DATABASE) as session:
        if dry_run:
            print("🔍 DRY RUN - No changes will be made\n")

            # Show sample of authors that would get KIDs
            result = session.run("""
                MATCH (a:Author)
                WHERE a.kochi_author_id IS NULL
                RETURN a.name as name, a.affiliation as affiliation
                LIMIT 10
            """)

            print("Sample of authors that would get Kochi IDs:")
            for idx, record in enumerate(result, 1):
                aff = record['affiliation'] if record['affiliation'] else 'No affiliation'
                print(f"  {idx}. {record['name']} ({aff})")

            return 0

        else:
            print("🚀 Initializing Kochi Author IDs...\n")

            # Add KIDs in batches for better performance
            batch_size = 1000
            total_updated = 0

            while True:
                result = session.run("""
                    MATCH (a:Author)
                    WHERE a.kochi_author_id IS NULL
                    WITH a LIMIT $batch_size
                    SET a.kochi_author_id = 'KA_' + substring(randomUUID(), 0, 12)
                    RETURN count(a) as updated
                """, batch_size=batch_size)

                record = result.single()
                updated = record['updated'] if record else 0
                total_updated += updated

                if updated > 0:
                    print(f"  ✅ Updated {updated} authors (total: {total_updated})")

                if updated < batch_size:
                    break

            return total_updated


def create_unique_constraint(driver, dry_run=False):
    """
    Create unique constraint on kochi_author_id.
    This ensures no duplicate KIDs can be created.
    """
    with driver.session(database=NEO4J_DATABASE) as session:
        constraint_name = "kochi_author_id_unique"

        # Check if constraint already exists
        result = session.run("""
            SHOW CONSTRAINTS
            YIELD name, entityType, labelsOrTypes, properties
            WHERE name = $constraint_name
            RETURN count(*) as exists
        """, constraint_name=constraint_name)

        record = result.single()
        constraint_exists = record['exists'] > 0 if record else False

        if constraint_exists:
            print(f"ℹ️  Unique constraint '{constraint_name}' already exists")
            return

        if dry_run:
            print(f"🔍 Would create unique constraint on kochi_author_id")
            return

        try:
            session.run("""
                CREATE CONSTRAINT kochi_author_id_unique IF NOT EXISTS
                FOR (a:Author)
                REQUIRE a.kochi_author_id IS UNIQUE
            """)
            print("✅ Created unique constraint on kochi_author_id")
        except Exception as e:
            print(f"⚠️  Could not create constraint: {e}")
            print("   (This is OK if using Neo4j Community Edition)")


def verify_initialization(driver):
    """Verify that all authors now have Kochi IDs."""
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run("""
            MATCH (a:Author)
            RETURN
                count(a) as total,
                count(a.kochi_author_id) as with_kid,
                count(CASE WHEN a.kochi_author_id IS NULL THEN 1 END) as without_kid
        """)

        record = result.single()
        if record:
            total = record['total']
            with_kid = record['with_kid']
            without_kid = record['without_kid']

            print("\n" + "="*60)
            print("📊 Verification")
            print("="*60)
            print(f"Total authors: {total}")
            print(f"With Kochi ID: {with_kid} ({with_kid/total*100:.1f}%)")
            print(f"Without Kochi ID: {without_kid}")

            if without_kid == 0:
                print("\n✅ All authors have Kochi IDs!")
                return True
            else:
                print(f"\n⚠️  {without_kid} authors still missing Kochi IDs")
                return False


def show_sample_kids(driver, limit=10):
    """Show sample of authors with their new Kochi IDs."""
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run("""
            MATCH (a:Author)
            WHERE a.kochi_author_id IS NOT NULL
            RETURN a.kochi_author_id as kid,
                   a.name as name,
                   a.paper_count as papers
            ORDER BY a.paper_count DESC
            LIMIT $limit
        """, limit=limit)

        print("\n" + "="*60)
        print("📋 Sample Authors with Kochi IDs")
        print("="*60)
        for idx, record in enumerate(result, 1):
            papers = record['papers'] if record['papers'] else 0
            print(f"{idx:2}. {record['kid']} | {record['name']:<30} | {papers} papers")


def main():
    parser = argparse.ArgumentParser(
        description="Initialize Kochi Author IDs for existing authors"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would happen without making changes"
    )
    parser.add_argument(
        "--verify-only",
        action="store_true",
        help="Only verify existing KIDs, don't create new ones"
    )

    args = parser.parse_args()

    # Validate environment
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Missing Neo4j environment variables:")
        print("   NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD")
        sys.exit(1)

    # Connect to Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    try:
        # Get current state
        total_authors = count_total_authors(driver)
        authors_without_kids = count_authors_without_kids(driver)

        print("="*60)
        print("🔧 Kochi Author ID Initialization")
        print("="*60)
        print(f"Total authors in database: {total_authors}")
        print(f"Authors without Kochi IDs: {authors_without_kids}")
        print()

        if args.verify_only:
            verify_initialization(driver)
            if authors_without_kids == 0:
                show_sample_kids(driver)
            sys.exit(0)

        if authors_without_kids == 0:
            print("✅ All authors already have Kochi IDs!")
            show_sample_kids(driver)
            sys.exit(0)

        # Initialize KIDs
        updated = initialize_kochi_ids(driver, dry_run=args.dry_run)

        if not args.dry_run:
            # Create unique constraint
            create_unique_constraint(driver, dry_run=args.dry_run)

            # Verify
            success = verify_initialization(driver)

            if success:
                show_sample_kids(driver)
                print("\n🎉 Initialization complete!")
                print("\nNext step: Run fuzzy matching")
                print("  python3 kochi_fuzzy_match.py --date 2025-10-12 --dry-run")
            else:
                print("\n⚠️  Initialization incomplete. Please run again.")
                sys.exit(1)
        else:
            print(f"\n{authors_without_kids} authors would be updated")
            print("\nTo apply changes, run without --dry-run:")
            print("  python3 initialize_kochi_ids.py")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
