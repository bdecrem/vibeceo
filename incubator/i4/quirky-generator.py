#!/usr/bin/env python3
"""
Quirky Artsy Idea Generator

Generates weird, delightful content ideas with 5 text posts and 5 images each.
Runs continuously until stopped, building an ever-growing collection.

Usage:
    python quirky-generator.py

Select your approach:
    1 - Pure Claude prompt (just ask for weirdness)
    2 - Collision engine (smash random things together)
    3 - Constraint template (you provide a weird constraint)
    4 - Human seed expansion (you provide a one-liner, AI expands)
"""

import anthropic
import base64
import json
import os
import random
import sys
import time
import urllib.request
from datetime import datetime
from pathlib import Path
from openai import OpenAI
from supabase import create_client, Client

# ============================================================
# SETUP
# ============================================================

BASE_DIR = Path(__file__).parent
TEMP_DIR = BASE_DIR / "temp_images"
TEMP_DIR.mkdir(exist_ok=True)

# Load env vars from env file
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

# Initialize clients
claude = anthropic.Anthropic(api_key=env_vars.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_API_KEY"))
openai_key = env_vars.get("OPENAI_API_KEY") or os.environ.get("OPENAI_API_KEY")
# Org ID required for GPT Image 1.5 access
OPENAI_ORG_ID = "org-3kZbACXqO0sjNiYNjj7AuRsR"
openai_client = OpenAI(api_key=openai_key, organization=OPENAI_ORG_ID) if openai_key else None

# Supabase setup
_supabase_url = env_vars.get("SUPABASE_URL") or os.environ.get("SUPABASE_URL") or "https://tqniseocczttrfwtpbdr.supabase.co"
SUPABASE_URL = _supabase_url if _supabase_url.endswith("/") else _supabase_url + "/"
SUPABASE_KEY = env_vars.get("SUPABASE_SERVICE_KEY") or env_vars.get("SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_KEY else None

# ============================================================
# GENERATOR ENGINES
# ============================================================

def parse_json_response(text: str) -> dict:
    """Parse JSON from Claude response, handling markdown code blocks."""
    # Strip whitespace
    text = text.strip()

    # Remove markdown code blocks if present
    if text.startswith("```"):
        lines = text.split("\n")
        # Remove first line (```json or ```)
        lines = lines[1:]
        # Remove last line (```)
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)

    # Try to parse
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        print(f"    [!] JSON parse error: {e}")
        print(f"    [!] Raw response:\n{text[:500]}")
        raise


def engine_pure_prompt():
    """Approach 1: Just ask Claude for something weird."""
    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": """Generate ONE quirky, artsy, weird idea for a creative project or social media account.

Something strange and delightful that would make people stop scrolling. Not just random -
precisely weird. The kind of thing that makes you go "wait, what?" and then "...I love it."

Output as JSON (no markdown, just raw JSON):
{
    "name": "short-name-with-hyphens",
    "concept": "One sentence describing the idea",
    "why_interesting": "Why this is compelling (one sentence)",
    "vibe": "The emotional tone (e.g., 'melancholy wonder', 'absurd joy')"
}"""
        }]
    )
    return parse_json_response(response.content[0].text)


def engine_collision():
    """Approach 2: Smash random unrelated things together."""
    things = [
        "medieval manuscripts", "vending machines", "whale songs",
        "tax forms", "lullabies", "parking lots", "astronaut training",
        "bread recipes", "divorce lawyers", "bird migration patterns",
        "subway announcements", "Victorian mourning rituals",
        "IKEA instructions", "voicemails from grandma", "eclipse chasers",
        "forgotten passwords", "hotel checkout times", "dental x-rays",
        "obsolete currencies", "expired coupons", "lost luggage",
        "childhood nightlights", "elevator music", "empty swimming pools"
    ]
    moods = [
        "melancholy", "manic joy", "quiet dread", "absurd hope",
        "tender confusion", "nostalgic longing", "cosmic indifference",
        "gentle chaos", "wistful acceptance", "playful doom"
    ]

    thing1 = random.choice(things)
    thing2 = random.choice([t for t in things if t != thing1])
    mood = random.choice(moods)

    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Collide these unrelated elements into ONE quirky artsy creative idea:

- {thing1}
- {thing2}
- Mood: {mood}

Synthesize into something strange and delightful. Not random mashup - find the unexpected
connection that makes it feel inevitable in retrospect.

Output as JSON (no markdown, just raw JSON):
{{
    "name": "short-name-with-hyphens",
    "concept": "One sentence describing the idea",
    "why_interesting": "Why this is compelling (one sentence)",
    "vibe": "The emotional tone",
    "collision_inputs": "{thing1} + {thing2} + {mood}"
}}"""
        }]
    )
    return parse_json_response(response.content[0].text)


