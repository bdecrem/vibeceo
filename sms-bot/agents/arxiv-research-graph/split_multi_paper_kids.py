#!/usr/bin/env python3
"""
Split multi-paper KIDs into individual authorship KIDs.

Some Author nodes have KIDs that link to multiple papers. This should not happen
in the authorship-based model - each authorship should get its own unique KID.

This script:
1. Finds all Author nodes where KID links to >1 paper
2. For each paper they authored, creates a new Author node with unique KID
3. Preserves all metadata and relationships
4. Deletes the old multi-paper KID

Usage:
    python3 split_multi_paper_kids.py --dry-run  # See what would happen
    python3 split_multi_paper_kids.py           # Run the split
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


def count_multi_paper_kids(driver):
    """Count how many KIDs link to multiple papers."""
    with driver.session(database=NEO4J_DATABASE) as session:
        result = session.run("""
            MATCH (a:Author)-[r:AUTHORED]->(p:Paper)
            WITH a, count(p) as paper_count
            WHERE paper_count > 1
            RETURN count(a) as multi_paper_kids
        """)
        return result.single()['multi_paper_kids']


def get_multi_paper_author_kids(driver, limit=None):
    """Get KIDs of authors that link to multiple papers."""
    with driver.session(database=NEO4J_DATABASE) as session:
        query = """
            MATCH (a:Author)-[r:AUTHORED]->(p:Paper)
            WITH a, count(p) as paper_count
            WHERE paper_count > 1
            RETURN a.kochi_author_id as kid
            ORDER BY kid
        """
        if limit:
            query += f" LIMIT {limit}"

        result = session.run(query)
        return [record['kid'] for record in result]


def split_multi_paper_kids(driver, dry_run=False):
    """
    Split multi-paper KIDs into individual authorship KIDs.

    For each author with multiple papers:
    1. For each paper they authored, create new Author node with unique KID
    2. Copy all properties from old Author node
    3. Set first_seen/last_seen to this paper's date
    4. Link to Paper with AUTHORED relationship
    5. Delete old Author node after all splits are done
    """
    kids_to_process = get_multi_paper_author_kids(driver)
    total_kids = len(kids_to_process)

    print(f"\n🚀 {'DRY RUN: ' if dry_run else ''}Processing {total_kids} multi-paper KIDs...")

    stats = {
        'kids_processed': 0,
        'new_authors_created': 0,
        'old_authors_deleted': 0,
    }

    with driver.session(database=NEO4J_DATABASE) as session:
        for idx, kid in enumerate(kids_to_process, 1):
            if idx % 100 == 0 or idx == total_kids:
                print(f"  📊 {idx}/{total_kids} KIDs processed, "
                      f"{stats['new_authors_created']} new Author nodes created")

            if dry_run:
                # Just count what would happen
                result = session.run("""
                    MATCH (old_author:Author {kochi_author_id: $kid})-[:AUTHORED]->(p:Paper)
                    RETURN count(p) as paper_count
                """, kid=kid)
                paper_count = result.single()['paper_count']
                stats['new_authors_created'] += paper_count
                stats['old_authors_deleted'] += 1
            else:
                # Perform actual split for this author
                # Step 1: Create new authors and delete old relationships
                result = session.run("""
                    MATCH (old_author:Author {kochi_author_id: $kid})-[old_rel:AUTHORED]->(p:Paper)

                    // Create new Author node for each authorship
                    CREATE (new_author:Author)
                    SET new_author.kochi_author_id = $new_kid_prefix + randomUUID(),
                        new_author.name = old_author.name,
                        new_author.affiliation = old_author.affiliation,
                        new_author.first_seen = p.published_date,
                        new_author.last_seen = p.published_date,
                        new_author.paper_count = 1,
                        new_author.created_at = datetime(),
                        new_author.split_from_multi_paper_kid = true,
                        new_author.original_kid = old_author.kochi_author_id

                    // If old author had canonical_kid, copy it
                    FOREACH (_ IN CASE WHEN old_author.canonical_kid IS NOT NULL THEN [1] ELSE [] END |
                        SET new_author.canonical_kid = old_author.canonical_kid
                    )

                    // If old author had openalex enrichment, copy it
                    FOREACH (_ IN CASE WHEN old_author.openalex_author_id IS NOT NULL THEN [1] ELSE [] END |
                        SET new_author.openalex_author_id = old_author.openalex_author_id,
                            new_author.openalex_display_name = old_author.openalex_display_name,
                            new_author.openalex_works_count = old_author.openalex_works_count,
                            new_author.openalex_cited_by_count = old_author.openalex_cited_by_count,
                            new_author.openalex_match_confidence = old_author.openalex_match_confidence,
                            new_author.openalex_enriched_at = old_author.openalex_enriched_at
                    )

                    // Create AUTHORED relationship with metadata
                    CREATE (new_author)-[new_rel:AUTHORED]->(p)
                    SET new_rel.position = old_rel.position,
                        new_rel.created_at = old_rel.created_at,
                        new_rel.last_updated = datetime()

                    // Delete old relationship
                    DELETE old_rel

                    RETURN count(new_author) as created
                """, kid=kid, new_kid_prefix="KA_")

                record = result.single()
                if record:
                    stats['new_authors_created'] += record['created']

                # Step 2: Delete the old author node with DETACH DELETE (removes any remaining relationships)
                session.run("""
                    MATCH (old_author:Author {kochi_author_id: $kid})
                    DETACH DELETE old_author
                """, kid=kid)
                stats['old_authors_deleted'] += 1

            stats['kids_processed'] += 1

    return stats




def main():
    parser = argparse.ArgumentParser(description="Split multi-paper KIDs into individual authorship KIDs")
    parser.add_argument("--dry-run", action="store_true", help="Show what would happen without making changes")
    args = parser.parse_args()

    # Check environment variables
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print("❌ Error: NEO4J_URI, NEO4J_USERNAME, and NEO4J_PASSWORD must be set")
        sys.exit(1)

    print("=" * 60)
    print("SPLIT MULTI-PAPER KIDs")
    print("=" * 60)

    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD))

    try:
        # Count current state
        multi_paper_count = count_multi_paper_kids(driver)
        print(f"\n📊 Current state:")
        print(f"   Multi-paper KIDs: {multi_paper_count:,}")

        if multi_paper_count == 0:
            print("\n✅ No multi-paper KIDs found. Nothing to do!")
            return

        if args.dry_run:
            print("\n⚠️  DRY RUN MODE - No changes will be made")

        # Split multi-paper KIDs
        stats = split_multi_paper_kids(driver, args.dry_run)

        print(f"\n📊 Split stats:")
        print(f"   KIDs processed: {stats['kids_processed']:,}")
        print(f"   New Author nodes created: {stats['new_authors_created']:,}")
        print(f"   Old Author nodes deleted: {stats['old_authors_deleted']:,}")

        # Verify final state
        if not args.dry_run:
            final_multi_paper_count = count_multi_paper_kids(driver)
            print(f"\n✅ Final state:")
            print(f"   Multi-paper KIDs remaining: {final_multi_paper_count:,}")

            if final_multi_paper_count == 0:
                print("\n🎉 Success! All KIDs now link to exactly one paper.")
                print("   Ready for fuzzy matching to assign canonical_kid values.")
            else:
                print(f"\n⚠️  Warning: {final_multi_paper_count:,} multi-paper KIDs still remain.")
                print("   You may need to run this script again.")

    finally:
        driver.close()


if __name__ == "__main__":
    main()
