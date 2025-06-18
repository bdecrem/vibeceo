#!/usr/bin/env python3

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('.env.local')
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

print('🔍 Checking new birthday party app...')

# Get recent apps from today after 4:45 PM
result = supabase.table('wtaf_content').select('app_slug, created_at, html_content').eq('user_slug', 'bart').gte('created_at', '2025-06-17T23:45:00').order('created_at', desc=True).execute()

if result.data:
    for item in result.data:
        print(f"App: {item['app_slug']}")
        print(f"Time: {item['created_at']}")
        print(f"Credentials working: {'YOUR_SUPABASE_URL' not in item['html_content']}")
        print(f"Has birthday party: {'birthday' in item['html_content'].lower()}")
        print(f"Has SoHo: {'soho' in item['html_content'].lower()}")
        
        if "admin-" in item['app_slug']:
            print(f"📊 ADMIN PAGE: https://theaf-web.ngrok.io/bart/{item['app_slug']}")
        else:
            print(f"📱 PUBLIC PAGE: https://theaf-web.ngrok.io/bart/{item['app_slug']}")
        print('---')
        
    print(f"\n✅ Found {len(result.data)} new apps!")
    
    # Check if both admin and public pages exist
    admin_count = len([app for app in result.data if 'admin-' in app['app_slug']])
    public_count = len([app for app in result.data if 'admin-' not in app['app_slug']])
    
    print(f"📊 Admin pages: {admin_count}")
    print(f"📱 Public pages: {public_count}")
    
    if admin_count > 0 and public_count > 0:
        print("🎉 DUAL-PAGE DEPLOYMENT WORKING!")
    
else:
    print('❌ No new apps found')
    
    # Check latest apps
    print('\n🔍 Checking latest 3 apps instead...')
    latest = supabase.table('wtaf_content').select('app_slug, created_at').eq('user_slug', 'bart').order('created_at', desc=True).limit(3).execute()
    
    if latest.data:
        for item in latest.data:
            print(f"  - {item['app_slug']} ({item['created_at']})")
    else:
        print("  - No apps found at all") 