#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client

# Load environment
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

# Connect to Supabase
supabase = create_client(os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_KEY'))

# Check for user with slug 'bart'
result = supabase.table('sms_subscribers').select('*').eq('slug', 'bart').execute()
if result.data:
    user = result.data[0]
    print(f'✅ Found user: {user["phone_number"]} with slug: {user["slug"]}')
    print(f'   Role: {user["role"]}')
    print(f'   Index file: {user.get("index_file", "None")}')
    
    # Check their WTAF content
    content_result = supabase.table('wtaf_content').select('app_slug, original_prompt, created_at').eq('user_slug', 'bart').order('created_at', desc=True).execute()
    if content_result.data:
        print(f'\n📄 WTAF Content for bart:')
        for item in content_result.data[:5]:  # Show first 5
            print(f'   - {item["app_slug"]}: {item["original_prompt"][:50]}...')
    else:
        print('\n📄 No WTAF content found for bart')
else:
    print('❌ No user found with slug "bart"')

# Also check for any user with phone number containing your number
print('\n🔍 Checking for users with phone numbers...')
all_users = supabase.table('sms_subscribers').select('phone_number, slug, role, index_file').execute()
for user in all_users.data:
    if user['slug']:
        print(f'   📱 {user["phone_number"]} -> slug: {user["slug"]}, role: {user["role"]}, index: {user.get("index_file", "None")}') 