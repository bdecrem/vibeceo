"""
Script generation for podcast episodes.

Generates two-voice scripts with Venture and Scrappy takes.
"""

import asyncio
from pathlib import Path
from typing import List, Dict, Any
import sys

# Add parent for config import
sys.path.insert(0, str(Path(__file__).parent.parent.parent))
import config

import anthropic


# Load prompts
PROMPTS_DIR = Path(__file__).parent.parent.parent / "prompts"


async def generate(
    papers: List[Dict[str, Any]],
    date: str,
    generation_config: Dict[str, Any] = None
) -> str:
    """
    Generate full episode script from selected papers.

    Args:
        papers: List of 4 selected papers with analysis
        date: Episode date (YYYY-MM-DD)
        generation_config: Optional configuration dict (uses config.py defaults if not provided)

    Returns:
        Full episode script with voice markers
    """
    model = config.SCRIPT_MODEL
    if generation_config and "generation" in generation_config:
        model = generation_config["generation"].get("script_model", model)

    # Load all prompts
    with open(PROMPTS_DIR / "script_generation" / "episode_template.md") as f:
        template_prompt = f.read()

    with open(PROMPTS_DIR / "personas" / "intro_voice.md") as f:
        intro_prompt = f.read()

    with open(PROMPTS_DIR / "personas" / "venture_take.md") as f:
        venture_prompt = f.read()

    with open(PROMPTS_DIR / "personas" / "scrappy_take.md") as f:
        scrappy_prompt = f.read()

    # Build system prompt
    system_prompt = f"""You are generating a podcast episode script for Tokenshots - a daily show about AI/ML research with an entrepreneurial lens.

{template_prompt}

## Voice Personas

### Intro/Outro Voice
{intro_prompt}

### Venture Take Voice
{venture_prompt}

### Scrappy Take Voice
{scrappy_prompt}
"""

    # Build papers context
    papers_context = f"Episode Date: {date}\n\n"
    for i, paper in enumerate(papers, 1):
        papers_context += f"""
## Paper {i}: {paper['title']}

**Abstract:** {paper.get('abstract', 'N/A')}

**Score:** {paper.get('score', paper.get('stage2_score', 'N/A'))}
**Desperate User:** {paper.get('desperate_user', 'TBD')}
**Obvious Business:** {paper.get('obvious_business', 'TBD')}
**Tags:** {paper.get('stage1_tags', [])}

---
"""

    if config.VERBOSE:
        print(f"[script] Generating episode script using {model}")
        print(f"[script] Papers: {[p['title'][:50] for p in papers]}")

    # Call Claude API
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=model,
        max_tokens=8000,
        system=system_prompt,
        messages=[{
            "role": "user",
            "content": f"Generate the full episode script for these papers:\n\n{papers_context}"
        }]
    )

    script = response.content[0].text

    if config.VERBOSE:
        print(f"[script] Generated {len(script)} characters")

    return script


def generate_placeholder_script(papers: List[Dict[str, Any]], date: str) -> str:
    """Generate a placeholder script for testing."""
    script = f"""=== INTRO ===

[INTRO_VOICE]
{date} - Episode placeholder.

Today we've got four research highlights for you:

1. {papers[0]['title'][:60]}...
2. {papers[1]['title'][:60]}...
3. {papers[2]['title'][:60]}...
4. {papers[3]['title'][:60]}...

As always, two takes on each - the billion dollar platform play and the thing you could build this weekend.

Let's get into it.
[/INTRO_VOICE]

"""

    for i, paper in enumerate(papers, 1):
        script += f"""
=== ITEM {i}: {paper['title'][:50]} ===

[INTRO_VOICE]
Item {i} - {paper['title']}.
[/INTRO_VOICE]

[VENTURE]
This is where the venture take would go. We'd discuss the platform opportunity, the category this could create, and who might raise $50M to build it.

The key question: what market does this unlock?
[/VENTURE]

[SCRAPPY]
And here's the scrappy take. What can you build this weekend with a $1K budget?

The customer is someone specific - not "businesses" but a real person with a real problem.
[/SCRAPPY]

"""

    script += """
=== OUTRO ===

[INTRO_VOICE]
That's the four for today.

If you're building something based on what we covered, we want to hear about it.

Subscribe wherever you get podcasts. See you tomorrow.
[/INTRO_VOICE]
"""

    return script


async def regenerate_segment(
    paper: Dict[str, Any],
    segment_type: str,
    feedback: str,
    generation_config: Dict[str, Any] = None
) -> str:
    """
    Regenerate a specific segment with feedback.

    Args:
        paper: Paper dict
        segment_type: "venture" or "scrappy"
        feedback: Human feedback for improvement
        generation_config: Optional configuration dict

    Returns:
        Regenerated segment text
    """
    model = config.SCRIPT_MODEL

    # Load the appropriate persona
    persona_file = "venture_take.md" if segment_type == "venture" else "scrappy_take.md"
    with open(PROMPTS_DIR / "personas" / persona_file) as f:
        persona_prompt = f.read()

    system_prompt = f"""You are regenerating a single segment for a podcast episode.

{persona_prompt}

Generate ONLY the segment content (no voice markers). Keep it to ~120 words, spoken naturally.
"""

    user_prompt = f"""Paper: {paper['title']}

Abstract: {paper.get('abstract', 'N/A')}

Desperate User: {paper.get('desperate_user', 'TBD')}
Obvious Business: {paper.get('obvious_business', 'TBD')}

Feedback on previous version: {feedback}

Generate an improved {segment_type} take incorporating this feedback."""

    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    response = client.messages.create(
        model=model,
        max_tokens=500,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}]
    )

    return response.content[0].text