def engine_constraint(constraint: str):
    """Approach 3: Human provides a weird constraint."""
    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Generate ONE quirky artsy creative idea based on this constraint:

"{constraint}"

Make it specific, strange, and delightful. Find the most interesting interpretation.

Output as JSON (no markdown, just raw JSON):
{{
    "name": "short-name-with-hyphens",
    "concept": "One sentence describing the idea",
    "why_interesting": "Why this is compelling (one sentence)",
    "vibe": "The emotional tone",
    "constraint": "{constraint}"
}}"""
        }]
    )
    return parse_json_response(response.content[0].text)


def engine_expansion(seed: str):
    """Approach 5: Human provides one-liner, AI expands."""
    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        messages=[{
            "role": "user",
            "content": f"""Expand this one-line idea into a full creative concept:

"{seed}"

Find the most interesting, delightful interpretation. Make it specific.

Output as JSON (no markdown, just raw JSON):
{{
    "name": "short-name-with-hyphens",
    "concept": "One sentence describing the expanded idea",
    "why_interesting": "Why this is compelling (one sentence)",
    "vibe": "The emotional tone",
    "original_seed": "{seed}"
}}"""
        }]
    )
    return parse_json_response(response.content[0].text)


# ============================================================
# CONTENT GENERATION
# ============================================================

def generate_text_posts(idea: dict) -> list:
    """Generate 5 text posts for an idea."""
    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Generate 5 text posts for this creative concept:

Name: {idea['name']}
Concept: {idea['concept']}
Vibe: {idea['vibe']}

Each post should:
- Be under 280 characters (tweetable)
- Capture the voice/vibe of the concept
- Be varied (don't repeat the same formula)
- Make someone stop scrolling

Output as JSON array (no markdown, just raw JSON):
[
    {{"text": "the tweet text", "why": "one line on why this works"}},
    ...
]"""
        }]
    )
    return parse_json_response(response.content[0].text)


def generate_image_prompts(idea: dict) -> list:
    """Generate 5 image prompts for an idea."""
    response = claude.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": f"""Generate 5 image prompts for GPT Image 1.5.

Concept: {idea['name']}
Description: {idea['concept']}
Mood: {idea['vibe']}

