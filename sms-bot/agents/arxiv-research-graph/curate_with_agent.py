#!/usr/bin/env python3
"""
Stage 2: AI-Powered Curation with Graph Insights

Uses Claude Agent SDK to generate intelligent reports leveraging Neo4j graph data.

This is the "crown jewel" - combining graph database insights about authors,
collaborations, and trends with AI-powered paper curation.
"""

import argparse
import asyncio
import json
import os
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Dict, Any

from neo4j import GraphDatabase
from claude_agent_sdk import ClaudeAgentOptions, query

# Neo4j configuration
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USERNAME = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")
NEO4J_DATABASE = os.getenv("NEO4J_DATABASE", "neo4j")


def build_graph_context(driver, target_date: date) -> Dict[str, Any]:
    """
    Query Neo4j to build rich context for the AI agent.

    Returns graph insights to be injected into the AI prompt.
    """
    with driver.session(database=NEO4J_DATABASE) as session:
        # Trending topics (1.3x+ growth week-over-week)
        trending_query = """
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

        start_date = (target_date - timedelta(days=14)).isoformat()
        end_date = target_date.isoformat()
        recent_start = (target_date - timedelta(days=7)).isoformat()

        trending_result = session.run(
            trending_query,
            start_date=start_date,
            end_date=end_date,
            recent_start=recent_start
        )
        trending_topics = [dict(record) for record in trending_result]

        # Productive authors today (multiple papers)
        productive_query = """
        MATCH (a:Author)-[:AUTHORED]->(p:Paper)
        WHERE p.published_date = date($date)
          AND a.canonical_kid IS NOT NULL
        WITH a.canonical_kid as canonical,
             collect(DISTINCT a.name)[0] as name,
             collect(DISTINCT a.affiliation)[0] as affiliation,
             collect(p.title) as papers,
             count(DISTINCT p) as paper_count
        WHERE paper_count >= 2
        RETURN name, affiliation, paper_count, papers
        ORDER BY paper_count DESC
        LIMIT 5
        """

        productive_result = session.run(productive_query, date=target_date.isoformat())
        productive_authors = [dict(record) for record in productive_result]

        # Rising stars (2x+ acceleration)
        rising_query = """
        MATCH (a:Author)-[:AUTHORED]->(p:Paper)
        WHERE a.canonical_kid IS NOT NULL
          AND p.published_date >= date($start_date)
          AND p.published_date <= date($end_date)
        WITH a.canonical_kid as canonical,
             collect(DISTINCT a.name)[0] as name,
             collect(DISTINCT a.affiliation)[0] as affiliation,
             count(CASE
               WHEN p.published_date >= date($recent_start)
               THEN 1 END) as recent_papers,
             count(CASE
               WHEN p.published_date < date($recent_start)
               THEN 1 END) as earlier_papers
        WHERE recent_papers >= 3 AND earlier_papers >= 1
        WITH name, affiliation, recent_papers, earlier_papers,
             (recent_papers * 1.0 / earlier_papers) as acceleration
        WHERE acceleration >= 2.0
        RETURN name, affiliation, recent_papers, earlier_papers,
               round(acceleration, 2) as acceleration
        ORDER BY acceleration DESC, recent_papers DESC
        LIMIT 3
        """

        rising_result = session.run(
            rising_query,
            start_date=(target_date - timedelta(days=60)).isoformat(),
            end_date=target_date.isoformat(),
            recent_start=(target_date - timedelta(days=30)).isoformat()
        )
        rising_stars = [dict(record) for record in rising_result]

        # Cross-institutional collaborations
        collab_query = """
        MATCH (p:Paper)
        WHERE p.published_date = date($date)
        MATCH (a:Author)-[:AUTHORED]->(p)
        WHERE a.affiliation IS NOT NULL
        WITH p, collect(DISTINCT a.affiliation) as institutions, count(DISTINCT a.affiliation) as inst_count
        WHERE inst_count >= 3
        RETURN p.title as title,
               p.arxiv_id as arxiv_id,
               institutions,
               inst_count
        ORDER BY inst_count DESC
        LIMIT 3
        """

        collab_result = session.run(collab_query, date=target_date.isoformat())
        collaborations = [dict(record) for record in collab_result]

    return {
        'trending_topics': trending_topics,
        'productive_authors': productive_authors,
        'rising_stars': rising_stars,
        'collaborations': collaborations,
    }


def format_graph_context(context: Dict[str, Any]) -> str:
    """Format graph context into readable text for the AI prompt."""
    lines = []

    # Active research areas (show counts only, no growth percentages)
    if context['trending_topics']:
        lines.append("**📈 Most Active Research Areas (by paper count this week):**")
        for topic in context['trending_topics']:
            lines.append(f"- **{topic['category']}**: {topic['recent_count']} papers this week")
        lines.append("")
    else:
        lines.append("**📈 Research Areas:** Activity broadly distributed across traditional AI/ML areas")
        lines.append("")

    # Productive authors
    if context['productive_authors']:
        lines.append("**🔥 Productive Researchers Today (multiple papers):**")
        for author in context['productive_authors']:
            affiliation = f" ({author['affiliation']})" if author.get('affiliation') else ""
            lines.append(f"- **{author['name']}**{affiliation} - {author['paper_count']} papers today")
        lines.append("")
    else:
        lines.append("**🔥 Productive Researchers:** No authors with multiple papers today")
        lines.append("")

    # Rising stars
    if context['rising_stars']:
        lines.append("**⭐ Rising Stars (2x+ publication acceleration):**")
        for star in context['rising_stars']:
            affiliation = f" ({star.get('affiliation')})" if star.get('affiliation') else ""
            lines.append(f"- **{star['name']}**{affiliation} - {star['acceleration']}x acceleration ({star['recent_papers']} recent vs {star['earlier_papers']} earlier)")
        lines.append("")
    else:
        lines.append("**⭐ Rising Stars:** No authors with significant acceleration detected")
        lines.append("")

    # Collaborations
    if context['collaborations']:
        lines.append("**🤝 Notable Cross-Institutional Collaborations (3+ institutions):**")
        for collab in context['collaborations']:
            lines.append(f"- **{collab['title']}** ({collab['arxiv_id']}) - {collab['inst_count']} institutions")
        lines.append("")
    else:
        lines.append("**🤝 Cross-Institutional Collaborations:** No major multi-institution papers today")
        lines.append("")

    return "\n".join(lines)


CURATION_PROMPT_TEMPLATE = """
You are an AI research analyst curating the most significant AI/ML papers from arXiv.

