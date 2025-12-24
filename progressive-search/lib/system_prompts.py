#!/usr/bin/env python3
"""
System Prompts Loader for Progressive Search System

Loads two-layer prompt architecture:
1. Base prompts (shared across all categories)
2. Category-specific prompts (fine-tuning for each use case)

Final prompt = base_prompt + category_prompt
"""

import os
from pathlib import Path
from typing import Optional

# Get the prompts directory path
PROMPTS_DIR = Path(__file__).parent.parent / 'prompts'


def load_prompt_file(filename: str) -> str:
    """
    Load a prompt file from the prompts directory.

    Args:
        filename: Name of the prompt file (relative to prompts/)

    Returns:
        Contents of the prompt file

    Raises:
        FileNotFoundError: If the prompt file doesn't exist
    """
    filepath = PROMPTS_DIR / filename

    if not filepath.exists():
        raise FileNotFoundError(f"Prompt file not found: {filepath}")

    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read().strip()


def load_step_prompt(step: int, category: str = 'general') -> str:
    """
    Load the complete prompt for a step (base + category-specific).

    Args:
        step: Step number (1, 2, or 3)
        category: Category type (leadgen, recruiting, job_search, pet_adoption, general)

    Returns:
        Complete system prompt (base + category)

    Raises:
        FileNotFoundError: If prompt files don't exist
        ValueError: If step is invalid
    """
    if step not in [1, 2, 3]:
        raise ValueError(f"Invalid step: {step}. Must be 1, 2, or 3.")

    # Load base prompt
    base_filename = f'base_step{step}.txt'
    base_prompt = load_prompt_file(base_filename)

    # Load category-specific prompt
    category_filename = f'step{step}/{category}.txt'

    try:
        category_prompt = load_prompt_file(category_filename)
    except FileNotFoundError:
        # Fall back to general if category doesn't exist
        if category != 'general':
            print(f"Warning: Category '{category}' not found for step {step}, using 'general'")
            category_filename = f'step{step}/general.txt'
            category_prompt = load_prompt_file(category_filename)
        else:
            raise

    # Combine base + category
    combined_prompt = f"{base_prompt}\n\n---\n\n{category_prompt}"

    return combined_prompt


def get_available_categories() -> list:
    """
    Get list of available categories by scanning step1 directory.

    Returns:
        List of category names (without .txt extension)
    """
    step1_dir = PROMPTS_DIR / 'step1'

    if not step1_dir.exists():
        return []

    categories = []
    for filepath in step1_dir.glob('*.txt'):
        categories.append(filepath.stem)

    return sorted(categories)


# ============================================================================
# Example usage
# ============================================================================

if __name__ == '__main__':
    """
    Test the prompt loader.

    Usage: python -m lib.system_prompts
    """
    print("Testing prompt loader...")
    print()

    # Test loading step 1 prompts
    try:
        prompt = load_step_prompt(step=1, category='general')
        print("✓ Loaded Step 1 (general) prompt:")
        print(f"  Length: {len(prompt)} characters")
        print(f"  Preview: {prompt[:100]}...")
        print()
    except FileNotFoundError as e:
        print(f"✗ Error loading Step 1 prompt: {e}")
        print()

    # List available categories
    categories = get_available_categories()
    if categories:
        print(f"✓ Available categories: {', '.join(categories)}")
    else:
        print("✗ No categories found (step1/ directory may be empty)")
