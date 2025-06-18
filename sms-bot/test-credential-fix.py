#!/usr/bin/env python3

import os
from dotenv import load_dotenv

load_dotenv('.env.local')

print("🔍 Testing credential injection...")

# Simulate the broken HTML from the party app
test_html = '''const supabase = window.supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')

            try {
                const { data, error } = await supabase.from('wtaf_submissions').insert({
                    app_id: 'brief_admin_table_id_here',
                    submission_data: formData
                })'''

print("BEFORE injection:")
print(test_html)

# Get environment variables
supabase_url = os.getenv('SUPABASE_URL', '')
supabase_anon_key = os.getenv('SUPABASE_ANON_KEY', '')

print(f"\nEnvironment variables loaded:")
print(f"URL: {supabase_url[:30]}...")
print(f"ANON_KEY: {supabase_anon_key[:20]}...")

# Apply injection logic
fixed_html = test_html.replace('YOUR_SUPABASE_URL', supabase_url)
fixed_html = fixed_html.replace('YOUR_SUPABASE_ANON_KEY', supabase_anon_key)
fixed_html = fixed_html.replace('brief_admin_table_id_here', 'berghainbash_klq9se')

print("\nAFTER injection:")
print(fixed_html)

print("\n✅ Analysis:")
print(f"URL replaced: {'YOUR_SUPABASE_URL' not in fixed_html}")
print(f"Key replaced: {'YOUR_SUPABASE_ANON_KEY' not in fixed_html}")
print(f"Admin ID replaced: {'brief_admin_table_id_here' not in fixed_html}")
print(f"Key is not empty: {supabase_anon_key != ''}")

if all([
    'YOUR_SUPABASE_URL' not in fixed_html,
    'YOUR_SUPABASE_ANON_KEY' not in fixed_html, 
    'brief_admin_table_id_here' not in fixed_html,
    supabase_anon_key != ''
]):
    print("\n🎉 CREDENTIAL INJECTION WORKING!")
else:
    print("\n❌ Credential injection still has issues") 