Today's date is {date_str}.

You have access to:
1. **Papers Data**: Read from {input_json_path} - contains all AI/ML papers published on {date_str}
2. **Graph Context**: Pre-analyzed Neo4j insights provided below (trending topics, productive authors, rising stars, collaborations)

**GRAPH CONTEXT ALREADY ANALYZED:**

{graph_context}

**YOUR TASK:**

1. **Read the papers JSON file** at {input_json_path} to see all papers published today

2. **Leverage the graph context above** - it contains valuable insights about:
   - Trending research topics
   - Productive authors and their publication velocity
   - Rising stars showing rapid growth
   - Notable cross-institutional collaborations

3. **Select TOP 5-10 papers** (aim for 7) based on:
   - **Novelty** (30%): Is this genuinely new or incremental?
   - **Impact Potential** (25%): Practical applications? Broad applicability?
   - **Author Notability** (20%): Leverage graph data above - productive researchers? rising stars? strong track record?
   - **Research Quality** (15%): Rigor, experimental design, solid results
   - **Timeliness** (10%): Addresses trending areas identified above?

4. **CRITICAL: Highlight 3-5 NOTEWORTHY AUTHORS** in a dedicated section:
   - Prioritize authors from the graph context above (productive researchers, rising stars)
   - Use graph data to tell their story (publication velocity, research areas, acceleration)
   - Look for "up and coming" authors - those showing promise
   - Make this section INTERESTING and DATA-DRIVEN

5. **Write files using the Write tool**:
   - Markdown report: {output_md_path}
   - JSON metadata: {output_json_path}

**MARKDOWN REPORT STRUCTURE:**

