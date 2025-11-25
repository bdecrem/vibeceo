#!/usr/bin/env python3
"""
Research Planner Agent - Generate comprehensive study plans from research ideas

Uses claude-agent-sdk to generate structured study plans including methodology,
sample size calculations, data collection procedures, analysis plans, timelines,
and ethical considerations.
"""

import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

from claude_agent_sdk import ClaudeAgentOptions, query

PROMPT_TEMPLATE = """
You are a research methodology expert. A user has submitted a research idea.

**RESEARCH IDEA:** {research_question}

Your task is to generate a comprehensive study plan that includes:

1. **Research Question Refinement**
   - Refine and clarify the research question
   - Identify key variables and concepts
   - Define scope and boundaries

2. **Study Design**
   - Determine appropriate design (experimental/observational/mixed methods)
   - Justify the design choice
   - Describe the overall approach

3. **Methodology**
   - Detailed methodology section
   - Participant selection criteria
   - Inclusion/exclusion criteria
   - Data collection methods

4. **Sample Size and Power Analysis**
   - Calculate required sample size
   - Justify with power analysis
   - Consider effect sizes and statistical power

5. **Data Collection Procedures**
   - Step-by-step data collection plan
   - Instruments/tools needed
   - Timeline for data collection
   - Quality control measures

6. **Analysis Plan**
   - Statistical methods to be used
   - Software/tools needed
   - Approach to data analysis
   - Handling of missing data

7. **Timeline with Milestones**
   - Realistic timeline broken into phases
   - Key milestones and deliverables
   - Dependencies between tasks

8. **Resource Requirements**
   - Personnel needed
   - Equipment/materials
   - Budget considerations
   - Facilities/space requirements

9. **Ethical Considerations**
   - IRB/ethics approval requirements
   - Informed consent procedures
   - Data privacy and confidentiality
   - Risk assessment

10. **Potential Limitations**
    - Acknowledge study limitations
    - Threats to validity
    - Generalizability concerns

Format your response as clear, structured markdown. Keep sections concise but comprehensive. Use bullet points and clear headings.

**CRITICAL INSTRUCTIONS:**
1. Generate a brief SMS summary (under 400 characters) that includes:
   - The refined research question
   - Key methodology (1-2 sentences)
   - Estimated timeline (if applicable)
   - Most critical next steps

2. Write the FULL comprehensive study plan to: {output_path}
   - Include the SMS summary as the FIRST LINE in this exact format: "<!-- SMS_SUMMARY: [your brief summary here] -->"
   - Then include the full detailed study plan below

The full plan will be saved to a file and shared via link. The SMS summary will be extracted and sent directly to the user.
"""


def build_prompt(research_question: str, output_path: Path) -> str:
    return PROMPT_TEMPLATE.format(
        research_question=research_question,
        output_path=str(output_path),
    )


async def run_agent(
    research_question: str,
    output_path: Path,
    verbose: bool,
) -> None:
    options = ClaudeAgentOptions(
        permission_mode='acceptEdits',
        allowed_tools=['Read', 'Write', 'WebSearch', 'WebFetch'],
        cwd=str(output_path.parent),
    )

    prompt = build_prompt(research_question, output_path)

    async for message in query(prompt=prompt, options=options):
        if not verbose:
            continue

        # Emit minimal progress logs
        if hasattr(message, 'type'):
            print(f"agent_message:{message.type}", file=sys.stderr)


def ensure_directory(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Run the research planner agent.')
    parser.add_argument('--research-question', required=True, help='Research question or idea')
    parser.add_argument('--output-dir', required=True, help='Directory to store results')
    parser.add_argument('--verbose', action='store_true', help='Emit progress logs')
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    output_dir = Path(args.output_dir).expanduser().resolve()
    ensure_directory(output_dir)

    # Use timestamp for unique filename
    import time
    timestamp = int(time.time())
    output_path = output_dir / f"study_plan_{timestamp}.md"

    try:
        asyncio.run(
            run_agent(
                research_question=args.research_question,
                output_path=output_path,
                verbose=args.verbose,
            )
        )
    except Exception as exc:  # noqa: BLE001
        print(json.dumps({'status': 'error', 'error': str(exc)}), file=sys.stderr)
        return 1

    if not output_path.exists():
        print(json.dumps({'status': 'error', 'error': 'plan_not_created'}), file=sys.stderr)
        return 2

    # Read the markdown file
    result_text = output_path.read_text()

    # Extract SMS summary from HTML comment at the beginning of the file
    summary = None
    lines = result_text.split('\n')
    
    # Look for <!-- SMS_SUMMARY: ... --> in the first few lines
    for i, line in enumerate(lines[:5]):  # Check first 5 lines
        match = re.search(r'<!--\s*SMS_SUMMARY:\s*(.+?)\s*-->', line)
        if match:
            summary = match.group(1).strip()
            # Remove the summary line from the markdown
            lines.pop(i)
            result_text = '\n'.join(lines)
            # Update the file without the summary line
            output_path.write_text(result_text)
            break

    # If no summary found, generate a default one from the first few lines
    if not summary:
        # Take first 300 chars and clean it up
        preview = result_text[:300].replace('\n', ' ').strip()
        if len(preview) > 200:
            preview = preview[:200] + '...'
        summary = preview

    result_payload = {
        'status': 'success',
        'result': result_text,
        'summary': summary,
        'output_file': str(output_path),
    }

    print(json.dumps(result_payload))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

