#!/usr/bin/env python3

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment
env_path = Path(__file__).resolve().parent / '.env.local'
load_dotenv(dotenv_path=env_path)

# Connect to Supabase
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

# Pages that should have been cached
featured_pages = [
    'bart/amber-eagle-soaring',
    'bart/jade-fox-flying', 
    'bart/jade-lion-climbing',
    'bart/silver-tiger-building',
    'bart/pearl-whale-dreaming',
    'bart/sapphire-bear-flying',
    'bart/bronze-deer-running',
    'bart/emerald-elephant-exploring'
]

print("🔍 Checking OG Image Status for Featured Pages...")
print("=" * 80)

for page in featured_pages:
    user_slug, app_slug = page.split('/')
    
    try:
        # Get the page data
        result = supabase.table('wtaf_content').select(
            'user_slug, app_slug, og_image_url, og_image_cached_at, created_at'
        ).eq('user_slug', user_slug).eq('app_slug', app_slug).execute()

        if result.data:
            page_data = result.data[0]
            print(f"📄 {page}")
            print(f"   📅 Created: {page_data['created_at'][:19]}")
            
            if page_data.get('og_image_url'):
                print(f"   ✅ OG Image: {page_data['og_image_url']}")
                print(f"   ⏰ Cached: {page_data['og_image_cached_at'][:19]}")
            else:
                print(f"   ❌ OG Image: NULL")
        else:
            print(f"❌ {page} - NOT FOUND in database")
        
        print()
            
    except Exception as e:
        print(f"💥 {page} - Error: {e}")
        print()

print("🎯 DIAGNOSIS:")
print("If you see NULL og_image_url values, it means:")
print("1. The bulk cache script called localhost:3000 instead of production")
print("2. Your local dev server either isn't running or has different DB credentials")  
print("3. We need to call the PRODUCTION API instead")
print()
print("🔧 SOLUTION: Run the bulk cache against production API!") 