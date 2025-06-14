#!/usr/bin/env python3

import os
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load environment
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
if not anthropic_api_key:
    print("❌ ANTHROPIC_API_KEY not found")
    exit(1)

print(f"🔑 Testing Claude API with fixed authentication...")

# Test the fixed authentication method
headers = {
    "x-api-key": anthropic_api_key,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01"
}

payload = {
    "model": "claude-3-haiku-20240307",
    "max_tokens": 50,
    "system": "You are a helpful assistant.",
    "messages": [
        {"role": "user", "content": "Say hello and confirm you're working!"}
    ]
}

try:
    response = requests.post(
        "https://api.anthropic.com/v1/messages",
        headers=headers,
        json=payload,
        timeout=30
    )
    
    print(f"📊 Status Code: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ SUCCESS! Claude API is working!")
        print(f"📝 Response: {result['content'][0]['text']}")
        print(f"🎯 The authentication fix worked!")
    else:
        error_data = response.json()
        print(f"❌ Failed: {error_data}")
        
except Exception as e:
    print(f"💥 Exception: {e}")

print(f"\n🔧 Authentication method used: x-api-key header (not Authorization Bearer)")
print(f"🎉 This should now work in monitor.py!") 