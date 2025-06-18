#!/usr/bin/env python3

import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client
import re

# Load environment variables
env_path = Path(__file__).resolve().parent / ".env.local"
load_dotenv(dotenv_path=env_path)

# Supabase setup
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(supabase_url, supabase_key)

print("🔍 DEBUGGING PARTY APP FORM ISSUE")
print("=" * 60)

# Get public page HTML
print("1. 🔍 Checking PUBLIC PAGE (jade-bear-racing)...")
public = supabase.table('wtaf_content').select('html_content').eq('app_slug', 'jade-bear-racing').single().execute()
public_html = public.data['html_content']

# Look for form submission code
print("   ✅ Form element found:", '<form' in public_html)
print("   ✅ wtaf_submissions table:", 'wtaf_submissions' in public_html)
print("   ✅ Supabase createClient:", 'createClient(' in public_html)

# Find the app_id being used
lines = public_html.split('\n')
for i, line in enumerate(lines):
    if 'wtaf_submissions' in line and 'insert' in line:
        print(f"   📋 Insert call found at line {i+1}")
        # Show context around the insert call
        for j in range(max(0, i-2), min(len(lines), i+5)):
            prefix = ">>>" if j == i else "   "
            print(f"   {prefix} L{j+1}: {lines[j].strip()}")
        break

print()

# Get admin page HTML  
print("2. 🔍 Checking ADMIN PAGE (admin-berghainbash_klq9se)...")
admin = supabase.table('wtaf_content').select('html_content').eq('app_slug', 'admin-berghainbash_klq9se').single().execute()
admin_html = admin.data['html_content']

print("   ✅ Admin page exists in DB:", admin.data is not None)
print("   ✅ wtaf_submissions query:", 'wtaf_submissions' in admin_html)
print("   ✅ Supabase createClient:", 'createClient(' in admin_html)

# Check if web app supports admin-* routing
print()
print("3. 🔍 CHECKING WEB APP ROUTING...")
print("   📋 Public URL: https://theaf-web.ngrok.io/bart/jade-bear-racing (✅ working)")
print("   📋 Admin URL: https://theaf-web.ngrok.io/bart/admin-berghainbash_klq9se (❌ 404)")
print("   📋 Issue: Web app might not handle 'admin-*' slugs correctly")

print()
print("4. 🔍 POTENTIAL FIXES NEEDED:")
print("   🔧 1. Check if form has JavaScript errors (console.log)")
print("   🔧 2. Check if web app routing supports admin-* slugs")
print("   🔧 3. Test form submission manually")
print("   🔧 4. Check browser dev tools for API errors")

print()
print("5. 🔍 QUICK TESTS:")
print("   🧪 Test wtaf_submissions table access...")

# Test if we can insert directly
try:
    test_data = {
        'app_id': 'test-party-app',
        'submission_data': {'name': 'Test User', 'email': 'test@example.com', 'timeSlot': '23:00'}
    }
    result = supabase.table('wtaf_submissions').insert(test_data).execute()
    if result.data:
        print("   ✅ Direct insert works - form issue is frontend/JS")
        # Clean up test data
        supabase.table('wtaf_submissions').delete().eq('app_id', 'test-party-app').execute()
    else:
        print("   ❌ Direct insert failed - database issue")
except Exception as e:
    print(f"   ❌ Database error: {e}") 