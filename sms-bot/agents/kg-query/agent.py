#!/usr/bin/env python3
"""
KG Query Agent - Claude Agent SDK Implementation

Queries Neo4j directly and injects results into prompt for Claude to process.
No MCP tools needed - follows working pattern from arxiv-research-graph.
"""

import argparse
import asyncio
import json
import os
import sys
import re
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional

# Import Claude Agent SDK
try:
    from claude_agent_sdk import ClaudeAgentOptions, query
except ImportError as e:
    print(f"Error importing claude-agent-sdk: {e}", file=sys.stderr)
    sys.exit(1)

# Import Neo4j tools
try:
    from neo4j_tools import Neo4jTools
except ImportError as e:
    print(f"Error importing neo4j_tools: {e}", file=sys.stderr)
    sys.exit(1)


def classify_query_intent(user_query: str) -> str:
    """
    Classify user query into intent categories.

    Returns:
        - "top_authors" - asking about most productive/prolific authors
        - "recent_papers" - asking about recent papers
        - "topic_search" - asking about specific research area/keyword
        - "author_lookup" - asking about a specific author
        - "trending" - asking what's hot/trending
        - "general" - fallback for everything else
    """
    query_lower = user_query.lower()

    # Top authors
    if any(phrase in query_lower for phrase in [
        "top author", "most author", "prolific author", "who are the",
        "best researcher", "leading researcher", "most productive"
    ]):
        return "top_authors"

    # Recent papers
    if any(phrase in query_lower for phrase in [
        "recent paper", "latest paper", "new paper", "this week", "today",
        "last few days", "yesterday", "past week"
    ]):
        return "recent_papers"

    # Trending topics
    if any(phrase in query_lower for phrase in [
        "trending", "hot topic", "popular", "what's hot", "heating up",
        "growing", "buzz", "momentum"
    ]):
        return "trending"

    # Author lookup (contains names or mentions specific person)
    if re.search(r'\b[A-Z][a-z]+ [A-Z][a-z]+\b', user_query):
        return "author_lookup"

    # Topic search (contains technical terms or "about")
    if any(phrase in query_lower for phrase in [
        "about", "related to", "on the topic", "papers on", "research on",
        "transformer", "diffusion", "reinforcement", "vision", "language model"
    ]):
        return "topic_search"

    return "general"


def extract_topic_keywords(user_query: str) -> List[str]:
    """Extract key research terms from user query."""
    query_lower = user_query.lower()

    # Common research keywords
    keywords = []
    terms = [
        "transformer", "attention", "diffusion", "gan", "vae",
        "reinforcement learning", "rl", "deep learning",
        "computer vision", "nlp", "language model", "llm",
        "neural network", "cnn", "rnn", "lstm", "bert", "gpt",
        "multimodal", "self-supervised", "few-shot", "zero-shot"
    ]

    for term in terms:
        if term in query_lower:
            keywords.append(term)

    # Also try to extract quoted phrases
    quoted = re.findall(r'"([^"]+)"', user_query)
    keywords.extend(quoted)

    return keywords[:3]  # Limit to top 3


def get_top_authors_data(neo4j: Neo4jTools, limit: int = 10) -> Dict[str, Any]:
    """Query top authors by paper count."""
    query = """
    MATCH (a:Author)-[:AUTHORED]->(p:Paper)
    WHERE a.canonical_kid IS NOT NULL
      AND a.migrated_from_old_system = true
    WITH a.canonical_kid as canonical,
         collect(DISTINCT a.name)[0] as name,
         collect(DISTINCT a.affiliation)[0] as affiliation,
         count(DISTINCT p) as paper_count
    RETURN name, affiliation, paper_count
    ORDER BY paper_count DESC
    LIMIT $limit
    """

    try:
        results = neo4j.execute_cypher(query, {"limit": limit})
        return {
            "type": "top_authors",
            "count": len(results),
            "authors": results
        }
    except Exception as e:
        print(f"Error querying top authors: {e}", file=sys.stderr)
        return {"type": "top_authors", "count": 0, "authors": [], "error": str(e)}


