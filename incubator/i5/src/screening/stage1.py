"""
Stage 1: The Guillotine

Fast screening to kill 85% of papers based on title + abstract.
Uses Claude Haiku for cost efficiency.
"""

import asyncio
import json
from pathlib import Path
from typing import List, Dict, Any

# TODO: pip install anthropic
# import anthropic


# Load prompt template
PROMPT_PATH = Path(__file__).parent.parent.parent / "prompts/screening/stage1_guillotine.md"


async def screen(papers: List[Dict[str, Any]], config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Run Stage 1 screening on all papers.

    Args:
        papers: List of paper dicts with title and abstract
        config: Configuration dict

    Returns:
        List of papers that passed screening
    """
    screening_config = config["screening"]["stage1"]
    model = screening_config["model"]

    # Load screening prompt
    with open(PROMPT_PATH) as f:
        system_prompt = f.read()

    survivors = []

    # TODO: Implement actual Claude API calls
    # client = anthropic.Anthropic()
    #
    # # Process in batches for efficiency
    # batch_size = 10
    # for i in range(0, len(papers), batch_size):
    #     batch = papers[i:i + batch_size]
    #
    #     # Build batch prompt
    #     papers_text = "\n\n---\n\n".join([
    #         f"Paper ID: {p['id']}\nTitle: {p['title']}\nAbstract: {p.get('abstract', 'N/A')}"
    #         for p in batch
    #     ])
    #
    #     response = client.messages.create(
    #         model="claude-3-haiku-20240307",
    #         max_tokens=2000,
    #         system=system_prompt,
    #         messages=[{
    #             "role": "user",
    #             "content": f"Screen these papers:\n\n{papers_text}"
    #         }]
    #     )
    #
    #     # Parse results
    #     results = parse_screening_results(response.content[0].text)
    #
    #     for paper in batch:
    #         result = results.get(paper['id'])
    #         if result and result['verdict'] == 'PASS':
    #             paper['stage1_tags'] = result.get('tags', [])
    #             paper['stage1_reason'] = result.get('reason', '')
    #             survivors.append(paper)

    print(f"[stage1] Would screen {len(papers)} papers using {model}")
    print(f"[stage1] Target pass rate: {screening_config['pass_rate_target']*100}%")

    # For now, return all papers as placeholder
    return papers


def parse_screening_results(response_text: str) -> Dict[str, Dict[str, Any]]:
    """
    Parse Claude's screening response into structured results.

    Args:
        response_text: Raw response from Claude

    Returns:
        Dict mapping paper_id to screening result
    """
    results = {}

    # Try to find JSON blocks in response
    import re
    json_blocks = re.findall(r'\{[^{}]+\}', response_text)

    for block in json_blocks:
        try:
            result = json.loads(block)
            if 'paper_id' in result:
                results[result['paper_id']] = result
        except json.JSONDecodeError:
            continue

    return results


async def screen_single(paper: Dict[str, Any], config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Screen a single paper (for testing/debugging).

    Args:
        paper: Paper dict with title and abstract
        config: Configuration dict

    Returns:
        Screening result dict
    """
    results = await screen([paper], config)
    return results[0] if results else None
