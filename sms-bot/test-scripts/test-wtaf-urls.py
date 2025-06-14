#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

# Get current configuration
WEB_APP_URL = os.getenv("WEB_APP_URL", "https://theaf.us")

# WTAF domain configuration - environment-aware
if "localhost" in WEB_APP_URL or "ngrok" in WEB_APP_URL:
    WTAF_DOMAIN = WEB_APP_URL
    print("🔧 Development mode: Using WEB_APP_URL for WTAF domain")
else:
    WTAF_DOMAIN = os.getenv("WTAF_DOMAIN", "https://www.wtaf.me")
    print("🚀 Production mode: Using dedicated WTAF domain")

print(f"🌐 WEB_APP_URL: {WEB_APP_URL}")
print(f"🌐 WTAF_DOMAIN: {WTAF_DOMAIN}")

# Test URL generation
user_slug = "bart"
app_slug = "golden-falcon-dreaming"

public_url = f"{WTAF_DOMAIN}/{user_slug}/{app_slug}"
print(f"\n📱 SMS URL that would be sent: {public_url}")

# Test different scenarios
print(f"\n🧪 URL Test Scenarios:")
print(f"   User index page: {WTAF_DOMAIN}/{user_slug}")
print(f"   Specific app: {WTAF_DOMAIN}/{user_slug}/{app_slug}")
print(f"   Homepage: {WTAF_DOMAIN}/")

# Check if this is development
if "localhost" in WEB_APP_URL or "ngrok" in WEB_APP_URL:
    print(f"\n🔧 Development URLs:")
    print(f"   Direct Next.js route: {WEB_APP_URL}/wtaf/{user_slug}")
    print(f"   Direct app route: {WEB_APP_URL}/wtaf/{user_slug}/{app_slug}") 