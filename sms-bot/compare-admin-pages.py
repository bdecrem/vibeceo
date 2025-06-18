#!/usr/bin/env python3

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

print("🔍 Comparing working vs broken admin pages...")

# Get both admin pages for comparison
working = supabase.table('wtaf_content').select('app_slug, created_at, user_slug, status').eq('app_slug', 'admin-test-12345').single().execute()
broken = supabase.table('wtaf_content').select('app_slug, created_at, user_slug, status').eq('app_slug', 'admin-berghainbash_klq9se').single().execute()

print("\n✅ Working admin page (admin-test-12345):")
print(f"   URL: https://theaf-web.ngrok.io/bart/{working.data['app_slug']}")
print(f"   Status: {working.data['status']}")
print(f"   Created: {working.data['created_at']}")

print("\n❌ Broken admin page (admin-berghainbash_klq9se):")
print(f"   URL: https://theaf-web.ngrok.io/bart/{broken.data['app_slug']}")
print(f"   Status: {broken.data['status']}")
print(f"   Created: {broken.data['created_at']}")

print("\n🔍 Differences:")
print(f"   Slug length: working={len(working.data['app_slug'])}, broken={len(broken.data['app_slug'])}")
print(f"   Both have same user_slug: {working.data['user_slug'] == broken.data['user_slug']}")
print(f"   Both published: {working.data['status'] == broken.data['status'] == 'published'}")

# Check timing
public = supabase.table('wtaf_content').select('created_at').eq('app_slug', 'jade-bear-racing').single().execute()
print(f"\n⏱️ Timing analysis:")
print(f"   Public page:  {public.data['created_at']}")
print(f"   Admin page:   {broken.data['created_at']}")

print(f"\n💡 Hypothesis: Next.js development server cached 404 before admin page was created")
print(f"💡 Solution: Restart the Next.js dev server to clear runtime cache") 