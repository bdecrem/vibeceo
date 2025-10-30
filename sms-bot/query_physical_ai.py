#!/usr/bin/env python3
import sys
sys.path.insert(0, 'agents/kg-query')
from neo4j_tools import Neo4jTools
import json

tools = Neo4jTools()

query = """
MATCH (p:Paper)-[:IN_CATEGORY]->(c:Category)
WHERE p.published_date >= date('2025-10-26')
  AND (p.title =~ "(?i).*(robot|embodied|physical|manipulation|navigation|humanoid|locomotion|grasping|hardware).*"
       OR p.abstract =~ "(?i).*(physical AI|embodied AI|robotics|manipulation|real-world deployment|physical interaction|hardware).*")
RETURN p.arxiv_id, p.title, p.abstract, p.published_date, collect(c.name) as categories
ORDER BY p.published_date DESC
LIMIT 10
"""

results = tools.query_papers(query)
print(json.dumps(results, indent=2, default=str))
tools.close()
