"""
Stage 1: The Guillotine

Fast screening to kill 85% of papers based on title + abstract.
Uses Claude Haiku for cost efficiency.
"""

import asyncio
import json
import re
from pathlib import Path
from typing import List, Dict, Any
import sys

# Add parent for config import
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config

import anthropic


# Load prompt template
PROMPT_PATH = Path(__file__).parent.parent.parent / "prompts" / "screening" / "stage1_guillotine.md"


async def screen(papers: List[Dict[str, Any]], screening_config: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Run Stage 1 screening on all papers.

    Args:
        papers: List of paper dicts with title and abstract
        screening_config: Optional configuration dict

    Returns:
        List of papers that passed screening
    """
    model = config.SCREENING_MODEL_STAGE1

    # Load screening prompt
    with open(PROMPT_PATH) as f:
        system_prompt = f.read()

    if config.VERBOSE:
        print(f"[stage1] Screening {len(papers)} papers using {model}")

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    survivors = []

    # Process in batches for efficiency
    batch_size = 10
    for i in range(0, len(papers), batch_size):
        batch = papers[i:i + batch_size]

        # Build batch prompt
        papers_text = "\n\n---\n\n".join([
            f"Paper ID: {p.get('id', p.get('source_id', 'unknown'))}\nTitle: {p['title']}\nAbstract: {p.get('abstract', 'N/A')[:1500]}"
            for p in batch
        ])

        try:
            response = client.messages.create(
                model=model,
                max_tokens=3000,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": f"Screen these {len(batch)} papers and return a JSON object for each:\n\n{papers_text}"
                }]
            )

            # Parse results
            results = parse_screening_results(response.content[0].text)

            for paper in batch:
                paper_id = paper.get('id', paper.get('source_id', ''))
                result = results.get(paper_id)

                if result and result.get('verdict', '').upper() == 'PASS':
                    paper['stage1_passed'] = True
                    paper['stage1_tags'] = result.get('tags', [])
                    paper['stage1_reason'] = result.get('reason', '')
                    survivors.append(paper)
                else:
                    paper['stage1_passed'] = False
                    if result:
                        paper['stage1_reason'] = result.get('reason', 'KILLED')

        except Exception as e:
            print(f"[stage1] Error processing batch: {e}")
            # On error, pass all papers in batch to avoid losing candidates
            survivors.extend(batch)

        if config.VERBOSE:
            print(f"[stage1] Batch {i//batch_size + 1}: {len([p for p in batch if p.get('stage1_passed')])} passed")

    pass_rate = len(survivors) / len(papers) * 100 if papers else 0
    if config.VERBOSE:
        print(f"[stage1] Complete: {len(survivors)}/{len(papers)} passed ({pass_rate:.1f}%)")

    return survivors


def parse_screening_results(response_text: str) -> Dict[str, Dict[str, Any]]:
    """
    Parse Claude's screening response into structured results.

    Args:
        response_text: Raw response from Claude

    Returns:
        Dict mapping paper_id to screening result
    """
    results = {}

    # Try to find JSON blocks in response (handles nested objects)
    # Look for JSON array first
    array_match = re.search(r'\[[\s\S]*\]', response_text)
    if array_match:
        try:
            items = json.loads(array_match.group(0))
            for item in items:
                if 'paper_id' in item:
                    results[item['paper_id']] = item
            return results
        except json.JSONDecodeError:
            pass

    # Try to find individual JSON objects
    # Match JSON objects with nested arrays (for tags)
    json_pattern = r'\{[^{}]*(?:"tags"\s*:\s*\[[^\]]*\])?[^{}]*\}'
    json_blocks = re.findall(json_pattern, response_text)

    for block in json_blocks:
        try:
            result = json.loads(block)
            if 'paper_id' in result:
                results[result['paper_id']] = result
        except json.JSONDecodeError:
            continue

    # Fallback: try to parse code blocks
    if not results:
        code_blocks = re.findall(r'```(?:json)?\s*([\s\S]*?)\s*```', response_text)
        for block in code_blocks:
            try:
                data = json.loads(block)
                if isinstance(data, list):
                    for item in data:
                        if 'paper_id' in item:
                            results[item['paper_id']] = item
                elif isinstance(data, dict) and 'paper_id' in data:
                    results[data['paper_id']] = data
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