def get_recent_papers_data(neo4j: Neo4jTools, days: int = 7, limit: int = 15) -> Dict[str, Any]:
    """Query recent papers from last N days."""
    cutoff_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    query = """
    MATCH (p:Paper)
    WHERE p.published_date >= date($cutoff_date)
    OPTIONAL MATCH (p)-[:IN_CATEGORY]->(c:Category)
    WITH p, collect(DISTINCT c.name) as categories
    RETURN p.arxiv_id as arxiv_id,
           p.title as title,
           p.abstract as abstract,
           p.published_date as published_date,
           p.featured_in_report as featured,
           categories
    ORDER BY p.published_date DESC
    LIMIT $limit
    """

    try:
        results = neo4j.execute_cypher(query, {"cutoff_date": cutoff_date, "limit": limit})
        return {
            "type": "recent_papers",
            "days": days,
            "count": len(results),
            "papers": results
        }
    except Exception as e:
        print(f"Error querying recent papers: {e}", file=sys.stderr)
        return {"type": "recent_papers", "count": 0, "papers": [], "error": str(e)}


def get_topic_papers_data(neo4j: Neo4jTools, keywords: List[str], limit: int = 10) -> Dict[str, Any]:
    """Query papers matching topic keywords."""
    if not keywords:
        return {"type": "topic_search", "keywords": [], "count": 0, "papers": []}

    # Build CONTAINS clauses for each keyword
    keyword_conditions = " OR ".join([f"toLower(p.title) CONTAINS toLower('{kw}')" for kw in keywords])

    query = f"""
    MATCH (p:Paper)
    WHERE {keyword_conditions}
    OPTIONAL MATCH (p)-[:IN_CATEGORY]->(c:Category)
    WITH p, collect(DISTINCT c.name) as categories
    RETURN p.arxiv_id as arxiv_id,
           p.title as title,
           p.abstract as abstract,
           p.published_date as published_date,
           categories
    ORDER BY p.published_date DESC
    LIMIT $limit
    """

    try:
        results = neo4j.execute_cypher(query, {"limit": limit})
        return {
            "type": "topic_search",
            "keywords": keywords,
            "count": len(results),
            "papers": results
        }
    except Exception as e:
        print(f"Error querying topic papers: {e}", file=sys.stderr)
        return {"type": "topic_search", "keywords": keywords, "count": 0, "papers": [], "error": str(e)}


def get_trending_topics_data(neo4j: Neo4jTools) -> Dict[str, Any]:
    """Query trending research topics (week-over-week growth)."""
    query = """
    MATCH (p:Paper)-[:IN_CATEGORY]->(c:Category)
    WHERE p.published_date >= date($start_date)
      AND p.published_date <= date($end_date)
    WITH c.name as category,
         count(CASE
           WHEN p.published_date >= date($recent_start)
           THEN 1 END) as recent_count,
         count(CASE
           WHEN p.published_date < date($recent_start)
           THEN 1 END) as earlier_count
    WHERE recent_count >= 10
    WITH category, recent_count, earlier_count,
         (recent_count * 1.0 / CASE WHEN earlier_count > 0 THEN earlier_count ELSE 1 END) as growth
    WHERE growth >= 1.3
    RETURN category, recent_count, earlier_count, round(growth, 2) as growth
    ORDER BY growth DESC, recent_count DESC
    LIMIT 5
    """

    today = datetime.now()
    params = {
        "start_date": (today - timedelta(days=14)).strftime("%Y-%m-%d"),
        "end_date": today.strftime("%Y-%m-%d"),
        "recent_start": (today - timedelta(days=7)).strftime("%Y-%m-%d"),
    }

    try:
        results = neo4j.execute_cypher(query, params)
        return {
            "type": "trending_topics",
            "count": len(results),
            "topics": results
        }
    except Exception as e:
        print(f"Error querying trending topics: {e}", file=sys.stderr)
        return {"type": "trending_topics", "count": 0, "topics": [], "error": str(e)}


