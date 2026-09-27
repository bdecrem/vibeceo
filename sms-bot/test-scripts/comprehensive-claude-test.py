#!/usr/bin/env python3

import os
import requests
from pathlib import Path
from dotenv import load_dotenv
import json

# Load environment
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

anthropic_api_key = os.getenv('ANTHROPIC_API_KEY')
if not anthropic_api_key:
    print("❌ ANTHROPIC_API_KEY not found")
    exit(1)

print(f"🔑 Testing API key: {anthropic_api_key[:15]}...{anthropic_api_key[-10:]}")
print(f"🔑 Key length: {len(anthropic_api_key)}")

# Test 1: Basic connectivity
print("\n🧪 Test 1: Basic API connectivity")
try:
    response = requests.get("https://api.anthropic.com", timeout=10)
    print(f"✅ Can reach api.anthropic.com: {response.status_code}")
except Exception as e:
    print(f"❌ Cannot reach api.anthropic.com: {e}")

# Test 2: Different API versions
print("\n🧪 Test 2: Testing different API versions")
api_versions = ["2023-06-01", "2023-01-01", "2024-01-01"]

for version in api_versions:
    print(f"\n  Testing version: {version}")
    
    headers = {
        "Authorization": f"Bearer {anthropic_api_key}",
        "Content-Type": "application/json",
        "anthropic-version": version
    }
    
    # Test with minimal payload
    payload = {
        "model": "claude-sonnet-5",
        "max_tokens": 10,
        "system": "You are helpful.",
        "messages": [{"role": "user", "content": "Hi"}]
    }
    
    try:
        response = requests.post("https://api.anthropic.com/v1/messages", 
                               headers=headers, json=payload, timeout=30)
        print(f"    Status: {response.status_code}")
        if response.status_code != 200:
            print(f"    Error: {response.text}")
        else:
            print(f"    ✅ SUCCESS with version {version}!")
            break
    except Exception as e:
        print(f"    Exception: {e}")

# Test 3: Different models
print("\n🧪 Test 3: Testing different models")
models = [
    "claude-sonnet-5",
    "claude-3-haiku-20240307", 
    "claude-opus-5-5",
    "claude-sonnet-5"
]

for model in models:
    print(f"\n  Testing model: {model}")
    
    headers = {
        "Authorization": f"Bearer {anthropic_api_key}",
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01"
    }
    
    payload = {
        "model": model,
        "max_tokens": 10,
        "system": "You are helpful.",
        "messages": [{"role": "user", "content": "Hi"}]
    }
    
    try:
        response = requests.post("https://api.anthropic.com/v1/messages", 
                               headers=headers, json=payload, timeout=30)
        print(f"    Status: {response.status_code}")
        if response.status_code == 200:
            print(f"    ✅ SUCCESS with model {model}!")
            break
        elif response.status_code == 401:
            print(f"    ❌ Auth error (same as before)")
        else:
            print(f"    Error: {response.text}")
    except Exception as e:
        print(f"    Exception: {e}")

# Test 4: Alternative request formats
print("\n🧪 Test 4: Testing alternative request formats")

# Format 1: Without system prompt
print("\n  Testing without system prompt:")
headers = {
    "Authorization": f"Bearer {anthropic_api_key}",
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01"
}

payload = {
    "model": "claude-sonnet-5",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hi"}]
}

try:
    response = requests.post("https://api.anthropic.com/v1/messages", 
                           headers=headers, json=payload, timeout=30)
    print(f"    Status: {response.status_code}")
    if response.status_code == 200:
        print(f"    ✅ SUCCESS without system prompt!")
    else:
        print(f"    Error: {response.text}")
except Exception as e:
    print(f"    Exception: {e}")

# Test 5: Check if key has special characters or encoding issues
print("\n🧪 Test 5: Key format analysis")
print(f"Key starts with 'sk-ant-': {anthropic_api_key.startswith('sk-ant-')}")
print(f"Key contains only valid chars: {anthropic_api_key.replace('-', '').replace('_', '').isalnum()}")
print(f"Key has whitespace: {anthropic_api_key != anthropic_api_key.strip()}")

# Test 6: Try with curl equivalent
print("\n🧪 Test 6: Raw request details")
print("Equivalent curl command:")
print(f"""curl -X POST https://api.anthropic.com/v1/messages \\
  -H "Authorization: Bearer {anthropic_api_key[:15]}..." \\
  -H "Content-Type: application/json" \\
  -H "anthropic-version: 2023-06-01" \\
  -d '{{"model": "claude-sonnet-5", "max_tokens": 10, "messages": [{{"role": "user", "content": "Hi"}}]}}'""")

print("\n🔍 If all tests fail with 401, the issue is likely:")
print("1. API key not activated (can take 5-10 minutes)")
print("2. Account needs billing verification")
print("3. Account region restrictions")
print("4. API access not enabled for your account type")
print("\nTry waiting 10 minutes and test again, or contact Anthropic support.") 