#!/usr/bin/env python3
"""
Migrate from name-based Author nodes to authorship-based Author nodes.

BEFORE: One Author node per unique name (292K nodes)
AFTER:  One Author node per authorship (845K nodes)

This enables proper fuzzy matching where each paper appearance gets evaluated
independently to determine if it's the same person or a different person
with the same name.

Usage:
    python3 migrate_to_authorship_based_authors.py --dry-run  # See what would happen
    python3 migrate_to_authorship_based_authors.py           # Run migration
    python3 migrate_to_authorship_based_authors.py --paper-limit 10  # Test on 10 papers
"""

import argparse
import os
import sys
from datetime import datetime
from neo4j import GraphDatabase

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")


def generate_kid():
    """Generate a Kochi Author ID."""
    import uuid
    return f"KA_{str(uuid.uuid4())[:12]}"


def count_current_state(driver):
    """Count current Author nodes and AUTHORED relationships."""
    with driver.session(database=NEO4J_DATABASE) as session:
        # Count Author nodes
        result = session.run("MATCH (a:Author) RETURN count(a) as count")
        author_count = result.single()['count']

        # Count AUTHORED relationships
        result = session.run("MATCH ()-[r:AUTHORED]->() RETURN count(r) as count")
        authored_count = result.single()['count']

        # Count Papers
        result = session.run("MATCH (p:Paper) RETURN count(p) as count")
        paper_count = result.single()['count']

        return {
            'authors': author_count,
            'authorships': authored_count,
            'papers': paper_count
        }


def backup_author_nodes(driver):
    """Create backup of current Author nodes before migration."""
    print("\n📦 Creating backup of current Author nodes...")

    backup_dir = "/Users/bart/Documents/code/vibeceo/sms-bot/agents/arxiv-research-graph/backups"
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = f"{backup_dir}/pre_migration_authors_{timestamp}.json"

    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run("""
            MATCH (a:Author)
            RETURN a
        """)

        import json
        authors = []
        for record in result:
            author = dict(record['a'])
            # Convert Neo4j types to JSON-serializable
            for key, value in author.items():
                if hasattr(value, 'iso_format'):
                    # Neo4j Date/DateTime objects
                    author[key] = value.iso_format()
                elif value is None:
                    author[key] = None
            authors.append(author)

        with open(backup_file, 'w') as f:
            json.dump(authors, f, indent=2)

        print(f"✅ Backed up {len(authors)} Author nodes to {backup_file}")
        return backup_file


def migrate_authorships_to_authors(driver, dry_run=False, paper_limit=None, date_start=None, date_end=None):
    """
    Migrate from name-based to authorship-based Author nodes.

    For each AUTHORED relationship:
    1. Create new Author node with unique KID
    2. Copy properties from old Author node
    3. Link to Paper with AUTHORED relationship
    4. Preserve position and metadata
    """
    with driver.session(database=NEO4J_DATABASE) as session:
        # Get total papers to process
        if date_start and date_end:
            papers_query = """
                MATCH (p:Paper)
                WHERE p.published_date >= date($start_date)
                  AND p.published_date <= date($end_date)
                RETURN p
                ORDER BY p.published_date
            """
            result = session.run(papers_query, start_date=date_start, end_date=date_end)
        elif paper_limit:
            papers_query = "MATCH (p:Paper) RETURN p LIMIT $limit"
            result = session.run(papers_query, limit=paper_limit)
        else:
            papers_query = "MATCH (p:Paper) RETURN p"
            result = session.run(papers_query)

        papers = [record['p'] for record in result]
        total_papers = len(papers)

        print(f"\n🚀 {'DRY RUN: ' if dry_run else ''}Processing {total_papers} papers...")

        stats = {
            'papers_processed': 0,
            'new_authors_created': 0,
            'old_authors_deleted': 0,
            'relationships_migrated': 0
        }

        for idx, paper in enumerate(papers, 1):
            arxiv_id = paper['arxiv_id']

            if idx % 100 == 0 or idx == total_papers:
                print(f"  📄 {idx}/{total_papers} papers processed, "
                      f"{stats['new_authors_created']} new Author nodes created")

            if dry_run:
                # Just count what would happen
                result = session.run("""
                    MATCH (old_author:Author)-[old_rel:AUTHORED]->(p:Paper {arxiv_id: $arxiv_id})
                    RETURN count(old_rel) as authorship_count
                """, arxiv_id=arxiv_id)
                count = result.single()['authorship_count']
                stats['new_authors_created'] += count
                stats['relationships_migrated'] += count
            else:
                # Perform actual migration for this paper
                result = session.run("""
                    MATCH (old_author:Author)-[old_rel:AUTHORED]->(p:Paper {arxiv_id: $arxiv_id})

                    // Create new Author node for each authorship
                    CREATE (new_author:Author)
                    SET new_author.kochi_author_id = $new_kid_prefix + randomUUID(),
                        new_author.name = old_author.name,
                        new_author.affiliation = old_author.affiliation,
                        new_author.first_seen = p.published_date,
                        new_author.last_seen = p.published_date,
                        new_author.paper_count = 1,
                        new_author.created_at = datetime(),
                        new_author.migrated_from_old_system = true

                    // Create AUTHORED relationship with metadata
                    CREATE (new_author)-[new_rel:AUTHORED]->(p)
                    SET new_rel.position = old_rel.position,
                        new_rel.created_at = old_rel.created_at,
                        new_rel.last_updated = datetime()

                    // Delete old relationship
                    DELETE old_rel

                    RETURN count(new_author) as created
                """, arxiv_id=arxiv_id, new_kid_prefix="KA_")

                created = result.single()['created']
                stats['new_authors_created'] += created
                stats['relationships_migrated'] += created

            stats['papers_processed'] += 1

        return stats


