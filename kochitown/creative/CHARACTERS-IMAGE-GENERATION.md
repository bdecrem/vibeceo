# Kochitown Character Image Generation

This note documents the OpenAI image generation call used by
`kochitown/creative/characters.py`, so future changes do not break the
character asset pipeline.

## API Call

The script uses the OpenAI Images API via the official Python client:

- Model: `chatgpt-image-latest` (tracks the current recommended image model)
- Size: `1024x1024`
- Quality: `high`
- Count: `n=1`

Source of truth: `kochitown/creative/characters.py`.

## Auth / Env

The script loads `OPENAI_API_KEY` from `sms-bot/.env.local` using
`python-dotenv`. If the key is missing, it raises a clear error.

## Output

Images are saved into `kochitown/uploads/` with a slugified filename derived
from the character description. If a filename already exists, the script
appends `-1`, `-2`, etc.

## Style Prompt (Baked-In)

```text
Create a cute, high-production pixel-art character in the Amber universe style.

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
- Transparent or white background (asset-ready)

Do NOT include:
- Text, logos, watermarks
- Complex environments
- Realistic humans or animals
- Sharp cyberpunk or gritty sci-fi elements

Output:
A clean, reusable character asset that could live next to Amber and her companions.
```
