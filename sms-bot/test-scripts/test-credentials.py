#!/usr/bin/env python3

import sys
import os
sys.path.append('./scripts')
from dotenv import load_dotenv

load_dotenv('.env.local')

# Import the function from monitor.py
from monitor import inject_supabase_credentials

print("🔍 Testing credential injection function...")

test_html = '''const supabase = window.supabase.createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY')

app_id: 'brief_admin_table_id_here','''

print("BEFORE injection:")
print(test_html)

print("\nEnvironment variables:")
print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT_FOUND')[:30]}...")
print(f"SUPABASE_ANON_KEY: {os.getenv('SUPABASE_ANON_KEY', 'NOT_FOUND')}")
print(f"SUPABASE_SERVICE_KEY: {os.getenv('SUPABASE_SERVICE_KEY', 'NOT_FOUND')[:30]}...")

fixed_html = inject_supabase_credentials(test_html)

print("\nAFTER injection:")
print(fixed_html)

print("\n🔍 Analysis:")
print(f"URL replaced: {'YOUR_SUPABASE_URL' not in fixed_html}")
print(f"Key replaced: {'YOUR_SUPABASE_ANON_KEY' not in fixed_html}")
print("Key is not empty:", "''" not in fixed_html and '""' not in fixed_html) 