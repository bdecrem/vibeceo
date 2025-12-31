#!/usr/bin/env python3
"""
Post a quirky concept to Twitter for testing

Usage:
  python3 post-concept.py <concept-name> [post-index]

Example:
  python3 post-concept.py expired-fortune-cookies 0
  python3 post-concept.py potato-confessions 2
"""

import sys
import json
import subprocess
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 post-concept.py <concept-name> [post-index]")
        print("\nAvailable concepts:")
        with open('test-concepts.json', 'r') as f:
            concepts = json.load(f)
            for c in concepts:
                print(f"  • {c['name']}")
        sys.exit(1)

    concept_name = sys.argv[1]
    post_index = int(sys.argv[2]) if len(sys.argv) > 2 else 0

    # Load concepts
    with open('test-concepts.json', 'r') as f:
        concepts = json.load(f)

    # Find the concept
    concept = None
    for c in concepts:
        if c['name'] == concept_name:
            concept = c
            break

    if not concept:
        print(f"❌ Concept '{concept_name}' not found")
        sys.exit(1)

    if post_index >= len(concept['posts']):
        print(f"❌ Post index {post_index} out of range (concept has {len(concept['posts'])} posts)")
        sys.exit(1)

    # Get post text
    post_text = concept['posts'][post_index]

    # Check if there's an image
    has_image = post_index < len(concept['images']) and concept['images'][post_index]

    print(f"📤 Posting concept: {concept_name}")
    print(f"   Post #{post_index + 1}/{len(concept['posts'])}")
    print(f"   Text: {post_text[:100]}...")
    print(f"   Image: {'Yes' if has_image else 'No'}")
    print()

    # Build Twitter post command
    # Use the existing Twitter posting infrastructure in sms-bot
    sms_bot_dir = Path(__file__).parent.parent.parent / 'sms-bot'

    if has_image:
        # Download image first
        image_url = concept['images'][post_index]
        image_filename = f"/tmp/{concept_name}-{post_index}.png"

        print(f"⬇️  Downloading image: {image_url}")
        download_result = subprocess.run(
            ['curl', '-s', '-o', image_filename, image_url],
            capture_output=True,
            text=True
        )

        if download_result.returncode != 0:
            print(f"❌ Failed to download image")
            sys.exit(1)

        print(f"   Saved to: {image_filename}\n")

        # Post with image
        # TODO: Use twitter-client to post with image
        # For now, manual placeholder
        print(f"🚧 Image posting not yet implemented")
        print(f"   Text: {post_text}")
        print(f"   Image: {image_filename}")
        print(f"\n   Manual command:")
        print(f"   cd {sms_bot_dir} && npx tsx scripts/test-twitter-post.ts '{post_text}'")
    else:
        # Post text-only
        print(f"📝 Posting text-only tweet\n")

        # Call the Twitter posting script
        result = subprocess.run(
            ['npx', 'tsx', 'scripts/test-twitter-post.ts', post_text],
            cwd=sms_bot_dir,
            capture_output=True,
            text=True
        )

        print(result.stdout)

        if result.returncode != 0:
            print(f"❌ Failed to post:")
            print(result.stderr)
            sys.exit(1)

        print(f"✅ Posted successfully!")

if __name__ == '__main__':
    main()
