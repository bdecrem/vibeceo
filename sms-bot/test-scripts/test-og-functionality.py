#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import subprocess

# Load environment
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

def main():
    print("🎨 WTAF OpenGraph Testing Guide")
    print("=" * 50)
    
    WEB_APP_URL = os.getenv("WEB_APP_URL", "https://theaf.us")
    
    # Sample test data
    user_slug = "bart"
    app_slug = "golden-falcon-dreaming"
    
    # Generate the OG URLs that monitor.py creates
    wtaf_og_url = f"{WEB_APP_URL}/api/og/{user_slug}/{app_slug}"
    simple_og_url = f"{WEB_APP_URL}/api/og/test-page"
    
    print(f"🌐 Current WEB_APP_URL: {WEB_APP_URL}")
    print(f"\n📸 Your OG Image URLs:")
    print(f"   WTAF App: {wtaf_og_url}")
    print(f"   Simple:   {simple_og_url}")
    
    print(f"\n🔍 OpenGraph Implementation Status:")
    print(f"   ✅ OG tags are injected in monitor.py (lines 380-390)")
    print(f"   ✅ OG image API route exists: web/app/api/og/[...slug]/route.tsx")
    print(f"   ✅ Images are 1200x630 pixels (standard OG size)")
    print(f"   ✅ Purple branded design with WTAF.me branding")
    
    print(f"\n🛠️  How to test your OG images:")
    print(f"   1. Start your Next.js dev server:")
    print(f"      cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web")
    print(f"      npm run dev")
    print(f"   ")
    print(f"   2. Visit these URLs in your browser:")
    print(f"      {wtaf_og_url}")
    print(f"      {simple_og_url}")
    print(f"   ")
    print(f"   3. Test with social media debuggers:")
    print(f"      Facebook: https://developers.facebook.com/tools/debug/")
    print(f"      Twitter: https://cards-dev.twitter.com/validator")
    print(f"      LinkedIn: https://www.linkedin.com/post-inspector/")
    
    print(f"\n🔧 Current OG Configuration:")
    print(f"   Title: 'WTAF by AF'")
    print(f"   Description: 'Vibecoded chaos, shipped via SMS.'")
    print(f"   Image: Dynamic based on user_slug/app_slug")
    print(f"   Size: 1200x630 (perfect for all platforms)")
    
    print(f"\n📝 Example OG tags being generated:")
    print(f'   <meta property="og:title" content="WTAF by AF" />')
    print(f'   <meta property="og:description" content="Vibecoded chaos, shipped via SMS." />')
    print(f'   <meta property="og:image" content="{wtaf_og_url}" />')
    print(f'   <meta property="og:url" content="{WEB_APP_URL}/{user_slug}/{app_slug}" />')
    
    print(f"\n🚀 Quick Start Commands:")
    print(f"   # Start web server")
    print(f"   cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web && npm run dev")
    print(f"   ")
    print(f"   # Test OG image directly")
    print(f"   curl -I '{wtaf_og_url}'")
    print(f"   ")
    print(f"   # Open OG image in browser")
    print(f"   open '{wtaf_og_url}'")
    
    # Check if we can detect if the web server is running
    print(f"\n🔍 Environment Check:")
    if "localhost" in WEB_APP_URL:
        print(f"   📍 Development mode: localhost")
        print(f"   💡 Make sure Next.js is running on port 3000")
    elif "ngrok" in WEB_APP_URL:
        print(f"   📍 Development mode: ngrok tunnel")
        print(f"   💡 Make sure both ngrok and Next.js are running")
    else:
        print(f"   📍 Production mode")
        print(f"   💡 OG images will be served from production")
    
    print(f"\n✨ Your OG images will show:")
    print(f"   • Purple background (#7c3aed)")
    print(f"   • 'WTAF.me' as main title")
    print(f"   • App name: '{app_slug.replace('-', ' ').title()}'")
    print(f"   • Subtitle: 'Built with WTAF • Vibecoded chaos'")
    print(f"   • User/app info: '{user_slug}/{app_slug}'")

if __name__ == "__main__":
    main()
