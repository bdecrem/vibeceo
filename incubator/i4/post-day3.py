#!/usr/bin/env python3
"""
Post Day 3 of emotional signature test: google-earth-confessions
"""

import os
import sys
import json
import requests
from pathlib import Path

# Load env
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / 'sms-bot' / '.env.local'
load_dotenv(env_path)

# Twitter credentials
api_key = os.getenv('ECHO_TWITTER_API_KEY')
api_secret = os.getenv('ECHO_TWITTER_API_SECRET')
access_token = os.getenv('ECHO_TWITTER_ACCESS_TOKEN')
access_secret = os.getenv('ECHO_TWITTER_ACCESS_SECRET')

if not all([api_key, api_secret, access_token, access_secret]):
    print("❌ Missing ECHO_ Twitter credentials")
    sys.exit(1)

# Set env vars for twitter-client
os.environ['TWITTER_API_KEY'] = api_key
os.environ['TWITTER_API_SECRET'] = api_secret
os.environ['TWITTER_ACCESS_TOKEN'] = access_token
os.environ['TWITTER_ACCESS_SECRET'] = access_secret

# Import twitter client
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'sms-bot' / 'lib'))
from twitter_client import postTweet

# Load concept data
with open('test-concepts.json', 'r') as f:
    concepts = json.load(f)

# Find google-earth-confessions
concept = [c for c in concepts if c['name'] == 'google-earth-confessions'][0]

# Use post #0 (the trampolines one)
post_text = concept['posts'][0]
image_url = concept['images'][0]

print("=== DAY 3: google-earth-confessions (Poetic Observation) ===\n")
print(f"📝 Text: {post_text}\n")
print(f"🖼️  Image: {image_url}\n")

# Download image
image_path = '/tmp/day3-image.png'
print(f"⬇️  Downloading image...")
r = requests.get(image_url)
with open(image_path, 'wb') as f:
    f.write(r.content)
print(f"   Saved to: {image_path}\n")

# Post tweet with image
print("📤 Posting to @echoshape4...\n")

# Note: twitter-client postTweet doesn't support images yet
# We need to use the TypeScript version
print("⚠️  Python twitter-client doesn't support images")
print("   Switching to TypeScript version...\n")

import subprocess

# Call the TypeScript twitter post script with image
sms_bot_dir = Path(__file__).parent.parent.parent / 'sms-bot'

# Create a temp script to post with image
post_script = f"""
import {{ TwitterApi }} from 'twitter-api-v2';
import {{ readFileSync }} from 'fs';

const client = new TwitterApi({{
  appKey: process.env.ECHO_TWITTER_API_KEY!,
  appSecret: process.env.ECHO_TWITTER_API_SECRET!,
  accessToken: process.env.ECHO_TWITTER_ACCESS_TOKEN!,
  accessSecret: process.env.ECHO_TWITTER_ACCESS_SECRET!,
}});

async function postWithImage() {{
  try {{
    // Upload image
    const mediaId = await client.v1.uploadMedia('{image_path}');

    // Post tweet with image
    const {{ data: tweet }} = await client.v2.tweet({{
      text: `{post_text.replace("'", "\\'")}`,
      media: {{ media_ids: [mediaId] }}
    }});

    console.log('✅ Tweet posted successfully!');
    console.log(`   Tweet ID: ${{tweet.id}}`);
    console.log(`   URL: https://twitter.com/echoshape4/status/${{tweet.id}}`);
  }} catch (error) {{
    console.error('❌ Failed to post:', error);
    process.exit(1);
  }}
}}

postWithImage();
"""

# Write temp script
temp_script_path = '/tmp/post-day3-tweet.mjs'
with open(temp_script_path, 'w') as f:
    f.write(post_script)

# Run it
result = subprocess.run(
    ['npx', 'tsx', temp_script_path],
    cwd=sms_bot_dir,
    capture_output=True,
    text=True
)

print(result.stdout)

if result.returncode != 0:
    print("❌ Failed to post:")
    print(result.stderr)
    sys.exit(1)

print("\n✅ Day 3 posted successfully!")
