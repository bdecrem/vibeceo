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

print(f"🔑 Testing with key: {anthropic_api_key[:20]}...")

# Test different endpoints and methods
test_configs = [
    {
        "name": "Standard Messages API",
        "url": "https://api.anthropic.com/v1/messages",
        "headers": {
            "Authorization": f"Bearer {anthropic_api_key}",
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        },
        "payload": {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 10,
            "system": "You are helpful.",
            "messages": [{"role": "user", "content": "Hi"}]
        }
    },
    {
        "name": "Alternative Auth Header",
        "url": "https://api.anthropic.com/v1/messages",
        "headers": {
            "x-api-key": anthropic_api_key,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        },
        "payload": {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 10,
            "system": "You are helpful.",
            "messages": [{"role": "user", "content": "Hi"}]
        }
    },
    {
        "name": "Minimal Request",
        "url": "https://api.anthropic.com/v1/messages",
        "headers": {
            "Authorization": f"Bearer {anthropic_api_key}",
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        },
        "payload": {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 5,
            "messages": [{"role": "user", "content": "Hi"}]
        }
    },
    {
        "name": "Different Model",
        "url": "https://api.anthropic.com/v1/messages",
        "headers": {
            "Authorization": f"Bearer {anthropic_api_key}",
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01"
        },
        "payload": {
            "model": "claude-3-5-haiku-20241022",
            "max_tokens": 10,
            "system": "You are helpful.",
            "messages": [{"role": "user", "content": "Hi"}]
        }
    }
]

for i, config in enumerate(test_configs, 1):
    print(f"\n🧪 Test {i}: {config['name']}")
    
    try:
        response = requests.post(
            config["url"], 
            headers=config["headers"], 
            json=config["payload"], 
            timeout=30
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ SUCCESS!")
            print(f"   Response: {result}")
            break
        else:
            error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
            print(f"   ❌ Failed: {error_data}")
            
    except Exception as e:
        print(f"   💥 Exception: {e}")

# Test if we can access the account info endpoint
print(f"\n🧪 Testing account info endpoint:")
try:
    response = requests.get(
        "https://api.anthropic.com/v1/account",
        headers={
            "Authorization": f"Bearer {anthropic_api_key}",
            "anthropic-version": "2023-06-01"
        },
        timeout=30
    )
    print(f"   Account endpoint status: {response.status_code}")
    if response.status_code == 200:
        print(f"   Account info: {response.json()}")
    else:
        print(f"   Account error: {response.text}")
except Exception as e:
    print(f"   Account endpoint exception: {e}")

print(f"\n💡 Next steps if all fail:")
print(f"1. Check Anthropic Console for account status")
print(f"2. Verify billing is set up correctly")
print(f"3. Try creating a key from a different workspace")
print(f"4. Contact Anthropic support with request ID from failed calls") 