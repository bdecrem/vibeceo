#!/usr/bin/env python3
"""
Together.ai Function Calling Tools for gpt-oss-20b

Provides web search via Brave API and a function-calling wrapper
for the gpt-oss-20b model on Together.ai.

Usage:
    from tools import search_with_ai, brave_search, call_with_tools

    # Direct search
    results = brave_search("latest AI news", count=5)

    # AI-assisted search (model decides when to search)
    response = search_with_ai(
        client=together_client,
        query="What were the major AI announcements this week?"
    )

    # Custom tool calling
    response = call_with_tools(
        client=together_client,
        messages=[{"role": "user", "content": "Search for..."}],
        tools=[BRAVE_SEARCH_TOOL],
        tool_handlers={"brave_search": brave_search}
    )
"""

import json
import os
import urllib.request
import urllib.parse
from typing import Any, Callable

# =============================================================================
# BRAVE SEARCH
# =============================================================================

def brave_search(query: str = "", count: int = 5, **kwargs) -> dict:
    """
    Search the web using Brave Search API.

    Args:
        query: Search query string
        count: Number of results (1-10)
        **kwargs: Ignored (handles malformed model calls)

    Returns:
        dict with 'results' list or 'error' string
    """
    # Handle malformed calls from model
    if not query or not isinstance(query, str):
        return {"error": "Invalid query - must be a non-empty string"}

    brave_key = os.getenv("BRAVE_API_KEY")
    if not brave_key:
        return {"error": "BRAVE_API_KEY not configured"}

    count = max(1, min(count, 10))

    try:
        url = f"https://api.search.brave.com/res/v1/web/search?q={urllib.parse.quote(query)}&count={count}"
        req = urllib.request.Request(url, headers={
            "Accept": "application/json",
            "X-Subscription-Token": brave_key
        })

        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

        results = []
        for item in data.get("web", {}).get("results", [])[:count]:
            results.append({
                "title": item.get("title", ""),
                "url": item.get("url", ""),
                "description": item.get("description", "")
            })

        return {"results": results}

    except urllib.error.HTTPError as e:
        return {"error": f"Brave API error {e.code}"}
    except Exception as e:
        return {"error": str(e)}


# =============================================================================
# TOOL DEFINITIONS (OpenAI-compatible format for Together.ai)
# =============================================================================

BRAVE_SEARCH_TOOL = {
    "type": "function",
    "function": {
        "name": "brave_search",
        "description": "Search the web using Brave Search. Use this to find current information, news, documentation, or any real-time data.",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query"
                },
                "count": {
                    "type": "integer",
                    "description": "Number of results to return (1-10)",
                    "default": 5
                }
            },
            "required": ["query"]
        }
    }
}

# Default tool handlers
DEFAULT_TOOL_HANDLERS: dict[str, Callable] = {
    "brave_search": lambda args: brave_search(**args) if isinstance(args, dict) else {"error": "Invalid arguments"}
}


# =============================================================================
# FUNCTION CALLING WRAPPER
# =============================================================================