def delete_old_author_nodes(driver, dry_run=False):
    """Delete old Author nodes that have no more AUTHORED relationships."""
    with driver.session(database=NEO4J_DATABASE) as session:
        if dry_run:
            result = session.run("""
                MATCH (a:Author)
                WHERE NOT (a)-[:AUTHORED]->()
                RETURN count(a) as orphaned_authors
            """)
            count = result.single()['orphaned_authors']
            print(f"\n🔍 DRY RUN: Would delete {count} orphaned Author nodes")
            return count
        else:
            result = session.run("""
                MATCH (a:Author)
                WHERE NOT (a)-[:AUTHORED]->()
                DELETE a
                RETURN count(a) as deleted
            """)
            deleted = result.single()['deleted']
            print(f"\n🗑️  Deleted {deleted} orphaned Author nodes")
            return deleted


def verify_migration(driver):
    """Verify migration completed successfully."""
    print("\n" + "="*60)
    print("📊 Migration Verification")
    print("="*60)

    with driver.session(database=NEO4J_DATABASE) as session:
        # Count new state
        result = session.run("""
            MATCH (a:Author)
            RETURN count(a) as authors,
                   count(DISTINCT a.name) as unique_names
        """)
        record = result.single()
        author_count = record['authors']
        unique_names = record['unique_names']

        # Count authorships
        result = session.run("MATCH ()-[r:AUTHORED]->() RETURN count(r) as count")
        authored_count = result.single()['count']

        # Count papers
        result = session.run("MATCH (p:Paper) RETURN count(p) as count")
        paper_count = result.single()['count']

        print(f"Author nodes: {author_count:,}")
        print(f"Unique names: {unique_names:,}")
        print(f"AUTHORED relationships: {authored_count:,}")
        print(f"Papers: {paper_count:,}")
        print(f"Avg authors per paper: {authored_count/paper_count:.2f}")

        # Check for orphaned authors
        result = session.run("""
            MATCH (a:Author)
            WHERE NOT (a)-[:AUTHORED]->()
            RETURN count(a) as orphaned
        """)
        orphaned = result.single()['orphaned']

        if orphaned > 0:
            print(f"\n⚠️  Warning: {orphaned} Author nodes have no AUTHORED relationships")
        else:
            print(f"\n✅ All Author nodes have AUTHORED relationships")

        # Verify 1:1 mapping
        if author_count == authored_count:
            print("✅ Perfect 1:1 mapping: Each Author node = one authorship")
        else:
            print(f"⚠️  Mismatch: {author_count} authors vs {authored_count} authorships")


def main():
    parser = argparse.ArgumentParser(
        description="Migrate to authorship-based Author nodes"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would happen without making changes"
    )
    parser.add_argument(
        "--paper-limit",
        type=int,
        help="Limit migration to N papers (for testing)"
    )
    parser.add_argument(
        "--date-start",
        type=str,
        help="Start date for migration (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--date-end",
        type=str,
        help="End date for migration (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--skip-backup",
        action="store_true",
        help="Skip backup step (not recommended)"
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
        # Show current state
        current = count_current_state(driver)
        print("="*60)
        print("🔧 Author Node Migration: Name-based → Authorship-based")
        print("="*60)
        print(f"Current Author nodes: {current['authors']:,}")
        print(f"Current AUTHORED relationships: {current['authorships']:,}")
        print(f"Papers: {current['papers']:,}")
        print(f"\nAfter migration: ~{current['authorships']:,} Author nodes")
        print(f"(One Author node per authorship)\n")

        if args.dry_run:
            print("🔍 DRY RUN MODE - No changes will be made\n")

        if not args.dry_run and not args.skip_backup:
            backup_file = backup_author_nodes(driver)
            print(f"\n💾 Backup saved: {backup_file}")
            print("   To restore: (restoration script not yet implemented)\n")

        # Confirm if not dry run
        if not args.dry_run:
            response = input("⚠️  This will restructure the database. Continue? (yes/no): ")
            if response.lower() != 'yes':
                print("❌ Migration cancelled")
                sys.exit(0)

        # Run migration
        stats = migrate_authorships_to_authors(
            driver,
            args.dry_run,
            args.paper_limit,
            args.date_start,
            args.date_end
        )

        print("\n" + "="*60)
        print("📊 Migration Statistics")
        print("="*60)
        print(f"Papers processed: {stats['papers_processed']:,}")
        print(f"New Author nodes created: {stats['new_authors_created']:,}")
        print(f"AUTHORED relationships migrated: {stats['relationships_migrated']:,}")

        if not args.dry_run:
            # Clean up orphaned nodes
            deleted = delete_old_author_nodes(driver, args.dry_run)
            stats['old_authors_deleted'] = deleted
            print(f"Old Author nodes deleted: {stats['old_authors_deleted']:,}")

            # Verify
            verify_migration(driver)

            print("\n🎉 Migration complete!")
            print("\nNext steps:")
            print("1. Update load_recent_papers.py to CREATE instead of MERGE")
            print("2. Update kochi_fuzzy_match.py to assign canonical_kid")
            print("3. Run fuzzy matching to populate canonical_kid fields")
        else:
            print(f"\nDRY RUN: Would create {stats['new_authors_created']:,} new Author nodes")
            print("Run without --dry-run to execute migration")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
