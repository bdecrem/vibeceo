#!/usr/bin/env python3
"""Query for interesting Boston-based AI researchers with recent papers."""

import sys
import os

# Add agents directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'agents', 'kg-query'))

from neo4j_tools import Neo4jTools

def main():
    tools = Neo4jTools()

    try:
        # Query for Boston researchers with papers in last 7 days
        # Last 7 days from 2025-10-30 = starting from 2025-10-23
        query = """
        MATCH (a:Author)-[:AUTHORED]->(p:Paper)
        WHERE a.canonical_kid IS NOT NULL
          AND p.published_date >= date('2025-10-23')
          AND (a.affiliation CONTAINS 'Boston'
               OR a.affiliation CONTAINS 'MIT'
               OR a.affiliation CONTAINS 'Harvard'
               OR a.affiliation CONTAINS 'Northeastern'
               OR a.affiliation CONTAINS 'Boston University'
               OR a.affiliation CONTAINS 'Tufts')
        WITH a, p
        ORDER BY p.published_date DESC, p.featured_in_report DESC
        RETURN DISTINCT a.name as author,
               a.affiliation as affiliation,
               p.title as paper_title,
               p.arxiv_id as arxiv_id,
               p.published_date as date,
               p.featured_in_report as featured
        LIMIT 20
        """

        results = tools.execute_cypher(query)

        if not results:
            print("No results found for Boston-based researchers in the last 7 days")
            return

        # Print results
        print(f"Found {len(results)} recent papers from Boston-based researchers:\n")
        for i, r in enumerate(results, 1):
            print(f"{i}. {r['author']} ({r['affiliation']})")
            print(f"   Paper: {r['paper_title']}")
            print(f"   arXiv: {r['arxiv_id']} | Date: {r['date']}")
            print(f"   Featured: {'Yes' if r['featured'] else 'No'}")
            print()

    finally:
        tools.close()

if __name__ == "__main__":
    main()