def format_graph_data_for_prompt(graph_data: Dict[str, Any]) -> str:
    """Format graph query results as readable text for prompt."""
    data_type = graph_data.get("type", "unknown")

    if data_type == "top_authors":
        authors = graph_data.get("authors", [])
        if not authors:
            return "No author data available."

        lines = ["TOP AUTHORS (by paper count):"]
        for i, author in enumerate(authors[:10], 1):
            name = author.get("name", "Unknown")
            papers = author.get("paper_count", 0)
            affiliation = author.get("affiliation", "")
            aff_text = f" ({affiliation})" if affiliation else ""
            lines.append(f"{i}. {name}{aff_text}: {papers} papers")
        return "\n".join(lines)

    elif data_type == "recent_papers":
        papers = graph_data.get("papers", [])
        days = graph_data.get("days", 7)
        if not papers:
            return f"No papers found in last {days} days."

        lines = [f"RECENT PAPERS (last {days} days, {len(papers)} found):"]
        for i, paper in enumerate(papers[:15], 1):
            title = paper.get("title", "Unknown")
            arxiv_id = paper.get("arxiv_id", "")
            date = paper.get("published_date", "")
            featured = "⭐" if paper.get("featured") else ""
            lines.append(f"{i}. [{arxiv_id}] {title[:80]}... {featured}")
            lines.append(f"   Date: {date}")
        return "\n".join(lines)

    elif data_type == "topic_search":
        papers = graph_data.get("papers", [])
        keywords = graph_data.get("keywords", [])
        if not papers:
            return f"No papers found for keywords: {', '.join(keywords)}"

        lines = [f"PAPERS MATCHING '{', '.join(keywords)}' ({len(papers)} found):"]
        for i, paper in enumerate(papers[:10], 1):
            title = paper.get("title", "Unknown")
            arxiv_id = paper.get("arxiv_id", "")
            date = paper.get("published_date", "")
            lines.append(f"{i}. [{arxiv_id}] {title[:80]}...")
            lines.append(f"   Date: {date}")
        return "\n".join(lines)

    elif data_type == "trending_topics":
        topics = graph_data.get("topics", [])
        if not topics:
            return "No trending topics detected (distributed activity across categories)."

        lines = ["TRENDING TOPICS (week-over-week growth):"]
        for i, topic in enumerate(topics, 1):
            category = topic.get("category", "Unknown")
            growth = topic.get("growth", 0)
            recent = topic.get("recent_count", 0)
            earlier = topic.get("earlier_count", 0)
            lines.append(f"{i}. {category}: {growth}x growth ({earlier}→{recent} papers)")
        return "\n".join(lines)

    return f"Graph data: {json.dumps(graph_data, indent=2)}"


