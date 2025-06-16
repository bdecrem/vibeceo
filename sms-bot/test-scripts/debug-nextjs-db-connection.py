#!/usr/bin/env python3

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

print("🔍 DEBUGGING NEXT.JS DATABASE CONNECTION MISMATCH")
print("=" * 60)

# Load environment from sms-bot
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

print(f"📄 Loading env from: {env_path}")
print(f"   - SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT SET')}")
print(f"   - SUPABASE_SERVICE_KEY: {'SET' if os.getenv('SUPABASE_SERVICE_KEY') else 'NOT SET'}")

# Check web environment too
web_env_path = Path(__file__).resolve().parent.parent.parent / 'web' / '.env.local'
if web_env_path.exists():
    print(f"\n📄 Web env file exists: {web_env_path}")
    # Read web env file
    with open(web_env_path, 'r') as f:
        web_env_content = f.read()
    
    # Check if SUPABASE URLs match
    web_lines = [line for line in web_env_content.split('\n') if 'SUPABASE_URL' in line and not line.startswith('#')]
    if web_lines:
        print(f"   - Web SUPABASE_URL: {web_lines[0]}")
    else:
        print("   - Web SUPABASE_URL: NOT FOUND")
else:
    print(f"\n❌ Web env file NOT found: {web_env_path}")

# Connect to Supabase using sms-bot credentials
try:
    supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))
    print(f"\n✅ Connected to Supabase successfully")
except Exception as e:
    print(f"\n❌ Failed to connect to Supabase: {e}")
    exit(1)

# Check ALL users with slug 'bart'
print(f"\n🔍 Searching for ALL users with slug 'bart':")
all_bart_users = supabase.table('sms_subscribers').select('*').eq('slug', 'bart').execute()

if all_bart_users.data:
    for i, user in enumerate(all_bart_users.data):
        print(f"\n   User #{i+1}:")
        print(f"     - ID: {user.get('id')}")
        print(f"     - Phone: {user.get('phone_number')}")
        print(f"     - Slug: {user.get('slug')}")
        print(f"     - Role: {user.get('role')}")
        print(f"     - Index file: {user.get('index_file', 'None')}")
        print(f"     - Created: {user.get('created_at')}")
else:
    print("   ❌ No users found with slug 'bart'")

# Check for users with similar slugs
print(f"\n🔍 Checking for similar slugs (in case of typos):")
similar_users = supabase.table('sms_subscribers').select('slug, index_file').like('slug', '%art%').execute()
for user in similar_users.data:
    print(f"   - {user.get('slug')}: {user.get('index_file', 'None')}")

# Check ALL content for user 'bart'
print(f"\n🔍 Checking ALL WTAF content for user_slug 'bart':")
bart_content = supabase.table('wtaf_content').select('app_slug, original_prompt, created_at').eq('user_slug', 'bart').order('created_at', desc=True).execute()

if bart_content.data:
    for i, content in enumerate(bart_content.data[:10]):  # Show first 10
        print(f"   {i+1}. {content['app_slug']}: {content['original_prompt'][:40]}...")
        if content['app_slug'] == 'golden-falcon-dreaming':
            print(f"      ⚠️  FOUND THE MYSTERY APP: golden-falcon-dreaming")
        if content['app_slug'] == 'sapphire-lion-exploring':
            print(f"      ✅ FOUND THE EXPECTED APP: sapphire-lion-exploring")
else:
    print("   ❌ No WTAF content found for user 'bart'")

# Test the exact query that Next.js should be making
print(f"\n🧪 Testing the EXACT query Next.js should make:")
try:
    nextjs_query = supabase.table('sms_subscribers').select('index_file').eq('slug', 'bart').single()
    result = nextjs_query.execute()
    print(f"   Query result: {result.data}")
    print(f"   Error: {result.count if hasattr(result, 'count') else 'None'}")
    
    if result.data and result.data.get('index_file'):
        expected_redirect = result.data['index_file'].replace('.html', '')
        print(f"   Expected redirect to: /wtaf/bart/{expected_redirect}")
    else:
        print(f"   No index_file found - would show default page")
        
except Exception as e:
    print(f"   ❌ Query failed: {e}")

print(f"\n💡 NEXT STEPS:")
print(f"1. Check if Next.js is using the same SUPABASE_URL")
print(f"2. Check if Next.js has SUPABASE_SERVICE_KEY set correctly")
print(f"3. Look for any hardcoded redirects in the Next.js code")
print(f"4. Check if there are multiple database connections") 