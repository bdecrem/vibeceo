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

print(f"🔑 API Key: {anthropic_api_key}")
print(f"🔑 Key length: {len(anthropic_api_key)}")
print(f"🔑 Key starts with: {anthropic_api_key[:15]}")
print(f"🔑 Key ends with: {anthropic_api_key[-10:]}")

# Check for any whitespace or hidden characters
if anthropic_api_key != anthropic_api_key.strip():
    print("⚠️ API key has leading/trailing whitespace!")
    anthropic_api_key = anthropic_api_key.strip()
    print(f"🔧 Cleaned key: {anthropic_api_key}")

# Test different API versions and endpoints
test_configs = [
    {
        "version": "2023-06-01",
        "url": "https://api.anthropic.com/v1/messages"
    },
    {
        "version": "2023-01-01", 
        "url": "https://api.anthropic.com/v1/messages"
    }
]

for config in test_configs:
    print(f"\n🧪 Testing with version: {config['version']}")
    
    headers = {
        "Authorization": f"Bearer {anthropic_api_key}",
        "Content-Type": "application/json",
        "anthropic-version": config["version"]
    }
    
    payload = {
        "model": "claude-3-sonnet-20240229",
        "max_tokens": 50,
        "messages": [
            {
                "role": "user",
                "content": "Say 'Hello'"
            }
        ]
    }
    
    try:
        response = requests.post(config["url"], headers=headers, json=payload, timeout=30)
        
        print(f"📊 Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS!")
            print(f"📝 Response: {result}")
            break
        else:
            print("❌ Failed")
            print(f"📝 Error: {response.text}")
            
            # Check specific error types
            if response.status_code == 401:
                print("🔍 Authentication error - check API key validity")
            elif response.status_code == 429:
                print("🔍 Rate limit error - too many requests")
            elif response.status_code == 400:
                print("🔍 Bad request - check payload format")
                
    except Exception as e:
        print(f"💥 Exception: {e}")

# Also test if we can reach the API at all
print(f"\n🌐 Testing basic connectivity to api.anthropic.com...")
try:
    response = requests.get("https://api.anthropic.com", timeout=10)
    print(f"📊 Basic connectivity: {response.status_code}")
except Exception as e:
    print(f"💥 Connectivity error: {e}") 