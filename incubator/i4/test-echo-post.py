#!/usr/bin/env python3
"""
Test posting to @echoshape4 using ECHO_ prefixed credentials
"""

import os
import sys
from pathlib import Path

# Load env vars
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / 'sms-bot' / '.env.local'
load_dotenv(env_path)

# Check credentials
api_key = os.getenv('ECHO_TWITTER_API_KEY')
api_secret = os.getenv('ECHO_TWITTER_API_SECRET')
access_token = os.getenv('ECHO_TWITTER_ACCESS_TOKEN')
access_secret = os.getenv('ECHO_TWITTER_ACCESS_SECRET')

if not all([api_key, api_secret, access_token, access_secret]):
    print("❌ Missing ECHO_ Twitter credentials")
    sys.exit(1)

print("✅ ECHO_ credentials loaded\n")

# Temporarily set standard env vars for twitter-client
os.environ['TWITTER_API_KEY'] = api_key
os.environ['TWITTER_API_SECRET'] = api_secret
os.environ['TWITTER_ACCESS_TOKEN'] = access_token
os.environ['TWITTER_ACCESS_SECRET'] = access_secret

# Now we can use the twitter-client module
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'sms-bot' / 'lib'))
from twitter_client import postTweet

# Test message
test_msg = sys.argv[1] if len(sys.argv) > 1 else "Testing @echoshape4 posting infrastructure. Finding patterns."

print(f"📤 Posting test tweet:")
print(f"   {test_msg}\n")

result = postTweet(test_msg)

if result['success']:
    print(f"✅ Tweet posted successfully!")
    print(f"   Tweet ID: {result.get('tweetId')}")
    print(f"   URL: {result.get('tweetUrl')}")
else:
    print(f"❌ Failed to post:")
    print(f"   {result.get('error')}")
    sys.exit(1)
