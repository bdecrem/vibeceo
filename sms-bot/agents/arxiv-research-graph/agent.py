#!/usr/bin/env python3
"""
Stage 2: Curate top papers and generate daily report

This script uses Claude Agent SDK to analyze all papers fetched in Stage 1,
select the top 5-10 most significant papers, and generate a curated markdown report.

Input: JSON file from fetch_papers.py
Output: Markdown report + JSON with featured paper IDs
"""

import argparse
import asyncio
import json
from datetime import datetime
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query


CURATION_PROMPT_TEMPLATE = """
You are an AI research analyst tasked with curating the most significant AI/ML papers from arXiv.

You have been provided with ALL papers published today across these categories:
- cs.AI (Artificial Intelligence)
- cs.LG (Machine Learning)
- cs.CV (Computer Vision)
- cs.CL (Computation and Language/NLP)
- stat.ML (Statistics - Machine Learning)

**YOUR TASK:**

1. Read the JSON file at: {input_json_path}

2. Analyze each paper against these curation criteria:
   - **Novelty (30%)**: Is this a new technique/approach or incremental improvement?
   - **Impact Potential (25%)**: Does it have practical applications? Broad applicability?
   - **Author Notability (20%)**: Consider the author_data provided (if available)
   - **Research Quality (15%)**: Rigor, experimental design, results quality
   - **Timeliness (10%)**: Does it address current hot topics or challenges?

3. Select the TOP 5-10 most significant papers. Aim for 7 papers if possible.

4. For each selected paper, write a brief explanation of WHY it was selected.

5. Generate a curated markdown report using the structure below.

6. Use the Write tool to save TWO files:
   a) The markdown report to: {output_md_path}
   b) A JSON file with featured paper metadata to: {output_json_path}

**MARKDOWN REPORT STRUCTURE:**

```markdown
# AI Research Papers - Daily Curated Brief
**Date:** {date_str}
**Curated:** [N] papers from [TOTAL] total submissions

---

## Executive Summary

[Write 2-3 sentences summarizing the key themes, breakthroughs, or trends across today's featured papers]

---

## 🌟 Top Papers Today

### 1. [Paper Title] ⭐⭐⭐⭐⭐
**Authors:** [Author1], [Author2], [Author3]
**Categories:** [cs.LG, cs.AI]

**Why this matters:** [Your curation reason - explain novelty, impact, significance in 2-3 sentences]

**Key Innovation:** [1 sentence on the core contribution]

**Potential Impact:** [1 sentence on applications or implications]

📄 [arXiv](arxiv_url) | 📥 [PDF](pdf_url)

---

### 2. [Paper Title] ⭐⭐⭐⭐
[Same structure as above...]

[Continue for all 5-10 papers...]

---

## 👥 Notable Authors Today

[Analyze the authors across all featured papers and highlight:]

**[Author Name]** (if they have multiple papers today or are particularly notable)
- [N] papers published today ([list which ones were featured])
- Research areas: [extracted from categories]
- [Any other notable information you can infer]

[List 2-3 most notable authors if applicable]

---

## 📊 Daily Statistics

- **Total papers submitted:** [TOTAL from JSON]
- **cs.LG (Machine Learning):** [count] papers ([how many featured])
- **cs.CV (Computer Vision):** [count] papers ([how many featured])
- **cs.AI (Artificial Intelligence):** [count] papers ([how many featured])
- **cs.CL (NLP):** [count] papers ([how many featured])
- **stat.ML (Statistics):** [count] papers ([how many featured])

---

## Sources

All papers from arXiv.org - https://arxiv.org
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
      "curation_reason": "Why you selected it (2-3 sentences)",
      "star_rating": 5
    }},
    ...
  ],
  "notable_authors": [
    {{
      "name": "Author Name",
      "paper_count_today": 2,
      "featured_papers": ["arxiv_id1", "arxiv_id2"]
    }}
  ]
}}
```

**CRITICAL REQUIREMENTS:**
- Use the Write tool to save BOTH files (markdown and JSON)
- Base your analysis ONLY on the data in the input JSON file
- Select 5-10 papers (aim for 7 if enough quality papers exist)
- Provide genuine curation reasoning - don't just summarize the abstract
- Be critical and selective - not every paper is groundbreaking
- Calculate accurate statistics from the JSON data
"""


def build_prompt(
    input_json_path: Path,
    output_md_path: Path,
    output_json_path: Path,
    report_date: datetime,
) -> str:
    """Build the curation prompt with file paths."""
    date_str = report_date.strftime("%Y-%m-%d")

    return CURATION_PROMPT_TEMPLATE.format(
        input_json_path=str(input_json_path),
        output_md_path=str(output_md_path),
        output_json_path=str(output_json_path),
        date_str=date_str,
    )


async def run_agent(
    input_json_path: Path,
    output_md_path: Path,
    output_json_path: Path,
    report_date: datetime,
    verbose: bool,
) -> None:
    """Run the Claude agent to curate papers and generate report."""

    # Verify input file exists
    if not input_json_path.exists():
        raise FileNotFoundError(f"Input JSON file not found: {input_json_path}")

    # Configure agent options
    options = ClaudeAgentOptions(
        permission_mode="acceptEdits",
        allowed_tools=["Read", "Write", "WebSearch"],  # Allow web search for author research if needed
        cwd=str(output_md_path.parent),
    )

    prompt = build_prompt(input_json_path, output_md_path, output_json_path, report_date)

    if verbose:
        print("Starting Claude Agent curation process...")
        print(f"Input: {input_json_path}")
        print(f"Output MD: {output_md_path}")
        print(f"Output JSON: {output_json_path}")

    # Run agent
    async for message in query(prompt=prompt, options=options):
        if verbose and hasattr(message, "type"):
            print(f"agent_message:{message.type}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Curate top AI papers and generate report using Claude Agent SDK"
    )
    parser.add_argument(
        "--input-json",
        required=True,
        help="Path to JSON file from fetch_papers.py",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory to save markdown report and metadata JSON",
    )
    parser.add_argument(
        "--date",
        help="Report date in YYYY-MM-DD (defaults to today)",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print progress messages",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    # Parse date
    if args.date:
        try:
            report_date = datetime.strptime(args.date, "%Y-%m-%d")
        except ValueError:
            print(f"Error: Invalid date format '{args.date}'. Use YYYY-MM-DD")
            return 1
    else:
        report_date = datetime.now()

    # Setup paths
    input_json_path = Path(args.input_json).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    date_str = report_date.strftime("%Y-%m-%d")
    output_md_path = output_dir / f"arxiv_report_{date_str}.md"
    output_json_path = output_dir / f"arxiv_curation_{date_str}.json"

    try:
        # Run the agent
        asyncio.run(
            run_agent(
                input_json_path,
                output_md_path,
                output_json_path,
                report_date,
                args.verbose,
            )
        )

        # Verify outputs were created
        if not output_md_path.exists():
            print(json.dumps({"status": "error", "error": "markdown_not_created"}))
            return 2

        if not output_json_path.exists():
            print(json.dumps({"status": "error", "error": "json_not_created"}))
            return 3

        # Read the curation JSON to get featured count
        curation_data = json.loads(output_json_path.read_text())

        # Output success
        result = {
            "status": "success",
            "output_markdown": str(output_md_path),
            "output_json": str(output_json_path),
            "featured_count": curation_data.get("featured_count", 0),
            "date": date_str,
        }

        print(json.dumps(result))
        return 0

    except FileNotFoundError as exc:
        print(json.dumps({"status": "error", "error": str(exc)}))
        return 1
    except Exception as exc:
        print(json.dumps({"status": "error", "error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
