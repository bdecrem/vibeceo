#!/usr/bin/env python3

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
env_path = Path(__file__).resolve().parent / ".env.local"
load_dotenv(dotenv_path=env_path)

# Supabase setup
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

print("🔍 Simulating Next.js query for admin page...")

# This is the exact query that Next.js makes in [user_slug]/[app_slug]/page.tsx
query = supabase.from('wtaf_content')
query = query.select('html_content, coach, original_prompt, created_at')
query = query.eq('user_slug', 'bart')
query = query.eq('app_slug', 'admin-berghainbash_klq9se')
query = query.eq('status', 'published')
result = query.execute()

print(f"Query successful: {not bool(result.error) if hasattr(result, 'error') else True}")

if result.data:
    print(f"✅ Records found: {len(result.data)}")
    print(f"✅ HTML length: {len(result.data[0]['html_content'])}")
    print("✅ Query returns data - web app should work")
else:
    print("❌ No records found")
    if hasattr(result, 'error') and result.error:
        print(f"❌ Error: {result.error}")

print()
print("🔍 Double-checking with simpler query...")
simple_result = supabase.table('wtaf_content').select('*').eq('app_slug', 'admin-berghainbash_klq9se').execute()
print(f"Simple query finds record: {bool(simple_result.data)}")

if simple_result.data:
    record = simple_result.data[0]
    print(f"  user_slug: '{record['user_slug']}'")
    print(f"  app_slug: '{record['app_slug']}'") 
    print(f"  status: '{record['status']}'") 