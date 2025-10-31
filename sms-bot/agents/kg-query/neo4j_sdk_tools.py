#!/usr/bin/env python3
"""
Neo4j SDK Tools for Claude Agent SDK

Wraps Neo4jTools as in-process MCP server using create_sdk_mcp_server.
This approach works on Railway and enables true agentic behavior.
"""

import json
from typing import Any, Dict

from claude_agent_sdk import create_sdk_mcp_server, tool
from neo4j_tools import Neo4jTools


@tool(
    "execute_cypher",
    "Execute a Cypher query on the Neo4j graph database and return results as JSON",
    {"query": str, "params": str}
)
async def execute_cypher_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute Cypher query.

    Args:
        query: Cypher query string
        params: Optional query parameters (default: empty dict)

    Returns:
        Query results as JSON text
    """
    query = args.get("query", "")
    params_raw = args.get("params", {})

    # Handle params being passed as string by SDK
    if isinstance(params_raw, str):
        params = json.loads(params_raw) if params_raw else {}
    else:
        params = params_raw

    if not query:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"error": "Missing 'query' parameter"})
            }],
            "isError": True
        }

    neo4j = Neo4jTools()
    try:
        results = neo4j.execute_cypher(query, params)
        return {
            "content": [{
                "type": "text",
                "text": json.dumps(results, indent=2, default=str)
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({
                    "error": str(e),
                    "query": query
                }, indent=2)
            }],
            "isError": True
        }
    finally:
        neo4j.close()


@tool(
    "get_schema",
    "Get the Neo4j graph schema (node types, relationships, properties)",
    {}
)
async def get_schema_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get Neo4j graph schema.

    Returns:
        Graph schema as JSON with node types and relationships
    """
    neo4j = Neo4jTools()
    try:
        schema = neo4j.get_graph_schema()
        return {
            "content": [{
                "type": "text",
                "text": json.dumps(schema, indent=2)
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"error": str(e)}, indent=2)
            }],
            "isError": True
        }
    finally:
        neo4j.close()


@tool(
    "get_data_quality_status",
    "Get clean data boundaries (date ranges where author data is verified/clean)",
    {}
)
async def get_data_quality_status_tool(args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get clean data status.

    Returns:
        Date ranges and percentages for clean author data
    """
    neo4j = Neo4jTools()
    try:
        status = neo4j.get_clean_data_status()
        return {
            "content": [{
                "type": "text",
                "text": json.dumps(status, indent=2)
            }]
        }
    except Exception as e:
        return {
            "content": [{
                "type": "text",
                "text": json.dumps({"error": str(e)}, indent=2)
            }],
            "isError": True
        }
    finally:
        neo4j.close()


# Create SDK MCP server (in-process, works on Railway)
neo4j_server = create_sdk_mcp_server(
    name="neo4j",
    version="1.0.0",
    tools=[
        execute_cypher_tool,
        get_schema_tool,
        get_data_quality_status_tool
    ]
)
