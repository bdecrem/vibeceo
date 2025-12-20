#!/usr/bin/env python3
"""
Generator Engine Comparison
Tests 4 different approaches to generating quirky artsy ideas.

Usage: python generator-test.py
"""

import anthropic
import random

client = anthropic.Anthropic()

# ============================================================
# HUMAN INPUT - Edit these before running
# ============================================================

# For Approach 3: Your weird constraint
CONSTRAINT = "an account that only posts about things that almost happened"

# For Approach 5: Your one-line seed idea
SEED = "reviews of places that don't exist"

# ============================================================


def approach_1_pure_prompt():
    """Pure Claude prompt - just ask for weird ideas"""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": "Generate one quirky, artsy, weird idea for a Twitter account. Something strange and delightful that would make people stop scrolling. Be specific and surprising. Just give me the idea, no preamble."
        }]
    )
    return response.content[0].text


def approach_2_collision():
    """Collision engine - combine random unrelated things"""
    things = [
        "medieval manuscripts", "vending machines", "whale songs",
        "tax forms", "lullabies", "parking lots", "astronaut training",
        "bread recipes", "divorce lawyers", "bird migration patterns",
        "subway announcements", "Victorian mourning rituals",
        "IKEA instructions", "voicemails from grandma", "eclipse chasers"
    ]
    moods = ["melancholy", "manic joy", "quiet dread", "absurd hope", "tender confusion"]

    thing1 = random.choice(things)
    thing2 = random.choice([t for t in things if t != thing1])
    mood = random.choice(moods)

    prompt = f"""Collide these unrelated elements into ONE quirky artsy Twitter account idea:

- {thing1}
- {thing2}
- Mood: {mood}

Synthesize into something strange and delightful. Be specific. Just the idea, no preamble."""

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}]
    )
    return f"[Inputs: {thing1} × {thing2} × {mood}]\n\n{response.content[0].text}"


def approach_3_constraint(constraint: str):
    """Constraint template - human provides the weird constraint"""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"""Generate a quirky artsy Twitter account idea based on this constraint:

"{constraint}"

Be specific, strange, and delightful. Just the idea, no preamble."""
        }]
    )
    return response.content[0].text


def approach_5_expansion(seed: str):
    """Human seed, AI expansion - human gives one-liner, AI expands"""
    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=500,
        messages=[{
            "role": "user",
            "content": f"""Expand this one-line idea into a full Twitter account concept:

"{seed}"

Include: what posts would look like, the voice/tone, why it's interesting. Be specific."""
        }]
    )
    return response.content[0].text


if __name__ == "__main__":
    print("=" * 60)
    print("GENERATOR ENGINE COMPARISON")
    print("=" * 60)

    print("\n" + "─" * 60)
    print("APPROACH 1: Pure Claude Prompt")
    print("(Just ask Claude to be weird)")
    print("─" * 60 + "\n")
    print(approach_1_pure_prompt())

    print("\n" + "─" * 60)
    print("APPROACH 2: Collision Engine")
    print("(Smash random things together)")
    print("─" * 60 + "\n")
    print(approach_2_collision())

    print("\n" + "─" * 60)
    print("APPROACH 3: Constraint Template")
    print(f"(Your constraint: \"{CONSTRAINT}\")")
    print("─" * 60 + "\n")
    print(approach_3_constraint(CONSTRAINT))

    print("\n" + "─" * 60)
    print("APPROACH 5: Human Seed Expansion")
    print(f"(Your seed: \"{SEED}\")")
    print("─" * 60 + "\n")
    print(approach_5_expansion(SEED))

    print("\n" + "=" * 60)
    print("DONE")
    print("=" * 60)
