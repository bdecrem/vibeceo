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

print(f"🔑 Testing API key: {anthropic_api_key[:10]}...")

# Test the Claude API with a simple request
headers = {
    "Authorization": f"Bearer {anthropic_api_key}",
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01"
}

payload = {
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 100,
    "temperature": 0.7,
    "system": "You are a helpful assistant.",
    "messages": [
        {
            "role": "user",
            "content": "Hello, can you respond with just 'API test successful'?"
        }
    ]
}

try:
    print("🧪 Making test API call...")
    response = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload)
    
    print(f"📊 Response status: {response.status_code}")
    print(f"📋 Response headers: {dict(response.headers)}")
    
    if response.status_code == 200:
        result = response.json()
        print("✅ API call successful!")
        print(f"📝 Response: {result}")
    else:
        print("❌ API call failed!")
        print(f"📝 Error response: {response.text}")
        
except Exception as e:
    print(f"💥 Exception during API call: {e}") 