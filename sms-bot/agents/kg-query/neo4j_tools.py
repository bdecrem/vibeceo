#!/usr/bin/env python3
"""
Neo4j Tools for KG Query Agent

Provides safe Neo4j query functions with automatic data quality filtering.
"""

import os
import sys
import json
import re
from typing import List, Dict, Any, Optional
from neo4j import GraphDatabase

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")


class Neo4jTools:
    """Neo4j query tools with data quality awareness."""

    def __init__(self):
        if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
            raise ValueError("Missing Neo4j environment variables")

        self.driver = GraphDatabase.driver(
            NEO4J_URI, auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
        )
        self.database = NEO4J_DATABASE
        self._clean_data_status = None

    def close(self):
        """Close Neo4j driver."""
        self.driver.close()

    def execute_cypher(self, query: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Execute a Cypher query and return results.

        Args:
            query: Cypher query string
            params: Optional query parameters

        Returns:
            List of result records as dictionaries
        """
        with self.driver.session(database=self.database) as session:
            result = session.run(query, parameters=params or {})
            records = []
            for record in result:
                # Convert record to dict
                records.append(dict(record))
            return records

    def get_clean_data_status(self) -> Dict[str, Any]:
        """
        Get current clean data boundaries.

        Returns dict with:
            - clean_start_date: Earliest date with clean author data
            - clean_end_date: Latest date with clean author data
            - clean_papers: Number of papers with clean authors
            - total_papers: Total papers in database
            - clean_percentage: Percentage of papers with clean authors
        """
        if self._clean_data_status:
            return self._clean_data_status

        query = """
        MATCH (a:Author)-[:AUTHORED]->(p:Paper)
        WHERE a.canonical_kid IS NOT NULL
          AND a.migrated_from_old_system = true
        WITH
          min(p.published_date) as clean_start,
          max(p.published_date) as clean_end,
          count(DISTINCT p) as clean_papers
        MATCH (all_papers:Paper)
        WITH clean_start, clean_end, clean_papers, count(all_papers) as total_papers
        RETURN
          toString(clean_start) as clean_start_date,
          toString(clean_end) as clean_end_date,
          clean_papers,
          total_papers,
          round(100.0 * clean_papers / total_papers, 1) as clean_percentage
        """

        try:
            result = self.execute_cypher(query)
            if result:
                self._clean_data_status = result[0]
            else:
                self._clean_data_status = {
                    "clean_start_date": "No clean data yet",
                    "clean_end_date": "No clean data yet",
                    "clean_papers": 0,
                    "total_papers": 0,
                    "clean_percentage": 0,
                }
        except Exception as e:
            print(f"Error getting clean data status: {e}", file=sys.stderr)
            self._clean_data_status = {
                "clean_start_date": "Error",
                "clean_end_date": "Error",
                "clean_papers": 0,
                "total_papers": 0,
                "clean_percentage": 0,
            }

        return self._clean_data_status

    def query_papers(self, cypher: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Query papers - no restrictions, full dataset available.

        Args:
            cypher: Cypher query for papers
            params: Optional query parameters

        Returns:
            List of result records
        """
        return self.execute_cypher(cypher, params)

    def query_authors(self, cypher: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
        """
        Query authors - automatically filtered to clean data.

        Injects filters:
        - WHERE a.canonical_kid IS NOT NULL (fuzzy matched)
        - AND a.migrated_from_old_system = true (migrated)
        - AND p.published_date >= clean_start_date (in clean range)

        Args:
            cypher: Cypher query for authors
            params: Optional query parameters

        Returns:
            List of result records with only clean author data
        """
        # Get clean data boundary
        status = self.get_clean_data_status()
        clean_start = status.get("clean_start_date", "2099-01-01")

        # Inject data quality filters
        filtered_cypher = self._inject_author_filters(cypher, clean_start)

        return self.execute_cypher(filtered_cypher, params)

    def _inject_author_filters(self, cypher: str, clean_start_date: str) -> str:
        """
        Inject data quality filters into author queries.

        Finds MATCH clauses with Author nodes and adds WHERE filters.
        """
        # Pattern to find Author matches
        author_patterns = [
            (r'MATCH\s+\((\w+):Author\)', r'\1'),  # (a:Author)
            (r'MATCH\s+\((\w+):\s*Author\)', r'\1'),  # (a: Author)
        ]

        author_var = None
        for pattern, var_group in author_patterns:
            match = re.search(pattern, cypher, re.IGNORECASE)
            if match:
                author_var = match.group(1)
                break

        if not author_var:
            # No Author node found, return as-is
            return cypher

        # Find if there's a Paper node in the same MATCH
        paper_var = None
        paper_pattern = r'\((\w+):Paper\)'
        paper_match = re.search(paper_pattern, cypher, re.IGNORECASE)
        if paper_match:
            paper_var = paper_match.group(1)

        # Build WHERE clause
        filters = []
        filters.append(f"{author_var}.canonical_kid IS NOT NULL")
        filters.append(f"{author_var}.migrated_from_old_system = true")
        if paper_var:
            filters.append(f"{paper_var}.published_date >= date('{clean_start_date}')")

        where_clause = " AND ".join(filters)

        # Check if WHERE clause already exists
        if re.search(r'\bWHERE\b', cypher, re.IGNORECASE):
            # Append to existing WHERE
            cypher = re.sub(
                r'\bWHERE\b',
                f"WHERE {where_clause} AND",
                cypher,
                count=1,
                flags=re.IGNORECASE
            )
        else:
            # Add WHERE after first MATCH
            cypher = re.sub(
                r'(MATCH\s+.*?\))',
                rf'\1\nWHERE {where_clause}',
                cypher,
                count=1,
                flags=re.IGNORECASE | re.DOTALL
            )

        return cypher

    def get_graph_schema(self) -> Dict[str, Any]:
        """
        Get Neo4j graph schema.

        Returns:
            Dict with node types, relationship types, and key properties
        """
        schema = {
            "nodes": {},
            "relationships": []
        }

        # Get node labels and their properties
        labels_query = "CALL db.labels()"
        labels = self.execute_cypher(labels_query)

        for label_record in labels:
            label = label_record.get("label")
            if not label:
                continue

            # Get sample properties for this label
            props_query = f"MATCH (n:{label}) RETURN properties(n) as props LIMIT 1"
            try:
                props_result = self.execute_cypher(props_query)
                if props_result:
                    schema["nodes"][label] = list(props_result[0]["props"].keys())
                else:
                    schema["nodes"][label] = []
            except:
                schema["nodes"][label] = []

        # Get relationship types
        rels_query = "CALL db.relationshipTypes()"
        rels = self.execute_cypher(rels_query)
        schema["relationships"] = [r.get("relationshipType") for r in rels]

        return schema


def main():
    """CLI interface for testing."""
    import argparse

    parser = argparse.ArgumentParser(description="Neo4j Tools CLI")
    parser.add_argument("--test", action="store_true", help="Run test queries")
    parser.add_argument("--status", action="store_true", help="Show data quality status")
    parser.add_argument("--schema", action="store_true", help="Show graph schema")

    args = parser.parse_args()

    tools = Neo4jTools()

    try:
        if args.status:
            status = tools.get_clean_data_status()
            print(json.dumps(status, indent=2))

        elif args.schema:
            schema = tools.get_graph_schema()
            print(json.dumps(schema, indent=2))

        elif args.test:
            # Test query_papers
            print("=== Testing query_papers (full dataset) ===")
            papers = tools.query_papers("""
                MATCH (p:Paper)
                RETURN p.title as title, p.published_date as date
                ORDER BY p.published_date DESC
                LIMIT 5
            """)
            print(f"Found {len(papers)} papers")
            for p in papers:
                print(f"  - {p['title'][:60]}... ({p['date']})")

            # Test query_authors
            print("\n=== Testing query_authors (clean data only) ===")
            authors = tools.query_authors("""
                MATCH (a:Author)-[:AUTHORED]->(p:Paper)
                RETURN a.name as name, count(p) as papers
                ORDER BY papers DESC
                LIMIT 5
            """)
            print(f"Found {len(authors)} top authors (clean data)")
            for a in authors:
                print(f"  - {a['name']}: {a['papers']} papers")

        else:
            parser.print_help()

    finally:
        tools.close()


if __name__ == "__main__":
    main()
