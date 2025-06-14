#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

print("🔍 Testing environment loading like monitor.py does...")

# Test 1: From sms-bot directory (like our test scripts)
print("\n1️⃣ Loading from sms-bot directory:")
env_path1 = Path(__file__).resolve().parent.parent / ".env.local"
print(f"   Path: {env_path1}")
print(f"   Exists: {env_path1.exists()}")

load_dotenv(dotenv_path=env_path1)
key1 = os.getenv('ANTHROPIC_API_KEY')
print(f"   Key: {key1[:15] if key1 else 'None'}...{key1[-10:] if key1 else 'None'}")

# Clear environment
if 'ANTHROPIC_API_KEY' in os.environ:
    del os.environ['ANTHROPIC_API_KEY']

# Test 2: From project root (like monitor.py when run from root)
print("\n2️⃣ Loading from project root:")
env_path2 = Path(__file__).resolve().parent.parent.parent / "sms-bot" / ".env.local"
print(f"   Path: {env_path2}")
print(f"   Exists: {env_path2.exists()}")

load_dotenv(dotenv_path=env_path2)
key2 = os.getenv('ANTHROPIC_API_KEY')
print(f"   Key: {key2[:15] if key2 else 'None'}...{key2[-10:] if key2 else 'None'}")

# Test 3: Check current working directory
print(f"\n3️⃣ Current working directory: {os.getcwd()}")

# Test 4: Check if keys are the same
if key1 and key2:
    print(f"\n4️⃣ Keys match: {key1 == key2}")
else:
    print(f"\n4️⃣ One or both keys are None")

# Test 5: Manual file read
print(f"\n5️⃣ Manual file read:")
try:
    with open(env_path1, 'r') as f:
        content = f.read()
        for line in content.split('\n'):
            if 'ANTHROPIC_API_KEY' in line:
                print(f"   Found line: {line[:30]}...")
                break
except Exception as e:
    print(f"   Error reading file: {e}")

print(f"\n🎯 Recommendation:")
print(f"   Monitor.py should use: {env_path1}")
print(f"   Current monitor.py uses: Path(__file__).resolve().parent.parent / '.env.local'")
print(f"   These should be the same path.") 