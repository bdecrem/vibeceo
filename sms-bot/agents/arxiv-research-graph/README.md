# arXiv Research Graph Agent

**Daily arXiv AI research briefings backed by a Neo4j knowledge graph**

## Overview

This variant of the arXiv agent keeps the existing Claude-based curation loop,
but swaps the relational storage layer for a Neo4j Aura graph. Every run:

1. Fetches 24 hours of cs.AI / cs.LG / cs.CV / cs.CL / stat.ML papers.
2. Loads Paper, Author, and Category nodes (plus AUTHORED / IN_CATEGORY edges) into Neo4j.
3. Runs the Claude curation agent to pick the top papers and write the report.
4. Marks featured papers in the graph, recomputes author notability scores, and stores a Report node with metadata + FEATURED_IN edges.
5. Uploads the markdown report to Supabase Storage and records the viewer/podcast links in Neo4j.

Trigger it from SMS with `ARXIV-GRAPH` or `ARXIV-GRAPH RUN`, or call
`runAndStoreArxivGraphReport()` directly from code/tests.

## Architecture

### Stage 1 – Fetch & Load

1. `agents/arxiv-research/fetch_papers.py` pulls the last 24h of submissions (respecting the 3 s rate limit).
2. The TypeScript orchestrator writes a deduped JSON bundle for the target date.
3. The orchestrator enriches each paper with live Neo4j author stats (notability score, paper count, featured streak, first/last seen) so Claude has reputation context before ranking breakthroughs.
4. `agents/arxiv-research-graph/load_recent_papers.py --input-json` ingests the enriched bundle into Neo4j using batched Cypher merges.

### Stage 2 – Curate & Persist

1. `agents/arxiv-research/agent.py` (Claude Agent SDK) generates the markdown report and featured paper metadata, using the enriched author signals already embedded in the JSON.
2. `graph-dao.ts` updates Neo4j:
   - `Paper` nodes get `featured_in_report`, `featured_rank`, `curation_reason`, `featured_date`, `star_rating`, and refreshed `author_notability_score`.
   - `Author` nodes recalc `paper_count`, `featured_paper_count`, and `notability_score` using the existing formula.
   - A `Report` node (unique per date) stores summary, file paths, public URLs, podcast metadata, and `FEATURED_IN` edges to highlighted papers.
3. Supabase Storage still hosts the markdown asset; the graph stores the path + viewer link.

## Graph Schema Snapshot

| Node        | Key Properties                                                                              |
|-------------|----------------------------------------------------------------------------------------------|
| `Paper`     | `arxiv_id`, `title`, `abstract`, `categories`, `primary_category`, `published_date`, `arxiv_url`, `pdf_url`, `author_notability_score`, `featured_in_report`, `featured_rank`, `curation_reason`, `featured_date`, `star_rating`, `created_at`, `last_ingested_at` |
| `Author`    | `name`, `affiliation`, `first_seen`, `last_seen`, `paper_count`, `featured_paper_count`, `notability_score`, optional profile/enrichment fields (`github_username`, `h_index`, etc.) |
| `Category`  | `name`                                                                                       |
| `Report`    | `report_date`, `summary`, `total_papers`, `featured_count`, `notable_authors_count`, `report_path`, `report_url`, `viewer_url`, `report_short_link`, `metadata_path`, `created_at`, `duration_seconds`, podcast metadata |

Relationships:

- `(:Author)-[:AUTHORED {position}]->(:Paper)`
- `(:Paper)-[:IN_CATEGORY]->(:Category)`
- `(:Report)-[:FEATURED_IN {rank, curation_reason, star_rating}]->(:Paper)`

## Author Notability Formula

Same weighting as the relational agent:

```
score = (paper_count × 5)
      + (featured_paper_count × 50)
      + ⌊github_stars ÷ 10⌋
      + (h_index × 10)
      + profile_bonuses
```

Bonuses: GitHub profile (+20), HuggingFace profile (+20), Google Scholar (+30).
Scores are recomputed for every author with a paper on the target date.

## Setup

1. **Install Python deps**
   ```bash
   pip install -r sms-bot/agents/arxiv-research/requirements.txt
   pip install -r sms-bot/agents/arxiv-research-graph/requirements.txt
   ```
2. **Apply Neo4j schema**
   ```bash
   cat sms-bot/agents/arxiv-research-graph/setup_neo4j_schema.cypher | cypher-shell -a "$NEO4J_URI" -u "$NEO4J_USERNAME" -p "$NEO4J_PASSWORD"
   ```
3. **Set environment variables**
   ```
   NEO4J_URI=neo4j+s://...          # see neo4j.txt for Aura details
   NEO4J_USERNAME=...
   NEO4J_PASSWORD=...
   NEO4J_DATABASE=neo4j             # optional, defaults to neo4j
   AGENT_REPORTS_BUCKET=agent-reports
   ```
4. **(Optional) Backfill history**
   ```bash
   python3 agents/arxiv-research-graph/backfill_papers.py --start-date 2025-10-23 --lookback-days 182
   ```

## Running the Pipeline

- **Programmatically**: `await runAndStoreArxivGraphReport()` from `agents/arxiv-research-graph/index.ts`.
- **SMS commands**:
  - `ARXIV-GRAPH` – latest graph-backed report.
  - `ARXIV-GRAPH RUN` – force a regeneration (admin only).
  - `ARXIV-GRAPH SUBSCRIBE` / `UNSUBSCRIBE` – manage the dedicated subscriber list.
- **Ingest utility**: reuse the loader directly with `python3 agents/arxiv-research-graph/load_recent_papers.py --input-json path/to/papers.json`.

After the run, check the graph with `node sms-bot/scripts/neo4j-query.cjs` to inspect counts, featured relationships, or specific authors.
