#!/usr/bin/env python3

import os
import requests
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

# Connect to Supabase
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

print("🔍 DEBUGGING BART'S INDEX ISSUE")
print("=" * 50)

# 1. Check what's in the database
result = supabase.table('sms_subscribers').select('*').eq('slug', 'bart').execute()
if result.data:
    user = result.data[0]
    print(f"✅ Database shows:")
    print(f"   - User slug: {user['slug']}")
    print(f"   - Index file: {user.get('index_file', 'None')}")
else:
    print("❌ No user 'bart' found in database")
    exit(1)

# 2. Check the specific content exists
expected_app_slug = user['index_file'].replace('.html', '') if user.get('index_file') else None
if expected_app_slug:
    content_result = supabase.table('wtaf_content').select('*').eq('user_slug', 'bart').eq('app_slug', expected_app_slug).execute()
    if content_result.data:
        print(f"✅ Content exists for app_slug: {expected_app_slug}")
        print(f"   - Prompt: {content_result.data[0]['original_prompt'][:50]}...")
    else:
        print(f"❌ Content NOT found for app_slug: {expected_app_slug}")

# 3. Test the URLs
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://theaf.us")
print(f"\n🌐 Testing URLs with WEB_APP_URL: {WEB_APP_URL}")

test_urls = [
    f"{WEB_APP_URL}/bart",
    f"{WEB_APP_URL}/wtaf/bart", 
    f"{WEB_APP_URL}/wtaf/bart/{expected_app_slug}" if expected_app_slug else None
]

for url in test_urls:
    if url:
        print(f"\n🧪 Testing: {url}")
        try:
            response = requests.get(url, timeout=10, allow_redirects=False)
            print(f"   Status: {response.status_code}")
            
            if response.status_code in [301, 302, 307, 308]:
                print(f"   Redirect to: {response.headers.get('Location', 'No location header')}")
            elif response.status_code == 200:
                # Check if HTML contains any recognizable content
                content = response.text[:500]
                if "sapphire-lion-exploring" in content.lower():
                    print("   ✅ Contains expected content (sapphire-lion-exploring)")
                elif "coral-dolphin-singing" in content.lower():
                    print("   ❌ Contains wrong content (coral-dolphin-singing)")  
                else:
                    print(f"   Content preview: {content[:100]}...")
        except Exception as e:
            print(f"   ❌ Error: {e}")

print(f"\n💡 SOLUTIONS TO TRY:")
print(f"1. Hard refresh (Cmd+Shift+R) to clear browser cache")
print(f"2. Try in incognito/private window")
print(f"3. Restart Next.js dev server to clear cache")
print(f"4. Visit direct URL: {WEB_APP_URL}/wtaf/bart/{expected_app_slug}") 