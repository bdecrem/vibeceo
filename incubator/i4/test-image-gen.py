#!/usr/bin/env python3
"""
Test GPT Image 1.5 generation with medium quality.
"""

import base64
import os
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

print("=" * 60)
print("GPT IMAGE 1.5 TEST - MEDIUM QUALITY")
print("=" * 60)

# The API call we're making
print("\n[1] API CALL SPECIFICATION:")
print("-" * 40)
api_params = {
    "model": "gpt-image-1.5",
    "prompt": "A small robot sitting on a park bench feeding pigeons. Warm afternoon light, slightly melancholic mood. Photograph, candid street photography style.",
    "n": 1,
    "size": "1024x1024",
    "quality": "medium"
}

for key, value in api_params.items():
    print(f"  {key}: {value}")

print("\n[2] EXECUTING API CALL...")
print("-" * 40)

client = OpenAI(api_key=openai_key, organization=OPENAI_ORG_ID)

try:
    result = client.images.generate(
        model=api_params["model"],
        prompt=api_params["prompt"],
        n=api_params["n"],
        size=api_params["size"],
        quality=api_params["quality"]
    )

    print(f"  SUCCESS!")
    print(f"  Model requested: {api_params['model']}")
    print(f"  Quality requested: {api_params['quality']}")
    print(f"  Response type: base64 image data")
    print(f"  Data length: {len(result.data[0].b64_json)} characters")

    # Save the image
    output_path = Path(__file__).parent / "test-output.png"
    image_bytes = base64.b64decode(result.data[0].b64_json)
    with open(output_path, "wb") as f:
        f.write(image_bytes)

    print(f"\n[3] OUTPUT FILE:")
    print("-" * 40)
    print(f"  Saved to: {output_path}")
    print(f"  File size: {len(image_bytes):,} bytes ({len(image_bytes)/1024:.1f} KB)")

except Exception as e:
    print(f"  FAILED: {type(e).__name__}: {e}")

print("\n" + "=" * 60)