async def run_kg_query(
    user_query: str,
    conversation_history: List[Dict[str, str]],
    todays_report_context: str,
    clean_data_boundary: Dict[str, Any]
) -> str:
    """
    Run KG query using direct Neo4j queries + Claude Agent SDK.

    Args:
        user_query: User's natural language question
        conversation_history: Previous messages (for follow-ups)
        todays_report_context: Summary of today's arXiv report
        clean_data_boundary: Dict with startDate, endDate, cleanPercentage

    Returns:
        Natural language response (SMS-friendly)
    """
    # Get clean data info
    clean_start = clean_data_boundary.get("startDate", "Unknown")
    clean_end = clean_data_boundary.get("endDate", "Unknown")
    clean_pct = clean_data_boundary.get("cleanPercentage", 0)

    # Format conversation history
    conv_text = ""
    if conversation_history:
        conv_text = "\n".join([
            f"{msg['role'].upper()}: {msg['content']}"
            for msg in conversation_history[-5:]  # Last 5 exchanges
        ])

    # Classify query intent
    intent = classify_query_intent(user_query)
    print(f"[KG Agent] Query intent: {intent}", file=sys.stderr)

    # Query Neo4j based on intent
    neo4j = Neo4jTools()
    try:
        if intent == "top_authors":
            graph_data = get_top_authors_data(neo4j, limit=10)
        elif intent == "recent_papers":
            # Extract time window if mentioned
            days = 7
            if "today" in user_query.lower():
                days = 1
            elif "yesterday" in user_query.lower():
                days = 2
            elif "this week" in user_query.lower():
                days = 7
            graph_data = get_recent_papers_data(neo4j, days=days, limit=15)
        elif intent == "topic_search":
            keywords = extract_topic_keywords(user_query)
            if not keywords:
                # Fallback: use the query itself
                keywords = [user_query.lower().strip()]
            graph_data = get_topic_papers_data(neo4j, keywords=keywords, limit=10)
        elif intent == "trending":
            graph_data = get_trending_topics_data(neo4j)
        else:
            # General: get recent papers + top authors as context
            graph_data = {
                "type": "general",
                "recent_papers": get_recent_papers_data(neo4j, days=7, limit=10),
                "top_authors": get_top_authors_data(neo4j, limit=5)
            }
    finally:
        neo4j.close()

    # Format graph data for prompt
    if graph_data.get("type") == "general":
        graph_context = f"""
RECENT PAPERS:
{format_graph_data_for_prompt(graph_data['recent_papers'])}

{format_graph_data_for_prompt(graph_data['top_authors'])}
"""
    else:
        graph_context = format_graph_data_for_prompt(graph_data)

    # Build prompt with graph data injected
    prompt = f"""You are a Neo4j graph database expert helping users explore arXiv AI research papers.

TODAY'S CONTEXT:
{todays_report_context}

CONVERSATION HISTORY:
{conv_text if conv_text else "(No previous conversation)"}

DATA QUALITY STATUS:
- Full paper dataset: All papers from Feb 2024 to present (~160K papers)
- Clean author data: {clean_start} to {clean_end} ({clean_pct:.1f}% of papers)
- Clean = authors with verified identity (migrated + fuzzy matched)

NEO4J GRAPH SCHEMA:
- Nodes: Paper (arxiv_id, title, abstract, published_date, featured_in_report)
         Author (kochi_author_id, name, canonical_kid, affiliation)
         Category (name: cs.AI, cs.LG, cs.CV, cs.CL, stat.ML)
- Relationships: AUTHORED (Author → Paper, has position property)
                 IN_CATEGORY (Paper → Category)

GRAPH DATA (pre-queried from Neo4j):
{graph_context}

USER QUERY: {user_query}

Task: Answer the user's question using the graph data above. Be conversational and concise (~400-500 chars for SMS). Include specific names, numbers, arxiv IDs when relevant.
"""

    # Configure Claude Agent SDK (no MCP tools needed)
    options = ClaudeAgentOptions(
        model="claude-sonnet-4-5-20250929",
        permission_mode="acceptEdits",  # Works in non-interactive mode (Railway + local)
        allowed_tools=[],  # No tools needed - data already in prompt
    )

    debug_enabled = bool(os.getenv("KG_AGENT_DEBUG"))

    def _extract_text_segments(message: Any) -> List[str]:
        """Extract text-like segments from SDK messages."""
        raw_segments: List[str] = []

        # Common direct attributes
        for attr in ("text", "result_text", "result"):
            value = getattr(message, attr, None)
            if isinstance(value, str):
                raw_segments.append(value)

        # Message content can be a string or list of blocks
        content = getattr(message, "content", None)
        if isinstance(content, str):
            raw_segments.append(content)
        elif isinstance(content, list):
            for block in content:
                if isinstance(block, dict):
                    for key in ("text", "result_text", "result"):
                        text_value = block.get(key)
                        if isinstance(text_value, str):
                            raw_segments.append(text_value)
                else:
                    for attr in ("text", "result_text", "result"):
                        text_value = getattr(block, attr, None)
                        if isinstance(text_value, str):
                            raw_segments.append(text_value)

        # Some messages provide delta payloads
        delta = getattr(message, "delta", None)
        if isinstance(delta, dict):
            for key in ("text", "result_text", "result"):
                delta_value = delta.get(key)
                if isinstance(delta_value, str):
                    raw_segments.append(delta_value)

        # Deduplicate while preserving order
        segments: List[str] = []
        seen: set[str] = set()
        for segment in raw_segments:
            cleaned = segment.strip()
            if not cleaned or cleaned in seen:
                continue
            seen.add(cleaned)
            segments.append(cleaned)
        return segments

    # Run query - it returns an async iterator of messages
    try:
        response_text = ""
        last_text_segment = ""
        collected_segments: List[str] = []

        async for message in query(prompt=prompt, options=options):
            message_type = getattr(message, "type", "")
            text_segments = _extract_text_segments(message)

            if debug_enabled:
                print(
                    f"[KG Agent Debug] message_type={message_type} segments={len(text_segments)}",
                    file=sys.stderr
                )

            if not text_segments:
                continue

            collected_segments.extend(text_segments)
            last_text_segment = text_segments[-1]

        if collected_segments:
            # Prefer the last segment (final response), fallback to joined text
            response_text = last_text_segment or "\n".join(collected_segments)

        if not response_text:
            return "Sorry, I couldn't generate a response. Please try again."

        response_text = response_text.strip()

        # Truncate if too long for SMS
        if len(response_text) > 600:
            response_text = response_text[:597] + "..."

        print(f"[KG Agent] Response generated successfully", file=sys.stderr)
        return response_text
    except Exception as e:
        print(f"Agent error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return f"Sorry, I encountered an error: {str(e)[:100]}"


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="KG Query Agent")
    parser.add_argument(
        "--input",
        type=str,
        required=True,
        help="JSON input with query, conversation_history, todays_report_context, clean_data_boundary"
    )

    args = parser.parse_args()

    try:
        # Parse input
        input_data = json.loads(args.input)
        query_text = input_data.get("query", "")
        conversation_history = input_data.get("conversation_history", [])
        todays_report_context = input_data.get("todays_report_context", "")
        clean_data_boundary = input_data.get("clean_data_boundary", {})

        if not query_text:
            print("Error: No query provided", file=sys.stderr)
            sys.exit(1)

        # Run async query
        response = asyncio.run(run_kg_query(
            query_text,
            conversation_history,
            todays_report_context,
            clean_data_boundary
        ))

        print(response)

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
