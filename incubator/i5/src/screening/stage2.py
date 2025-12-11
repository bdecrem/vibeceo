"""
Stage 2: The Sniff Test

Deeper evaluation of Stage 1 survivors.
Uses Claude Sonnet for more nuanced analysis.
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
PROMPT_PATH = Path(__file__).parent.parent.parent / "prompts" / "screening" / "stage2_sniff_test.md"


async def screen(papers: List[Dict[str, Any]], screening_config: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    Run Stage 2 screening on Stage 1 survivors.

    Args:
        papers: List of papers that passed Stage 1
        screening_config: Optional configuration dict

    Returns:
        List of papers that passed Stage 2 with scores
    """
    model = config.SCREENING_MODEL_STAGE2

    # Load screening prompt
    with open(PROMPT_PATH) as f:
        system_prompt = f.read()

    if config.VERBOSE:
        print(f"[stage2] Evaluating {len(papers)} Stage 1 survivors using {model}")

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    survivors = []

    for i, paper in enumerate(papers):
        # Build paper context
        paper_text = f"""Title: {paper['title']}

Abstract: {paper.get('abstract', 'N/A')[:2000]}

Stage 1 Tags: {paper.get('stage1_tags', [])}
Stage 1 Reason: {paper.get('stage1_reason', 'N/A')}
Source: {paper.get('source_type', paper.get('source', 'unknown'))}
"""

        metadata = paper.get('metadata', {})
        if metadata:
            if 'hn_score' in metadata:
                paper_text += f"\nHN Score: {metadata['hn_score']} ({metadata.get('hn_comments', 0)} comments)"
            if 'reddit_score' in metadata:
                paper_text += f"\nReddit Score: {metadata['reddit_score']} ({metadata.get('reddit_comments', 0)} comments)"
            if metadata.get('curated'):
                paper_text += "\n[CURATED - Manually selected for review]"

        try:
            response = client.messages.create(
                model=model,
                max_tokens=1000,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": f"Evaluate this paper and return a JSON response:\n\n{paper_text}"
                }]
            )

            result = parse_stage2_result(response.content[0].text)

            if result:
                # Calculate score if not provided
                if 'score' not in result or result['score'] is None:
                    result['score'] = calculate_score(result, paper)

                paper['stage2_passed'] = result.get('verdict', '').upper() == 'PASS'
                paper['stage2_score'] = result.get('score', 0)
                paper['score'] = result.get('score', 0)  # Alias for compatibility
                paper['desperate_user'] = result.get('q2_desperate_user')
                paper['obvious_business'] = result.get('q3_obvious_business')
                paper['stage2_flags'] = result.get('flags', [])
                paper['q1_agent_delivery'] = result.get('q1_agent_delivery')
                paper['q3_status'] = result.get('q3_status')

                if paper['stage2_passed']:
                    survivors.append(paper)

                if config.VERBOSE:
                    status = "PASS" if paper['stage2_passed'] else "KILL"
                    print(f"[stage2] {i+1}/{len(papers)}: {status} (score={paper['stage2_score']}) - {paper['title'][:50]}")
            else:
                # Parse failed, pass paper to avoid losing candidates
                paper['stage2_passed'] = True
                paper['stage2_score'] = 50
                paper['score'] = 50
                survivors.append(paper)
                if config.VERBOSE:
                    print(f"[stage2] {i+1}/{len(papers)}: PASS (parse failed) - {paper['title'][:50]}")

        except Exception as e:
            print(f"[stage2] Error evaluating paper: {e}")
            # On error, pass paper with default score
            paper['stage2_passed'] = True
            paper['stage2_score'] = 50
            paper['score'] = 50
            survivors.append(paper)

    pass_rate = len(survivors) / len(papers) * 100 if papers else 0
    if config.VERBOSE:
        print(f"[stage2] Complete: {len(survivors)}/{len(papers)} passed ({pass_rate:.1f}%)")

    return survivors


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


def calculate_score(result: Dict[str, Any], paper: Dict[str, Any] = None) -> int:
    """
    Calculate final score from Stage 2 evaluation.

    Args:
        result: Parsed evaluation result
        paper: Original paper dict (for stage1_tags)

    Returns:
        Score 0-100
    """
    score = 0

    # Q1: Agent delivery
    q1 = str(result.get('q1_agent_delivery', '')).upper()
    if q1 == 'YES':
        score += 30
    elif q1 == 'MAYBE':
        score += 15

    # Q2: Desperate user (specific profile = points)
    desperate_user = result.get('q2_desperate_user')
    if desperate_user and len(str(desperate_user)) > 20:  # Reasonably specific
        score += 30
    elif desperate_user:
        score += 15

    # Q3: Obvious business
    q3_status = str(result.get('q3_status', '')).upper()
    if q3_status == 'VIABLE':
        score += 30
    elif q3_status == 'ANGLE_EXISTS':
        score += 20

    # Modifiers from Stage 1 tags
    tags = paper.get('stage1_tags', []) if paper else result.get('stage1_tags', [])
    score += min(len(tags) * 5, 15)  # Cap at 15 from tags

    # Source engagement bonus
    if paper and paper.get('metadata'):
        metadata = paper['metadata']
        hn_score = metadata.get('hn_score', 0)
        reddit_score = metadata.get('reddit_score', 0)
        if hn_score > 100 or reddit_score > 500:
            score += 10

    # Curated bonus (manually selected = extra points)
    if paper and paper.get('metadata', {}).get('curated'):
        score += 10

    return min(score, 100)
