#!/usr/bin/env python3

import os
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

print("🔍 Checking for admin page in database...")
print("=" * 80)

# Check for the specific admin page
result = supabase.table('wtaf_content').select('*').eq('app_slug', 'admin-berghainbash_klq9se').execute()

if result.data:
    data = result.data[0]
    print(f"✅ Admin page found!")
    print(f"📋 User slug: {data['user_slug']}")
    print(f"📋 App slug: {data['app_slug']}")
    print(f"📋 Status: {data['status']}")
    print(f"📋 Created: {data['created_at']}")
    print(f"📋 HTML length: {len(data['html_content'])} characters")
    print(f"📋 Has wtaf_submissions table query: {'wtaf_submissions' in data['html_content']}")
    print(f"📋 Has Supabase credentials: {'YOUR_SUPABASE_URL' not in data['html_content']}")
    
    # Check URL construction
    expected_url = f"https://theaf-web.ngrok.io/{data['user_slug']}/{data['app_slug']}"
    print(f"📋 Expected URL: {expected_url}")
    
else:
    print("❌ Admin page not found in database")
    
    # Check for recent bart entries
    print("\n🔍 Checking recent bart entries...")
    recent = supabase.table('wtaf_content').select('user_slug, app_slug, created_at').eq('user_slug', 'bart').order('created_at', desc=True).limit(5).execute()
    
    if recent.data:
        for entry in recent.data:
            print(f"   - {entry['app_slug']} ({entry['created_at']})")
    else:
        print("   No recent bart entries found") 