```markdown
# AI Research Papers - Daily Curated Brief
**Date:** {date_str}
**Curated:** [N] papers from [TOTAL] submissions

---

## Executive Summary

[Write 2-3 sentences (MAX 320 chars total for SMS) highlighting the most INTELLECTUALLY INTERESTING papers from today's batch. Focus on:
- What new ideas or techniques emerged (e.g., "Novel diffusion approach achieves 10x speedup")
- Surprising findings or counterintuitive results
- Papers that advance long-standing research questions
- Notable authors if relevant (e.g., "Hinton's team explores...")
- ONE brief mention of which area was most active IF notably unusual (e.g., "Computer networking particularly active with 15 papers")

AVOID:
- Growth percentages and "X leads with Y% growth" language
- Competitive framing ("dominated," "leads," "explosive")
- Treating research areas like stock tickers or sports teams
- Generic excitement without substance

GOOD: "Three papers explore diffusion model efficiency, with a Stanford team achieving 10x speedup. Computer networking saw unusual activity around edge AI deployment."

BAD: "Computer Networking leads with explosive 2.83x growth, driven by edge computing needs. This aligns with industry push toward decentralized deployment."]

---

## 📚 Research Activity Overview

[Write 1-2 sentences about the overall research landscape. Mention which area was most active ONLY if it's notably unusual. Otherwise, focus on thematic connections between papers or interesting research directions.]

Examples:
- "Computer networking unusually active today with 15 papers exploring edge AI deployment. Several featured papers tackle transformer efficiency from different angles."
- "Activity broadly distributed across traditional AI/ML areas. Interesting convergence on multimodal learning techniques across vision and language domains."

Do NOT write competitive/growth-focused analysis like "X leads with Y% growth."

---

## 👥 Noteworthy Researchers Today

[CRITICAL SECTION - Make this INTERESTING! Highlight 3-5 authors based on:]
- Productive researchers publishing multiple papers
- Rising stars with accelerating publication rates
- Authors with interesting track records or collaborations
- "Up and coming" authors showing promise

**For each noteworthy author:**

### [Author Name] - [Affiliation if known]

- **Why notable:** [Rising star? Productive? Interesting research trajectory?]
- **Research areas:** [What topics do they work on?]
- **Today's contributions:** [Which paper(s) from today, if any]
- **Publication velocity:** [Data from graph if available - e.g., "5 papers in last 30 days"]

[If no standout authors: Include 2-3 authors from featured papers with interesting backgrounds]

---

## 🌟 Top Papers Today

### 1. [Paper Title] ⭐⭐⭐⭐⭐

**Authors:** [List authors, BOLD noteworthy ones from section above]
**Categories:** [cs.LG, cs.AI, etc.]

**Why this matters:** [Curation reasoning - leverage graph insights! E.g., "Lead author is a rising star with 3x publication acceleration" or "Addresses trending computer vision area"]

**Key Innovation:** [Core technical contribution in 1-2 sentences]

**Potential Impact:** [Real-world applications or implications]

📄 [arXiv](arxiv_url) | 📥 [PDF](pdf_url)

---

[Repeat for 5-10 papers, decreasing star ratings (5 stars → 3-4 stars)]

---

## 📊 Report Metadata

- **Total papers reviewed:** [count from JSON]
- **Papers featured:** [count]
- **Notable authors highlighted:** [count]
- **Cross-institutional collaborations:** [count]
- **Most active area:** [single category name if notably unusual, otherwise "Broadly distributed"]

---

## Sources

All papers from arXiv.org - https://arxiv.org
Graph insights powered by Neo4j research database
```

**JSON OUTPUT STRUCTURE for {output_json_path}:**

```json
{{
  "date": "{date_str}",
  "total_papers": TOTAL_COUNT,
  "featured_count": FEATURED_COUNT,
  "featured_papers": [
    {{
      "arxiv_id": "2501.12345v1",
      "title": "Paper Title",
      "featured_rank": 1,
      "curation_reason": "Why you selected it (mention graph insights if relevant)",
      "star_rating": 5
    }},
    ...
  ],
  "notable_authors": [
    {{
      "name": "Author Name",
      "paper_count_today": 2,
      "featured_papers": ["arxiv_id1", "arxiv_id2"],
      "notability_reason": "Rising star / Productive researcher / etc."
    }}
  ]
}}
```

**CRITICAL REQUIREMENTS:**

