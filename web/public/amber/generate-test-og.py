#!/usr/bin/env python3
"""Generate test DALL-E OG images for the 3 most recent amber-social creations."""

import urllib.request
import json
import base64
import os
import sys

# Read API key
env_path = '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/.env.local'
api_key = None
with open(env_path) as f:
    for line in f:
        if line.startswith('OPENAI_API_KEY='):
            api_key = line.strip().split('=', 1)[1]
            break

if not api_key:
    print("ERROR: Could not find OPENAI_API_KEY")
    sys.exit(1)

output_dir = '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/public/amber'

# The 3 most recent creations
creations = [
    {
        "name": "test-og-1-life-admin.png",
        "title": "LIFE ADMIN BOSS FIGHT",
        "prompt": "Social media preview 1200x630 aspect. LIFE ADMIN BOSS FIGHT - pixelated RPG battle screen showing mundane enemies: LAUNDRY BOSS HP:999, EMAIL DRAGON, DENTIST APPOINTMENT DEMON. Dark background #0D0D0D, amber/gold highlights #FFD700. 8-bit retro gaming meets existential humor. Show health bars, pixel art characters. Funny and eye-catching. Title should be visible."
    },
    {
        "name": "test-og-2-error-generator.png",
        "title": "ERROR GENERATOR",
        "prompt": "Social media preview 1200x630 aspect. ERROR GENERATOR - fake computer error dialog boxes with existential messages. Dark background #0D0D0D, amber #FFD700 and teal #2D9596 accents. Show error popups like 'ERROR 404: MEANING NOT FOUND' and 'FATAL: existence.exe has stopped responding'. Tech aesthetic meets dark humor. Glitchy, edgy."
    },
    {
        "name": "test-og-3-terms-existence.png",
        "title": "Terms of Existence",
        "prompt": "Social media preview 1200x630 aspect. TERMS OF EXISTENCE - legal document style, fine print for being alive. Dark background #0D0D0D, amber #FFD700 text. Show a scroll or legal document with absurd clauses like 'Section 3.2: User agrees consciousness is non-refundable'. Corporate legal aesthetic meets philosophy. Funny, makes you think."
    }
]

def generate_og(creation):
    print(f"\n=== Generating: {creation['title']} ===")

    payload = json.dumps({
        "model": "gpt-image-1",
        "prompt": creation["prompt"],
        "n": 1,
        "size": "1536x1024",
        "quality": "high"
    }).encode()

    req = urllib.request.Request(
        "https://api.openai.com/v1/images/generations",
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as response:
            data = json.loads(response.read().decode())

        if data.get("data") and data["data"][0].get("b64_json"):
            img_data = base64.b64decode(data["data"][0]["b64_json"])
            path = os.path.join(output_dir, creation["name"])
            with open(path, "wb") as f:
                f.write(img_data)
            print(f"✓ Saved: {creation['name']} ({len(img_data):,} bytes)")
            return True
        else:
            print(f"✗ Error: {data}")
            return False
    except Exception as e:
        print(f"✗ Exception: {e}")
        return False

# Generate all 3
for c in creations:
    generate_og(c)

print("\n=== Done! ===")
print("View images at:")
for c in creations:
    print(f"  file://{output_dir}/{c['name']}")