def call_with_tools(
    client,  # Together client
    messages: list[dict],
    tools: list[dict] | None = None,
    tool_handlers: dict[str, Callable] | None = None,
    model: str = "openai/gpt-oss-20b",
    max_tokens: int = 2000,
    temperature: float = 0.7,
    max_iterations: int = 3,
    stop_on_tool_error: bool = False,
) -> dict:
    """
    Call gpt-oss-20b with function calling support.

    Handles the tool call loop automatically:
    1. Send messages to model
    2. If model returns tool_calls, execute them
    3. Feed results back to model
    4. Repeat until model returns final response or max iterations

    Args:
        client: Together client instance
        messages: Conversation messages
        tools: List of tool definitions (OpenAI format)
        tool_handlers: Dict mapping tool names to handler functions
        model: Model ID
        max_tokens: Max tokens for response
        temperature: Sampling temperature
        max_iterations: Max tool call iterations
        stop_on_tool_error: If True, stop and return when a tool returns an error

    Returns:
        dict with 'content' (final response), 'tool_calls' (list of calls made),
        'iterations' (number of iterations), 'error' (if any)
    """
    if tools is None:
        tools = [BRAVE_SEARCH_TOOL]

    if tool_handlers is None:
        tool_handlers = DEFAULT_TOOL_HANDLERS

    current_messages = list(messages)
    all_tool_calls = []

    for iteration in range(max_iterations + 1):  # +1 to allow final response after tools
        try:
            # On last iteration, don't offer tools - force a text response
            if iteration < max_iterations:
                response = client.chat.completions.create(
                    model=model,
                    messages=current_messages,
                    tools=tools,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )
            else:
                # Final iteration: no tools, just get text response
                response = client.chat.completions.create(
                    model=model,
                    messages=current_messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                )

            choice = response.choices[0]
            message = choice.message

            # Check if model wants to call tools
            if message.tool_calls:
                # Add assistant message with tool calls
                current_messages.append({
                    "role": "assistant",
                    "content": message.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments
                            }
                        }
                        for tc in message.tool_calls
                    ]
                })

                # Execute each tool call (but only the first valid one to avoid model confusion)
                got_valid_result = False
                for tool_call in message.tool_calls:
                    func_name = tool_call.function.name

                    try:
                        func_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        func_args = {}

                    # Skip malformed calls (model sometimes passes results as args)
                    if func_name == "brave_search" and "query" not in func_args:
                        continue

                    # Execute tool
                    if func_name in tool_handlers:
                        result = tool_handlers[func_name](func_args)
                    else:
                        result = {"error": f"Unknown tool: {func_name}"}

                    all_tool_calls.append({
                        "name": func_name,
                        "args": func_args,
                        "result": result
                    })

                    # Add tool result to messages
                    current_messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call.id,
                        "content": json.dumps(result)
                    })

                    # Check for tool error
                    if stop_on_tool_error and isinstance(result, dict) and "error" in result:
                        return {
                            "content": f"Tool error: {result['error']}",
                            "tool_calls": all_tool_calls,
                            "iterations": iteration + 1,
                            "error": result["error"]
                        }

                    # Got valid results - only execute one tool call per iteration
                    if isinstance(result, dict) and "results" in result:
                        got_valid_result = True
                        break

                # Continue loop to get model's response to tool results
                continue

            # No tool calls - model is done
            content = message.content or ""

            # Clean up model formatting artifacts
            if "<|" in content:
                # Extract the actual response after model tokens
                import re
                # Find the last meaningful text after all the <|...|> tokens
                parts = re.split(r'<\|[^|]+\|>', content)
                content = parts[-1].strip() if parts else content

            return {
                "content": content,
                "tool_calls": all_tool_calls,
                "iterations": iteration + 1,
            }

        except Exception as e:
            return {
                "content": "",
                "tool_calls": all_tool_calls,
                "iterations": iteration + 1,
                "error": str(e)
            }

    # Max iterations reached
    return {
        "content": current_messages[-1].get("content", "") if current_messages else "",
        "tool_calls": all_tool_calls,
        "iterations": max_iterations,
        "error": "Max iterations reached"
    }


def search_with_ai(
    client,  # Together client
    query: str,
    system_prompt: str | None = None,
    model: str = "openai/gpt-oss-20b",
    max_tokens: int = 2000,
) -> dict:
    """
    Convenience function for AI-assisted web search.

    The model will decide whether to search and how to synthesize results.

    Args:
        client: Together client instance
        query: User's question or request
        system_prompt: Optional system prompt
        model: Model ID
        max_tokens: Max tokens for response

    Returns:
        dict with 'content', 'tool_calls', 'iterations', 'error'
    """
    default_system = """You are a helpful assistant with web search access.
Call brave_search ONCE with a clear query, then answer the user directly using those results.
Cite sources with URLs."""

    messages = []
    if system_prompt or default_system:
        messages.append({"role": "system", "content": system_prompt or default_system})
    messages.append({"role": "user", "content": query})

    return call_with_tools(
        client=client,
        messages=messages,
        tools=[BRAVE_SEARCH_TOOL],
        model=model,
        max_tokens=max_tokens,
        max_iterations=2,  # One search + one response
    )


# =============================================================================
# CLI TEST
# =============================================================================

if __name__ == "__main__":
    import sys
    from pathlib import Path

    # Load env
    repo_root = Path(__file__).parent.parent.parent
    env_path = repo_root / "sms-bot" / ".env.local"

    from dotenv import load_dotenv
    if env_path.exists():
        load_dotenv(env_path)
        print(f"[ENV] Loaded from {env_path}")

    # Test direct search
    print("\n=== Direct Brave Search ===")
    result = brave_search("gpt-oss-20b together.ai", count=3)
    print(json.dumps(result, indent=2))

    # Test with AI if Together key available
    together_key = os.getenv("TOGETHER_API_KEY")
    if together_key:
        from together import Together
        client = Together(api_key=together_key)

        print("\n=== AI-Assisted Search ===")
        query = sys.argv[1] if len(sys.argv) > 1 else "What is gpt-oss-20b?"
        print(f"Query: {query}\n")

        result = search_with_ai(client, query)

        print(f"Tool calls: {len(result.get('tool_calls', []))}")
        for tc in result.get('tool_calls', []):
            print(f"  - {tc['name']}({tc['args']})")

        print(f"\nResponse:\n{result.get('content', '')}")

        if result.get('error'):
            print(f"\nError: {result['error']}")
    else:
        print("\n[Skip AI test - TOGETHER_API_KEY not set]")
