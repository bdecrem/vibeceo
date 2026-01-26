#!/usr/bin/env python3
"""
Character generator for Pixelpit Game Studio.
Creates bold pixel-art characters in the Pixelpit aesthetic.

Usage:
    python characters.py
    python characters.py "a robot DJ with headphones"
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

# Pixelpit prompt (current)
PIXELPIT_PROMPT = """Create a cute, polished pixel-art character for Pixelpit Game Studio.

CHARACTER: {character_description}

Style & Rendering:
- Clean modern pixel art — visible pixels but polished, not retro-crunchy
- Nintendo Switch indie game quality — bright, friendly, high production value
- Soft glow effects and gentle highlights
- Smooth but still chunky — think Splatoon or Shovel Knight

Character Design Rules:
- Adorable chibi proportions — big round head, tiny body
- Large expressive eyes — friendly and inviting
- Simple, readable silhouette
- ONE clear signature element (hair, accessory, tool, glow)
- Cute but with personality — not generic mascot energy

Color Palette:
- Hot pink (#FF1493) — signature color, use boldly
- Electric cyan (#00FFFF) — accents, highlights, glows
- White or very light gray for body/base
- Keep it bright and saturated — no muddy colors
- Cheerful, not dark or gritty

Mood & Vibe:
- Friendly and approachable, like a character select screen
- Would fit in a cozy indie game or Nintendo eShop
- Cute but distinctive — memorable, not forgettable
- Playful energy, welcoming expression

Composition:
- Single character only
- Front-facing, upright, happy pose
- Centered
- PURE WHITE background (#FFFFFF) — no gray, no gradient, solid white  # TODO: add "or transparent" back for asset exports
- Asset-ready for profile pics, icons, branding

Do NOT include:
- Text, logos, watermarks
- Dark or gritty elements
- Aggressive expressions
- Complex backgrounds
- Overly edgy or "gamer" aesthetic

Output:
A cute, distinctive pixel-art character that feels like a beloved indie game mascot. Friendly. Bold colors. Memorable."""

# Original Amber universe prompt
AMBER_PROMPT = """Create a cute, high-production pixel-art character in the Amber universe style.

CHARACTER: {character_description}

Style & Rendering:
- Soft, rounded pixel-art / voxel-inspired look (not retro 8-bit; modern, smooth pixels)
- High-quality lighting with gentle glow, subtle rim light
- Clean outlines, slightly chunky proportions
- Matte materials with soft gradients (no harsh metallic shine)
- Friendly, emotionally legible expression

Character Design Rules:
- Head is a simple square or rounded-square
- Small body, short limbs, chibi proportions
- Large expressive eyes or simple face marks
- One clear signature element (ears, antenna, glasses, glow stick, heart core, headphones, etc.)

Color Palette:
- Warm, cozy base colors (cream, tan, soft orange, muted gray)
- Accents in teal, cyan, amber, mint, soft neon blue or yellow
- Avoid harsh primaries or saturated red

Mood & Vibe:
- Wholesome, joyful, emotionally warm
- Feels like a friendly companion at a futuristic rave
- Slightly playful, never aggressive

Composition:
- Single character only
- Front-facing, upright, neutral pose
- Centered
- No background, no scenery, no tilt
- PURE WHITE background (#FFFFFF)

Do NOT include:
- Text, logos, watermarks
- Complex environments
- Realistic humans or animals
- Sharp cyberpunk or gritty sci-fi elements

Output:
A clean, reusable character asset that could live next to Amber and her companions."""

# Retro Arcade - NES/Game Boy classic
RETRO_PROMPT = """Create a classic retro pixel-art character in the style of NES or Game Boy games.

CHARACTER: {character_description}

Style & Rendering:
- Chunky, blocky pixels — visible grid, no anti-aliasing
- Limited color palette (8-16 colors max)
- Bold black outlines
- Simple shading — 2-3 tones per color, no gradients
- Crisp, iconic silhouette

Character Design Rules:
- Simple geometric shapes — squares and rectangles
- Chibi proportions but blockier than modern styles
- Large head, tiny body, stubby limbs
- Minimal detail — every pixel counts
- ONE clear identifying feature (hat, eye style, accessory)

Color Palette:
- Limited NES-style colors — not too saturated
- Primary: warm yellows, oranges, or teals
- Accents: one pop color (red, blue, or green)
- Black for outlines, white for highlights
- No neon, no gradients — flat and clean

Mood & Vibe:
- Nostalgic, like a beloved 8-bit game character
- Simple but expressive — personality in few pixels
- Would fit on a Game Boy cartridge cover
- Iconic and instantly readable

Composition:
- Single character only
- Front-facing, standing pose
- Centered
- PURE WHITE background (#FFFFFF)
- Clean, asset-ready

Do NOT include:
- Text, logos, watermarks
- Complex shading or lighting effects
- Modern pixel art techniques
- Backgrounds or environments
- Too many colors or details

Output:
A charming retro pixel-art character that feels like it came from a classic 8-bit game. Simple. Iconic. Nostalgic."""

# Voxel - 3D pixel art like Crossy Road / modern indie toys
VOXEL_PROMPT = """Create a cute 3D voxel-style character like Crossy Road or modern indie game toys.

CHARACTER: {character_description}

Style & Rendering:
- 3D voxel/cubic look — NOT flat pixel art, has depth and dimension
- Soft 3D lighting with warm rim lights and gentle glow
- Smooth but blocky — like Minecraft meets kawaii
- Subtle ambient occlusion, soft shadows
- High production quality, modern indie game feel

Character Design Rules:
- Cubic/blocky head with 3D depth
- Simple kawaii face — closed happy eyes (^_^) as simple lines, or dots
- Open smile, rosy cheeks
- Chibi proportions — big head, small stubby body and limbs
- ONE clear accessory (headphones, hat, tool, glowing element)
- Warm and friendly, like a collectible toy

Color Palette:
- Warm golden/tan/honey tones for skin/body — NOT white or cream
- Dark clothing (black or charcoal) with glowing accents
- Accent glows in cyan (#00FFFF) or teal
- Rosy pink for cheeks
- Rich, warm, inviting — like honey and amber

Mood & Vibe:
- Joyful, celebratory energy — like they're at a creative festival
- Toyetic — would look great as a vinyl figure
- Approachable and huggable
- Game developer / creative maker energy

Composition:
- Single character only
- Front-facing or very slight angle, happy pose
- Centered
- PURE WHITE background (#FFFFFF)
- Asset-ready, clean edges

Do NOT include:
- Flat 2D pixel art — this should feel 3D
- Text, logos, watermarks
- Complex backgrounds or environments
- Harsh or cool color temperatures for the body
- Realistic proportions

Output:
A charming 3D voxel character that looks like a modern indie game collectible. Warm. Cubic. Joyful."""

# Abstract - for patterns and non-character imagery
ABSTRACT_PROMPT = """{character_description}

Style:
- 3D voxel/cubic aesthetic
- Soft lighting with gentle glows
- High production quality

Do NOT include:
- Characters, faces, people, robots, or creatures
- Text, logos, watermarks

Output:
A clean, polished abstract image."""

# Available styles
STYLES = {
    "pixelpit": PIXELPIT_PROMPT,
    "amber": AMBER_PROMPT,
    "retro": RETRO_PROMPT,
    "voxel": VOXEL_PROMPT,
    "abstract": ABSTRACT_PROMPT,
}

# Active prompt - default to voxel (use ABSTRACT_PROMPT for non-character images)
STYLE_PROMPT = VOXEL_PROMPT


def main():
    # Get character description from CLI args or prompt
    if len(sys.argv) > 1:
        character_description = " ".join(sys.argv[1:]).strip()
    else:
        character_description = input("What kind of character? ").strip()

    if not character_description:
        print("Character description cannot be empty.")
        sys.exit(1)

    prompt = STYLE_PROMPT.format(character_description=character_description)

    print(f"Creating: {character_description}")
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

    # Save to kochitown/uploads with a slugified name
    slug = character_description.lower()[:30].replace(" ", "-").replace("'", "")
    slug = "".join(c for c in slug if c.isalnum() or c == "-")

    uploads_dir = Path(__file__).resolve().parent.parent / "uploads"
    uploads_dir.mkdir(exist_ok=True)

    out = uploads_dir / f"{slug}.png"

    # Handle duplicates
    counter = 1
    while out.exists():
        out = uploads_dir / f"{slug}-{counter}.png"
        counter += 1

    out.write_bytes(image_bytes)
    print(f"Saved to {out}")


if __name__ == "__main__":
    main()
