#!/usr/bin/env python3
"""
Custom Neo4j tools for Claude Agent SDK

Provides direct Neo4j access as custom tools (no MCP dependency).
Works on Railway and local environments.
"""

import os
import json
from typing import List, Dict, Any
from neo4j_tools import Neo4jTools


def get_neo4j_tools_for_agent() -> List[Dict[str, Any]]:
    """
    Return custom tools list for Claude Agent SDK.

    These tools match the MCP Neo4j tool interface but use direct driver access.
    """
    # Initialize Neo4j tools
    neo4j = Neo4jTools()

    def read_cypher_tool(query: str, params: Dict[str, Any] = None) -> str:
        """Execute a Cypher query and return results as JSON."""
        try:
            results = neo4j.execute_cypher(query, params)
            return json.dumps(results, indent=2, default=str)
        except Exception as e:
            return json.dumps({"error": str(e)})

    def get_schema_tool() -> str:
        """Get Neo4j graph schema."""
        try:
            schema = neo4j.get_graph_schema()
            return json.dumps(schema, indent=2)
        except Exception as e:
            return json.dumps({"error": str(e)})

    # Define tools in claude-agent-sdk format
    tools = [
        {
            "name": "read_neo4j_cypher",
            "description": "Execute a read-only Cypher query on the Neo4j graph database and return results",
            "input_schema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "The Cypher query to execute"
                    },
                    "params": {
                        "type": "object",
                        "description": "Optional query parameters",
                        "additionalProperties": True
                    }
                },
                "required": ["query"]
            },
            "function": read_cypher_tool
        },
        {
            "name": "get_neo4j_schema",
            "description": "Get the schema of the Neo4j graph database (node labels, relationships, properties)",
            "input_schema": {
                "type": "object",
                "properties": {}
            },
            "function": get_schema_tool
        }
    ]

    return tools
