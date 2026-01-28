#!/usr/bin/env python3
"""
Image generator for Amber's creative projects.
Creates vintage photography and historical imagery.

Usage:
    python amber-machine.py "a 1930s radio on a wooden table"
    python amber-machine.py --style sepia "Golden Gate Bridge under construction"
    python amber-machine.py --style documentary "migrant workers during the Dust Bowl"
"""

import base64
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

# Load OpenAI key from sms-bot/.env.local
env_path = Path(__file__).resolve().parent.parent.parent / "sms-bot" / ".env.local"
load_dotenv(env_path, override=True)

if not os.getenv("OPENAI_API_KEY"):
    raise RuntimeError(f"OPENAI_API_KEY not found in {env_path}")

client = OpenAI()

# =============================================================================
# VINTAGE PHOTOGRAPHY STYLES
# =============================================================================

# Sepia - warm, aged, nostalgic (default)
SEPIA_PROMPT = """{description}

Style — VINTAGE SEPIA PHOTOGRAPHY:
- Authentic 1920s-1940s photograph aesthetic
- Warm sepia tones — browns, creams, aged yellows
- Soft focus with gentle vignetting at edges
- Film grain texture, subtle dust and scratches
- Period-accurate lighting — natural daylight or warm tungsten
- Slightly faded, like a photo stored in a drawer for decades

Technical Quality:
- Medium format camera look (square or 4:3 aspect feel)
- Shallow depth of field on portraits, deeper on landscapes
- Authentic period details — clothing, architecture, vehicles
- No modern elements — nothing post-1940s

Mood:
- Nostalgic and warm
- Documentary but intimate
- Like discovering old family photos
- Time capsule feeling

Do NOT include:
- Modern objects, clothing, or technology
- Digital effects or filters that look artificial
- Text, watermarks, or logos
- Harsh contrast or overly processed look
- Color (this is sepia/monochrome)

Output:
An authentic-looking vintage photograph that could have been taken in the 1930s."""

# Documentary - black and white, journalistic
DOCUMENTARY_PROMPT = """{description}

Style — 1930s DOCUMENTARY PHOTOGRAPHY:
- Black and white, high contrast
- Inspired by Dorothea Lange, Walker Evans, FSA photography
- Sharp detail, journalistic clarity
- Strong compositional framing
- Natural lighting — often harsh midday or dramatic window light
- Gritty, real, unflinching

Technical Quality:
- Large format camera sharpness
- Deep focus — everything in focus
- Strong geometric composition
- Period-accurate subjects and settings
- Authentic Depression-era or pre-war atmosphere

Mood:
- Serious, contemplative
- Human dignity in hard times
- Historical weight
- Truth-telling

Do NOT include:
- Modern elements
- Staged or artificial poses
- Soft or romantic treatment
- Color
- Text or watermarks

Output:
A powerful black-and-white documentary photograph that captures a moment in history."""

# Kodachrome - early color, vivid but period-appropriate
KODACHROME_PROMPT = """{description}

Style — EARLY KODACHROME COLOR:
- 1935-1950s color photography aesthetic
- Rich, saturated but slightly off colors
- Characteristic Kodachrome red-orange bias
- Slightly warm overall tone
- Film grain visible but not overwhelming
- Colors that feel "of their time" — not modern digital

Technical Quality:
- 35mm or medium format look
- Period-accurate color rendering
- Soft highlights, rich shadows
- Natural daylight preferred
- Authentic period details

Mood:
- Nostalgic but vibrant
- "The way we remember the past"
- Warm, optimistic
- Preserved moment in time

Do NOT include:
- Modern objects or settings
- Oversaturated digital colors
- Text or watermarks
- HDR or obviously processed look

Output:
An authentic early color photograph with the warm, rich character of vintage Kodachrome film."""

# Illustration - vintage advertisement/poster style
ILLUSTRATION_PROMPT = """{description}

Style — 1930s VINTAGE ILLUSTRATION:
- Art Deco influenced design
- Clean lines, bold shapes
- Limited color palette — 4-6 colors max
- Flat areas of color with simple shading
- Period typography feel (but no actual text)
- Inspired by WPA posters, travel advertisements, magazine illustrations

Technical Quality:
- Clean vector-like edges
- Screen print or lithograph texture
- Strong silhouettes
- Geometric simplification
- Period-appropriate subject matter

Mood:
- Optimistic, aspirational
- Clean and modern (for the era)
- Advertising confidence
- Art Deco elegance

Do NOT include:
- Photorealistic rendering
- Modern design elements
- Actual text or logos
- Messy or sketchy lines
- Too many colors

Output:
A beautiful vintage illustration that looks like it belongs on a 1930s poster or magazine cover."""

# Available styles
STYLES = {
    "sepia": SEPIA_PROMPT,
    "documentary": DOCUMENTARY_PROMPT,
    "kodachrome": KODACHROME_PROMPT,
    "illustration": ILLUSTRATION_PROMPT,
}


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Generate vintage-style images')
    parser.add_argument('description', nargs='*', help='Image description')
    parser.add_argument('--style', choices=list(STYLES.keys()), default='sepia',
                        help='Art style (default: sepia)')
    args = parser.parse_args()

    # Get description from args or prompt
    if args.description:
        description = " ".join(args.description).strip()
    else:
        description = input("What kind of image? ").strip()

    if not description:
        print("Description cannot be empty.")
        sys.exit(1)

    style_prompt = STYLES[args.style]
    prompt = style_prompt.format(description=description)

    print(f"Creating ({args.style}): {description}")
    print("Generating image...")

    result = client.images.generate(
        model="chatgpt-image-latest",
        prompt=prompt,
        size="1024x1024",
        quality="high",
        n=1,
    )

    image_base64 = result.data[0].b64_json
    image_bytes = base64.b64decode(image_base64)

    # Save to web/public/amber with a slugified name
    slug = description.lower()[:40].replace(" ", "-").replace("'", "")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")

    # Output to amber's public folder
    amber_dir = Path(__file__).resolve().parent.parent.parent / "web" / "public" / "amber"
    amber_dir.mkdir(exist_ok=True)

    out = amber_dir / f"{slug}.png"

    # Handle duplicates
    counter = 1
    while out.exists():
        out = amber_dir / f"{slug}-{counter}.png"
        counter += 1

    out.write_bytes(image_bytes)
    print(f"Saved to {out}")


if __name__ == "__main__":
    main()
