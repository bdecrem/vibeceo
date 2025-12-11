"""
Stage 2: The Sniff Test

Deeper evaluation of Stage 1 survivors.
Uses Claude Sonnet for more nuanced analysis.
"""

import asyncio
import json
from pathlib import Path
from typing import List, Dict, Any

# TODO: pip install anthropic
# import anthropic


# Load prompt template
PROMPT_PATH = Path(__file__).parent.parent.parent / "prompts/screening/stage2_sniff_test.md"


async def screen(papers: List[Dict[str, Any]], config: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Run Stage 2 screening on Stage 1 survivors.

    Args:
        papers: List of papers that passed Stage 1
        config: Configuration dict

    Returns:
        List of papers that passed Stage 2 with scores
    """
    screening_config = config["screening"]["stage2"]
    model = screening_config["model"]

    # Load screening prompt
    with open(PROMPT_PATH) as f:
        system_prompt = f.read()

    survivors = []

    # TODO: Implement actual Claude API calls
    # client = anthropic.Anthropic()
    #
    # for paper in papers:
    #     # Build paper context
    #     paper_text = f"""
    #     Title: {paper['title']}
    #     Abstract: {paper.get('abstract', 'N/A')}
    #     Stage 1 Tags: {paper.get('stage1_tags', [])}
    #     Source: {paper.get('source', 'unknown')}
    #     """
    #
    #     if paper.get('metadata'):
    #         if 'hn_score' in paper['metadata']:
    #             paper_text += f"\nHN Score: {paper['metadata']['hn_score']}"
    #         if 'reddit_score' in paper['metadata']:
    #             paper_text += f"\nReddit Score: {paper['metadata']['reddit_score']}"
    #
    #     response = client.messages.create(
    #         model="claude-3-5-sonnet-20241022",
    #         max_tokens=1000,
    #         system=system_prompt,
    #         messages=[{
    #             "role": "user",
    #             "content": f"Evaluate this paper:\n\n{paper_text}"
    #         }]
    #     )
    #
    #     result = parse_stage2_result(response.content[0].text)
    #
    #     if result and result['verdict'] == 'PASS':
    #         paper['score'] = result['score']
    #         paper['desperate_user'] = result.get('q2_desperate_user')
    #         paper['obvious_business'] = result.get('q3_obvious_business')
    #         paper['stage2_flags'] = result.get('flags', [])
    #         survivors.append(paper)

    print(f"[stage2] Would evaluate {len(papers)} Stage 1 survivors using {model}")
    print(f"[stage2] Target pass rate: {screening_config['pass_rate_target']*100}%")

    # For now, return all papers with mock scores
    for paper in papers:
        paper['score'] = 75  # Mock score
        paper['desperate_user'] = "TBD"
        paper['obvious_business'] = "TBD"
    return papers


def parse_stage2_result(response_text: str) -> Dict[str, Any]:
    """
    Parse Stage 2 evaluation response.

    Args:
        response_text: Raw response from Claude

    Returns:
        Evaluation result dict
    """
    # Try to find JSON in response
    import re
    json_match = re.search(r'\{[\s\S]*\}', response_text)

    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    return None


def calculate_score(result: Dict[str, Any]) -> int:
    """
    Calculate final score from Stage 2 evaluation.

    Args:
        result: Parsed evaluation result

    Returns:
        Score 0-100
    """
    score = 0

    # Q1: Agent delivery
    q1 = result.get('q1_agent_delivery', '').upper()
    if q1 == 'YES':
        score += 30
    elif q1 == 'MAYBE':
        score += 15

    # Q2: Desperate user
    if result.get('q2_desperate_user'):
        score += 30

    # Q3: Obvious business
    q3_status = result.get('q3_status', '').upper()
    if q3_status == 'VIABLE':
        score += 30
    elif q3_status == 'ANGLE_EXISTS':
        score += 20

    # Modifiers from Stage 1 tags
    tags = result.get('stage1_tags', [])
    score += len(tags) * 5

    return min(score, 100)
