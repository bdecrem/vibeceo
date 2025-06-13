#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

# Supabase setup
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

print("🔍 Checking WTAF content table for duplicates...")
print("=" * 80)

# Get recent entries
result = supabase.table('wtaf_content').select('id, created_at, user_slug, app_slug, coach, original_prompt').order('created_at', desc=True).limit(15).execute()

print(f"📊 Found {len(result.data)} recent entries:")
print()

for i, entry in enumerate(result.data):
    created_time = entry['created_at'][:19]  # Remove timezone info for readability
    user_slug = entry['user_slug']
    app_slug = entry['app_slug']
    coach = entry['coach']
    prompt = entry['original_prompt'][:60] + "..." if len(entry['original_prompt']) > 60 else entry['original_prompt']
    
    print(f"{i+1:2d}. {created_time} | {user_slug:12s} | {app_slug:20s} | {coach:8s} | {prompt}")

print()
print("🔍 Looking for patterns...")

# Group by user_slug and original_prompt to find duplicates
from collections import defaultdict
duplicates = defaultdict(list)

for entry in result.data:
    key = (entry['user_slug'], entry['original_prompt'])
    duplicates[key].append(entry)

print()
print("🚨 Duplicate groups (same user + same prompt):")
for key, entries in duplicates.items():
    if len(entries) > 1:
        user_slug, prompt = key
        print(f"\n👤 User: {user_slug}")
        print(f"📝 Prompt: {prompt[:80]}...")
        print(f"🔄 Count: {len(entries)} duplicates")
        for entry in entries:
            print(f"   - {entry['created_at'][:19]} | {entry['app_slug']}") 