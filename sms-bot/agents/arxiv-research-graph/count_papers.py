#!/usr/bin/env python3
"""
Count papers in a date range.

Usage:
    python3 count_papers.py 2025-10-13 2025-10-23
"""

import sys
import os
from neo4j import GraphDatabase

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")

if len(sys.argv) != 3:
    print("Usage: python3 count_papers.py START_DATE END_DATE")
    print("Example: python3 count_papers.py 2025-10-13 2025-10-23")
    sys.exit(1)

start_date = sys.argv[1]
end_date = sys.argv[2]

driver = GraphDatabase.driver(
    NEO4J_URI,
    auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
)

with driver.session(database=NEO4J_DATABASE) as session:
    # Count papers
    result = session.run("""
        MATCH (p:Paper)
        WHERE p.published_date >= date($start_date)
          AND p.published_date <= date($end_date)
        RETURN count(p) as papers
    """, start_date=start_date, end_date=end_date)
    paper_count = result.single()['papers']

    # Count authorships
    result = session.run("""
        MATCH (a:Author)-[r:AUTHORED]->(p:Paper)
        WHERE p.published_date >= date($start_date)
          AND p.published_date <= date($end_date)
        RETURN count(r) as authorships
    """, start_date=start_date, end_date=end_date)
    authorship_count = result.single()['authorships']

    print(f"Date range: {start_date} to {end_date}")
    print(f"Papers: {paper_count:,}")
    print(f"Authorships: {authorship_count:,}")
    print(f"Avg authors per paper: {authorship_count/paper_count:.2f}" if paper_count > 0 else "")

driver.close()
