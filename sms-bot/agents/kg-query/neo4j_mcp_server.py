#!/usr/bin/env python3
"""
Simple MCP server for Neo4j tools

Provides Neo4j query tools via stdio MCP protocol.
Works with claude-agent-sdk without external MCP infrastructure.
"""

import asyncio
import json
import sys
from typing import Any, Dict

from neo4j_tools import Neo4jTools


# Initialize Neo4j tools
neo4j = Neo4jTools()


# MCP stdio protocol implementation
async def handle_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """Handle MCP tool requests."""
    method = request.get("method")
    params = request.get("params", {})

    if method == "tools/list":
        # Return available tools
        return {
            "tools": [
                {
                    "name": "read_neo4j_cypher",
                    "description": "Execute a read-only Cypher query on the Neo4j graph database",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The Cypher query to execute"
                            },
                            "params": {
                                "type": "object",
                                "description": "Optional query parameters"
                            }
                        },
                        "required": ["query"]
                    }
                },
                {
                    "name": "get_neo4j_schema",
                    "description": "Get the schema of the Neo4j graph database",
                    "inputSchema": {
                        "type": "object",
                        "properties": {}
                    }
                }
            ]
        }

    elif method == "tools/call":
        # Execute tool
        tool_name = params.get("name")
        arguments = params.get("arguments", {})

        if tool_name == "read_neo4j_cypher":
            query = arguments.get("query")
            query_params = arguments.get("params", {})
            try:
                results = neo4j.execute_cypher(query, query_params)
                return {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(results, indent=2, default=str)
                        }
                    ]
                }
            except Exception as e:
                return {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Error: {str(e)}"
                        }
                    ],
                    "isError": True
                }

        elif tool_name == "get_neo4j_schema":
            try:
                schema = neo4j.get_graph_schema()
                return {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(schema, indent=2)
                        }
                    ]
                }
            except Exception as e:
                return {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Error: {str(e)}"
                        }
                    ],
                    "isError": True
                }

        else:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": f"Unknown tool: {tool_name}"
                    }
                ],
                "isError": True
            }

    else:
        return {"error": f"Unknown method: {method}"}


async def main():
    """Main MCP server loop."""
    while True:
        try:
            # Read JSON-RPC request from stdin
            line = sys.stdin.readline()
            if not line:
                break

            request = json.loads(line)
            response = await handle_request(request)

            # Write JSON-RPC response to stdout
            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()

        except Exception as e:
            error_response = {
                "error": {"code": -32603, "message": str(e)}
            }
            sys.stdout.write(json.dumps(error_response) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    asyncio.run(main())