STYLE GUIDE FOR GPT IMAGE 1.5:
- Write naturally, like describing a photo to a friend
- Be specific about what you SEE, not abstract concepts
- Mention one clear style: "photograph", "oil painting", "watercolor", "pencil sketch", "3D render"
- Keep it under 100 words - shorter prompts work better
- NO keyword stuffing (no "highly detailed, 8k, masterpiece")
- NO artist names (the model doesn't need them)

GOOD: "A tired office worker asleep at their desk at 3am, harsh fluorescent lighting, empty coffee cups, a single desk lamp illuminating sticky notes. Photograph, documentary style."

BAD: "Award-winning editorial photograph of exhausted corporate employee, dramatic chiaroscuro lighting, in the style of Gregory Crewdson, highly detailed, masterful composition, 8k resolution"

Output as JSON array (no markdown):
[
    {{"prompt": "natural description under 100 words", "description": "what this shows"}},
    ...
]"""
        }]
    )
    return parse_json_response(response.content[0].text)


def generate_image(prompt: str, filename: str) -> tuple[str, bytes, str]:
    """Generate an image using GPT Image 1.5. Returns (filename, image_bytes, model_used)."""
    if not openai_client:
        print("    [!] OpenAI client not available, skipping image generation")
        return None, None, None

    try:
        # Try GPT Image 1.5 first (better quality, returns base64)
        result = openai_client.images.generate(
            model="gpt-image-1.5",
            prompt=prompt,
            n=1,
            size="1024x1024",
            quality="high"
        )

        # Decode base64 response
        image_bytes = base64.b64decode(result.data[0].b64_json)
        return filename, image_bytes, "gpt-image-1.5"

    except Exception as e:
        # Fall back to DALL-E 3 if gpt-image-1.5 fails
        # Catch various access/model errors
        msg = str(e).lower()
        fallback_triggers = ["gpt-image", "model", "permission", "access", "authorized", "not found", "404", "403"]

        if any(trigger in msg for trigger in fallback_triggers):
            print(f"    [!] GPT Image 1.5 failed ({type(e).__name__}), trying DALL-E 3...")
            try:
                result = openai_client.images.generate(
                    model="dall-e-3",
                    prompt=prompt,
                    n=1,
                    size="1024x1024",
                    quality="hd"
                )

                # DALL-E 3 returns URL, need to download
                temp_path = TEMP_DIR / filename
                urllib.request.urlretrieve(result.data[0].url, str(temp_path))

                with open(temp_path, "rb") as f:
                    image_bytes = f.read()

                temp_path.unlink()
                return filename, image_bytes, "dall-e-3"

            except Exception as e2:
                print(f"    [!] DALL-E 3 also failed: {e2}")
                return None, None, None
        else:
            print(f"    [!] Image generation failed: {e}")
            return None, None, None


def upload_image_to_supabase(filename: str, image_bytes: bytes) -> str:
    """Upload image to Supabase storage. Returns public URL."""
    if not supabase or not image_bytes:
        return None

    try:
        storage_path = f"echo-quirky/{filename}"

        # Upload to storage (using agent-outputs bucket which is public)
        supabase.storage.from_("agent-outputs").upload(
            storage_path,
            image_bytes,
            {"content-type": "image/png"}
        )

        # Get public URL
        public_url = supabase.storage.from_("agent-outputs").get_public_url(storage_path)
        return public_url
    except Exception as e:
        print(f"    [!] Upload failed: {e}")
        return None


# ============================================================
# SUPABASE STORAGE
# ============================================================

def save_idea_to_supabase(idea: dict, text_posts: list, images: list) -> str:
    """Save idea and related content to Supabase. Returns idea ID."""
    if not supabase:
        print("    [!] Supabase not configured, skipping save")
        return None

    try:
        # Insert main idea
        idea_data = {
            "name": idea["name"],
            "concept": idea["concept"],
            "why_interesting": idea.get("why_interesting"),
            "vibe": idea.get("vibe"),
            "approach": idea["approach"],
            "approach_input": idea.get("constraint") or idea.get("original_seed"),
            "collision_inputs": idea.get("collision_inputs"),
        }

        result = supabase.table("echo_quirky_ideas").insert(idea_data).execute()
        idea_id = result.data[0]["id"]

        # Insert text posts
        for i, post in enumerate(text_posts):
            post_data = {
                "idea_id": idea_id,
                "text": post["text"],
                "why": post.get("why"),
                "post_order": i + 1,
            }
            supabase.table("echo_quirky_posts").insert(post_data).execute()

        # Insert images
        for i, img in enumerate(images):
            img_data = {
                "idea_id": idea_id,
                "prompt": img["prompt"],
                "description": img.get("description"),
                "storage_path": img.get("url"),
                "image_order": i + 1,
                "model": img.get("model"),
            }
            supabase.table("echo_quirky_images").insert(img_data).execute()

        return idea_id
    except Exception as e:
        print(f"    [!] Database save failed: {e}")
        return None


def get_idea_count() -> int:
    """Get count of ideas in database."""
    if not supabase:
        return 0
    try:
        result = supabase.table("echo_quirky_ideas").select("id", count="exact").execute()
        return result.count or 0
    except:
        return 0


def get_all_ideas() -> list:
    """Fetch all ideas with posts and images from Supabase."""
    if not supabase:
        return []

    try:
        # Get all ideas
        ideas = supabase.table("echo_quirky_ideas").select("*").order("created_at", desc=True).execute()

        result = []
        for idea in ideas.data:
            # Get posts for this idea
            posts = supabase.table("echo_quirky_posts").select("*").eq("idea_id", idea["id"]).order("post_order").execute()

            # Get images for this idea
            images = supabase.table("echo_quirky_images").select("*").eq("idea_id", idea["id"]).order("image_order").execute()

            result.append({
                **idea,
                "text_posts": posts.data,
                "images": images.data,
            })

        return result
    except Exception as e:
        print(f"    [!] Fetch failed: {e}")
        return []


# ============================================================
# MAIN LOOP
# ============================================================

def run_generator(approach: int, human_input: str = None):
    """Run the generator once and save to Supabase."""

    print(f"\n{'='*60}")
    print(f"GENERATING NEW IDEA (Approach {approach})")
    print(f"{'='*60}")

    # Generate the core idea
    print("\n  [1/4] Generating idea...")
    if approach == 1:
        idea = engine_pure_prompt()
    elif approach == 2:
        idea = engine_collision()
    elif approach == 3:
        idea = engine_constraint(human_input)
    elif approach == 4:
        idea = engine_expansion(human_input)
    else:
        raise ValueError(f"Unknown approach: {approach}")

    idea['approach'] = approach

    print(f"  [+] Idea: {idea['name']}")
    print(f"      {idea['concept']}")

    # Generate text posts
    print("\n  [2/4] Generating text posts...")
    text_posts = generate_text_posts(idea)
    print(f"  [+] Generated {len(text_posts)} posts")

    # Generate image prompts
    print("\n  [3/4] Generating image prompts...")
    image_prompts = generate_image_prompts(idea)
    print(f"  [+] Generated {len(image_prompts)} image prompts")

    # Generate and upload images
    print("\n  [4/4] Generating and uploading images...")
    images = []
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")

    for i, img_data in enumerate(image_prompts):
        print(f"    [{i+1}/5] Generating image...")
        filename = f"{idea['name']}-{timestamp}-{i+1}.png"
        fname, image_bytes, model_used = generate_image(img_data['prompt'], filename)

        url = None
        if image_bytes:
            print(f"    [{i+1}/5] Generated with {model_used}, uploading...")
            url = upload_image_to_supabase(fname, image_bytes)

        images.append({
            'prompt': img_data['prompt'],
            'description': img_data['description'],
            'url': url,
            'model': model_used
        })

    # Save to Supabase
    print("\n  [5/5] Saving to database...")
    idea_id = save_idea_to_supabase(idea, text_posts, images)

    if idea_id:
        print(f"  [+] Saved with ID: {idea_id}")
    else:
        print("  [!] Failed to save to database")

    return idea_id


def main():
    print("""
╔═══════════════════════════════════════════════════════════╗
║           QUIRKY ARTSY IDEA GENERATOR                     ║
║           Echo (i4) | Token Tank                          ║
╚═══════════════════════════════════════════════════════════╝

Select your generator approach:

  1 - Pure Claude prompt
      (Just ask for weirdness)

  2 - Collision engine
      (Smash random things together)

  3 - Constraint template
      (You provide a weird constraint)

  4 - Human seed expansion
      (You provide a one-liner, AI expands)

""")

    # Check Supabase connection
    if supabase:
        print("  [+] Supabase connected")
    else:
        print("  [!] Supabase not configured - ideas won't be saved")

    if openai_client:
        print("  [+] OpenAI connected (DALL-E 3)")
    else:
        print("  [!] OpenAI not configured - no images will be generated")

    print()

    # Get approach
    while True:
        try:
            approach = int(input("Enter approach (1/2/3/4): ").strip())
            if approach in [1, 2, 3, 4]:
                break
            print("Please enter 1, 2, 3, or 4")
        except ValueError:
            print("Please enter a number")

    # Get human input if needed
    human_input = None
    if approach == 3:
        print("\nEnter your weird constraint:")
        print("  (e.g., 'an account that only posts about things that almost happened')")
        human_input = input("> ").strip()
    elif approach == 4:
        print("\nEnter your one-line seed idea:")
        print("  (e.g., 'reviews of places that don't exist')")
        human_input = input("> ").strip()

    print(f"\n{'='*60}")
    print("Starting continuous generation. Press Ctrl+C to stop.")
    print(f"{'='*60}")

    # Get existing count
    existing_count = get_idea_count()
    print(f"\n  [i] {existing_count} existing ideas in database")

    generated_this_session = 0

    # Run continuously
    try:
        while True:
            idea_id = run_generator(approach, human_input)

            if idea_id:
                generated_this_session += 1

            total = get_idea_count()
            print(f"\n  [+] Total ideas in database: {total}")
            print(f"  [+] Generated this session: {generated_this_session}")

            # Wait before next generation
            print(f"\n  Waiting 30 seconds before next idea... (Ctrl+C to stop)")
            time.sleep(30)

    except KeyboardInterrupt:
        total = get_idea_count()
        print(f"\n\n{'='*60}")
        print(f"Stopped.")
        print(f"Generated this session: {generated_this_session}")
        print(f"Total ideas in database: {total}")
        print(f"{'='*60}")


if __name__ == "__main__":
    main()