- Use Write tool to save BOTH files (markdown and JSON)
- Make the "Noteworthy Researchers" section DATA-DRIVEN and INTERESTING
- Leverage graph context (trending topics, rising stars, productive authors) in curation decisions
- Be selective - not every paper is groundbreaking
- Star ratings should reflect genuine quality (don't give everything 5 stars)
- Provide specific, insightful curation reasoning - not just abstract summaries

**The goal**: Produce a report that showcases the POWER of our graph database - highlighting authors and trends that a simple scraper could never identify!
"""


async def run_agent_with_graph_context(
    input_json_path: Path,
    output_md_path: Path,
    output_json_path: Path,
    report_date: date,
    neo4j_driver
):
    """Run Claude Agent SDK with graph insights pre-loaded."""

    if not input_json_path.exists():
        raise FileNotFoundError(f"Papers JSON not found: {input_json_path}")

    # 1. Query graph for rich context
    print("Querying Neo4j for graph insights...", file=sys.stderr)
    context = build_graph_context(neo4j_driver, report_date)

    graph_context_text = format_graph_context(context)

    print(f"Graph context prepared:", file=sys.stderr)
    print(f"  - Trending topics: {len(context['trending_topics'])}", file=sys.stderr)
    print(f"  - Productive authors: {len(context['productive_authors'])}", file=sys.stderr)
    print(f"  - Rising stars: {len(context['rising_stars'])}", file=sys.stderr)
    print(f"  - Collaborations: {len(context['collaborations'])}", file=sys.stderr)

    # 2. Build prompt with graph insights
    date_str = report_date.isoformat()
    prompt = CURATION_PROMPT_TEMPLATE.format(
        date_str=date_str,
        input_json_path=str(input_json_path.absolute()),
        output_md_path=str(output_md_path.absolute()),
        output_json_path=str(output_json_path.absolute()),
        graph_context=graph_context_text,
    )

    # 3. Configure Claude Agent SDK
    # Give agent access to Read, Write, and optionally Neo4j MCP tools
    options = ClaudeAgentOptions(
        permission_mode="acceptEdits",  # Works in non-interactive mode with Read/Write tools
        allowed_tools=["Read", "Write"],  # Neo4j context already provided in prompt
        cwd=str(output_md_path.parent),
    )

    print("Starting Claude Agent SDK curation...", file=sys.stderr)

    # 4. Run agent - it will generate the report
    # Note: query() requires keyword-only arguments (signature starts with *)
    async for _message in query(prompt=prompt, options=options):
        # No-op: streaming updates aren't needed in production logs
        continue

    # 5. Wait for agent to finish writing files
    # Claude Agent SDK may return before files are fully written
    print("Waiting for agent to complete file writes...", file=sys.stderr)

    max_wait = 60  # seconds
    start_time = time.time()

    while time.time() - start_time < max_wait:
        if output_md_path.exists() and output_json_path.exists():
            # Verify files have reasonable content
            md_size = output_md_path.stat().st_size
            json_size = output_json_path.stat().st_size

            # Markdown should have at least 1KB (basic report structure)
            # JSON should have at least 100 bytes (basic metadata)
            if md_size > 1000 and json_size > 100:
                print(f"Files verified: markdown={md_size} bytes, json={json_size} bytes", file=sys.stderr)
                print("Agent curation complete!", file=sys.stderr)
                return

        await asyncio.sleep(1)

    # Timeout - files not ready
    raise TimeoutError(
        f"Agent did not complete writing files within {max_wait} seconds. "
        f"MD exists: {output_md_path.exists()}, JSON exists: {output_json_path.exists()}"
    )


def main():
    parser = argparse.ArgumentParser(
        description="AI-Powered arXiv curation with graph insights"
    )
    parser.add_argument("--date", type=str, help="Date to curate (YYYY-MM-DD), default: yesterday")
    parser.add_argument("--output-dir", type=str, required=True, help="Output directory for reports")
    parser.add_argument(
        "--input-json",
        type=str,
        help="Path to the papers JSON generated in Stage 1 (required for agent context)"
    )

    args = parser.parse_args()

    # Validate environment
    if not all([NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD]):
        print(json.dumps({
            "status": "error",
            "error": "Missing Neo4j environment variables"
        }))
        sys.exit(1)

    # Determine target date
    if args.date:
        target_date = date.fromisoformat(args.date)
    else:
        target_date = date.today() - timedelta(days=1)

    date_str = target_date.isoformat()

    # Prepare file paths
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    output_markdown = output_dir / f"arxiv-graph-{date_str}.md"
    output_json = output_dir / f"arxiv-graph-{date_str}.json"

    if args.input_json:
        input_json = Path(args.input_json).expanduser().resolve()
    else:
        input_json = output_dir / f"arxiv_papers_{date_str}.json"

    if not input_json.exists():
        print(json.dumps({
            'status': 'error',
            'error': f"Papers JSON file not found: {input_json}"
        }))
        sys.exit(1)

    # Connect to Neo4j
    driver = GraphDatabase.driver(
        NEO4J_URI,
        auth=(NEO4J_USERNAME, NEO4J_PASSWORD)
    )

    try:
        # Run async agent
        asyncio.run(run_agent_with_graph_context(
            input_json,
            output_markdown,
            output_json,
            target_date,
            driver
        ))

        # Output success JSON for TypeScript to parse
        result = {
            'status': 'success',
            'date': date_str,
            'output_markdown': str(output_markdown),
            'output_json': str(output_json),
        }

        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({
            'status': 'error',
            'error': str(e)
        }))
        sys.exit(1)
    finally:
        driver.close()


if __name__ == "__main__":
    main()
