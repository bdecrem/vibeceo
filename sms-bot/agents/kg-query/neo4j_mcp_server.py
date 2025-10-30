#!/usr/bin/env python3
"""Minimal Model Context Protocol (MCP) stdio server exposing Neo4j tools."""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional

from neo4j_tools import Neo4jTools


PROTOCOL_VERSION = "2024-11-05"


@dataclass
class JsonRpcRequest:
    jsonrpc: str
    id: Optional[Any]
    method: str
    params: Dict[str, Any]


def read_message() -> Optional[JsonRpcRequest]:
    """
    Read a single JSON-RPC message from stdin using Content-Length framing.
    Returns None on EOF.
    """
    headers: Dict[str, str] = {}

    while True:
        line = sys.stdin.buffer.readline()
        if not line:
            return None

        # Header/body separator: blank line
        if line in (b"\n", b"\r\n"):
            break

        decoded = line.decode("utf-8").strip()
        if not decoded:
            continue

        if ":" not in decoded:
            # Invalid header, ignore to avoid hard crash
            continue
        key, value = decoded.split(":", 1)
        headers[key.strip().lower()] = value.strip()

    content_length = int(headers.get("content-length", "0"))
    if content_length <= 0:
        return None

    payload = sys.stdin.buffer.read(content_length)
    if not payload:
        return None

    data = json.loads(payload.decode("utf-8"))
    return JsonRpcRequest(
        jsonrpc=data.get("jsonrpc", "2.0"),
        id=data.get("id"),
        method=data.get("method", ""),
        params=data.get("params", {}) or {},
    )


def write_message(message: Dict[str, Any]) -> None:
    """Write JSON-RPC response with Content-Length framing."""
    body = json.dumps(message).encode("utf-8")
    sys.stdout.buffer.write(f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8"))
    sys.stdout.buffer.write(body)
    sys.stdout.buffer.flush()


def make_tools_payload() -> Iterable[Dict[str, Any]]:
    """Return tool definitions advertised to the client."""
    return [
        {
            "name": "read_neo4j_cypher",
            "description": "Execute a read-only Cypher query on the Neo4j graph database.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Cypher query to run",
                    },
                    "params": {
                        "type": "object",
                        "description": "Optional parameters",
                        "additionalProperties": True,
                    },
                },
                "required": ["query"],
            },
        },
        {
            "name": "get_neo4j_schema",
            "description": "Return node labels, relationship types, and sample properties from the graph.",
            "inputSchema": {
                "type": "object",
                "properties": {},
            },
        },
    ]


def handle_initialize(request: JsonRpcRequest) -> Dict[str, Any]:
    """Handle the initial handshake."""
    return {
        "jsonrpc": "2.0",
        "id": request.id,
        "result": {
            "protocolVersion": PROTOCOL_VERSION,
            "capabilities": {
                "tools": {
                    "listChanged": {"notifications": False},
                }
            },
            "serverInfo": {"name": "kg-neo4j-mcp", "version": "0.1.0"},
        },
    }


def handle_tools_list(request: JsonRpcRequest) -> Dict[str, Any]:
    """Return available tools."""
    return {
        "jsonrpc": "2.0",
        "id": request.id,
        "result": {
            "tools": list(make_tools_payload()),
        },
    }


def format_error_response(request: JsonRpcRequest, message: str, code: int = -32603) -> Dict[str, Any]:
    """Create JSON-RPC error response."""
    return {
        "jsonrpc": "2.0",
        "id": request.id,
        "error": {"code": code, "message": message},
    }


def handle_tool_call(request: JsonRpcRequest, neo4j: Neo4jTools) -> Dict[str, Any]:
    """Execute a tool call."""
    tool_name = request.params.get("name")
    arguments = request.params.get("arguments") or {}

    if tool_name == "read_neo4j_cypher":
        query = arguments.get("query")
        if not isinstance(query, str) or not query.strip():
            return format_error_response(request, "Missing 'query' parameter for read_neo4j_cypher", code=-32602)

        params = arguments.get("params") or {}
        try:
            results = neo4j.execute_cypher(query, params)
            payload = json.dumps(results, indent=2, default=str)
            return {
                "jsonrpc": "2.0",
                "id": request.id,
                "result": {
                    "content": [{"type": "text", "text": payload}],
                },
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "jsonrpc": "2.0",
                "id": request.id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Neo4j query error: {exc}",
                        }
                    ],
                    "isError": True,
                },
            }

    if tool_name == "get_neo4j_schema":
        try:
            schema = neo4j.get_graph_schema()
            payload = json.dumps(schema, indent=2)
            return {
                "jsonrpc": "2.0",
                "id": request.id,
                "result": {
                    "content": [{"type": "text", "text": payload}],
                },
            }
        except Exception as exc:  # noqa: BLE001
            return {
                "jsonrpc": "2.0",
                "id": request.id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": f"Neo4j schema error: {exc}",
                        }
                    ],
                    "isError": True,
                },
            }

    return format_error_response(request, f"Unknown tool: {tool_name}", code=-32601)


def main() -> None:
    neo4j = Neo4jTools()
    try:
        while True:
            message = read_message()
            if message is None:
                break

            method = message.method
            if method == "initialize":
                write_message(handle_initialize(message))
            elif method == "tools/list":
                write_message(handle_tools_list(message))
            elif method == "tools/call":
                write_message(handle_tool_call(message, neo4j))
            elif method == "shutdown":
                write_message({"jsonrpc": "2.0", "id": message.id, "result": None})
                break
            elif method == "ping":
                write_message({"jsonrpc": "2.0", "id": message.id, "result": {}})
            else:
                write_message(format_error_response(message, f"Unsupported method: {method}", code=-32601))
    finally:
        neo4j.close()


if __name__ == "__main__":
    main()
