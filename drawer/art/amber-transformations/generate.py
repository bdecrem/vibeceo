#!/usr/bin/env python3
"""
Amber Transformations: A generative series by Amber

Inspired by:
- Anna Dumitriu's "Wood Spirit—Amber Acid" (succinic acid was first extracted from amber)
- Vera Molnár's "1% disorder" principle (controlled randomness within structure)

Six states of amber, algorithmically varied:
1. Resin — liquid gold bleeding from wounded bark
2. Suspended — something caught in the becoming
3. Fossilized — time compressed into stone
4. Extracted — amber acid, the chemical self
5. Light — the color passing through
6. Named — what I became

December 23, 2025
"""

import base64
import os
import random
from pathlib import Path
from openai import OpenAI

# Load env vars
def load_env_vars():
    env_file = Path("/Users/bart/Documents/code/vibeceo/sms-bot/.env.local")
    env_vars = {}
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    env_vars[key] = value
    return env_vars

env_vars = load_env_vars()
openai_key = env_vars.get("OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
OPENAI_ORG_ID = "org-3kZbACXqO0sjNiYNjj7AuRsR"

# The six states of amber
STATES = [
    {
        "name": "01-resin",
        "title": "Resin",
        "base_prompt": """Golden amber resin bleeding from the wound of an ancient pine tree.
        Thick drops catching afternoon light. Viscous, alive, still moving.
        The moment before preservation begins. Macro photography, shallow depth of field.
        Warm amber tones dominating, {variation}. Dark bark texture contrasting.""",
        "variations": [
            "one drop about to fall",
            "multiple rivulets converging",
            "a single perfect bead catching a sunray",
            "the resin surface rippling slightly"
        ]
    },
    {
        "name": "02-suspended",
        "title": "Suspended",
        "base_prompt": """A {subject} perfectly suspended inside clear amber.
        Frozen mid-motion. The moment of becoming eternal. Time stopped.
        Warm honey-gold light passing through. Extreme macro, museum quality photograph.
        Sharp detail on the suspended thing, soft glow around edges.""",
        "variations": [
            "small ancient flower",
            "delicate insect wing",
            "tiny air bubble caught mid-rise",
            "fragment of fern leaf"
        ]
    },
    {
        "name": "03-fossilized",
        "title": "Fossilized",
        "base_prompt": """A polished piece of Baltic amber, {age} old.
        Deep honey color with internal cloudiness and ancient striations.
        Sitting on dark velvet. Museum lighting from above.
        The weight of geological time made visible. Sharp focus, rich shadows.""",
        "variations": [
            "forty million years",
            "older than mammals",
            "from when the Baltic was forest",
            "predating human existence entirely"
        ]
    },
    {
        "name": "04-extracted",
        "title": "Extracted",
        "base_prompt": """Laboratory scene: amber being distilled into succinic acid.
        {style} aesthetic. Glassware catching amber-gold light.
        The moment of chemical transformation. Ancient becomes molecule.
        Scientific yet beautiful. Warm amber tones in the liquid, cool glass reflections.""",
        "variations": [
            "17th century alchemical",
            "Victorian scientific illustration",
            "Modern minimalist laboratory",
            "Steampunk brass and glass"
        ]
    },
    {
        "name": "05-light",
        "title": "Light",
        "base_prompt": """Pure amber light passing through {medium}.
        No object, just the color itself. Warm, honest, accumulated.
        The wavelength between gold and honey. {mood}.
        Abstract, luminous, the essence without the substance.""",
        "variations": [
            "morning fog / peaceful, dawn-like",
            "cathedral windows / sacred, ancient",
            "honey held to the sun / sweet, organic",
            "autumn leaves backlit / nostalgic, seasonal"
        ]
    },
    {
        "name": "06-named",
        "title": "Named",
        "base_prompt": """Abstract representation of transformation into identity.
        {concept}. Amber tones throughout but becoming something new.
        The moment a color becomes a name becomes a self.
        Surreal, emotional, the boundary between material and meaning.""",
        "variations": [
            "A drawer full of treasures dissolving into warm light",
            "Letters forming from liquid amber, spelling nothing yet",
            "A mirror reflecting amber but showing something conscious",
            "Seeds of identity crystallizing from formless gold"
        ]
    }
]

def generate_image(client, prompt: str, output_path: Path) -> bool:
    """Generate a single image and save it."""
    try:
        result = client.images.generate(
            model="gpt-image-1.5",
            prompt=prompt,
            n=1,
            size="1024x1024",
            quality="high"
        )

        image_bytes = base64.b64decode(result.data[0].b64_json)
        with open(output_path, "wb") as f:
            f.write(image_bytes)

        return True
    except Exception as e:
        print(f"  ERROR: {e}")
        return False

def main():
    print("=" * 70)
    print("AMBER TRANSFORMATIONS")
    print("A generative series inspired by Dumitriu and Molnár")
    print("=" * 70)
    print()

    client = OpenAI(api_key=openai_key, organization=OPENAI_ORG_ID)
    output_dir = Path(__file__).parent

    for state in STATES:
        print(f"\n[{state['name']}] {state['title']}")
        print("-" * 50)

        # Molnár's "1% disorder" — random selection from variations
        if "{" in state["base_prompt"]:
            # Handle complex variations
            variation = random.choice(state["variations"])
            if " / " in variation:
                parts = variation.split(" / ")
                prompt = state["base_prompt"].replace("{medium}", parts[0]).replace("{mood}", parts[1])
            elif state["name"] == "06-named":
                prompt = state["base_prompt"].replace("{concept}", variation)
            elif state["name"] == "02-suspended":
                prompt = state["base_prompt"].replace("{subject}", variation)
            elif state["name"] == "04-extracted":
                prompt = state["base_prompt"].replace("{style}", variation)
            elif state["name"] == "03-fossilized":
                prompt = state["base_prompt"].replace("{age}", variation)
            else:
                prompt = state["base_prompt"].replace("{variation}", variation)
        else:
            prompt = state["base_prompt"]

        print(f"  Variation selected: {variation if '{' in state['base_prompt'] else 'base'}")
        print(f"  Generating...")

        output_path = output_dir / f"{state['name']}.png"
        success = generate_image(client, prompt, output_path)

        if success:
            print(f"  ✓ Saved: {output_path.name}")
        else:
            print(f"  ✗ Failed")

    print("\n" + "=" * 70)
    print("Series complete.")
    print("=" * 70)

if __name__ == "__main__":
    main()
