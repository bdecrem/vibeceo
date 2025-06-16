#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import requests

# Load environment
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

# Get current configuration  
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://theaf.us")

print("🧪 OG Image URL Testing")
print("=" * 50)

print(f"🌐 Current WEB_APP_URL: {WEB_APP_URL}")

# Test URL generation (same logic as monitor.py)
user_slug = "bart"
app_slug = "golden-falcon-dreaming"
single_slug = "test-page"

# Generate URLs like monitor.py does
wtaf_og_url = f"{WEB_APP_URL}/api/og/{user_slug}/{app_slug}"
lab_og_url = f"{WEB_APP_URL}/api/og/{single_slug}"

print(f"\n📸 Generated OG Image URLs:")
print(f"   WTAF content: {wtaf_og_url}")
print(f"   Lab content:  {lab_og_url}")

# Check if URLs are accessible (without actually starting servers)
print(f"\n🔍 URL Analysis:")

# Check if pointing to localhost/ngrok (development)
if "localhost" in WEB_APP_URL or "ngrok" in WEB_APP_URL:
    print("✅ Development mode detected")
    print("   → OG images should work if your Next.js dev server is running")
    
    # Extract expected dev URLs
    if "ngrok" in WEB_APP_URL:
        print(f"   → Expected: Web server running at {WEB_APP_URL}")
        print(f"   → Expected: SMS bot running at https://theaf-sms.ngrok.io")
    else:
        print(f"   → Expected: Web server running at {WEB_APP_URL}")
        print(f"   → Expected: SMS bot running at http://localhost:3030")
        
else:
    print("⚠️  Production mode detected")
    print("   → OG images pointing to production server")
    print("   → For local development, set WEB_APP_URL in .env.local")

# Test the URL structure expected by the API route
print(f"\n🛤️  API Route Analysis:")
print(f"   API route: web/app/api/og/[...slug]/route.tsx")
print(f"   WTAF URL: {wtaf_og_url}")
print(f"   → Slug array: ['{user_slug}', '{app_slug}']")
print(f"   Lab URL: {lab_og_url}")
print(f"   → Slug array: ['{single_slug}']")

# Recommendations
print(f"\n💡 Troubleshooting Steps:")
print("1. Verify your .env.local has the correct WEB_APP_URL")

if "localhost" in WEB_APP_URL:
    print("   Add: WEB_APP_URL=http://localhost:3000")
elif "ngrok" in WEB_APP_URL:
    print("   Add: WEB_APP_URL=https://theaf-web.ngrok.io")
else:
    print("   For ngrok: WEB_APP_URL=https://theaf-web.ngrok.io")
    print("   For localhost: WEB_APP_URL=http://localhost:3000")

print("2. Make sure your Next.js web server is running on port 3000")
print("3. Test OG image directly by visiting one of the URLs above")
print("4. Check the console logs in monitor.py for the actual URLs being generated")

print(f"\n🧪 Quick Test Commands:")
print(f"   curl -I '{wtaf_og_url}'")
print(f"   curl -I '{lab_og_url}'")

print(f"\n📝 Example .env.local entry:")
print(f"WEB_APP_URL=https://theaf-web.ngrok.io") 