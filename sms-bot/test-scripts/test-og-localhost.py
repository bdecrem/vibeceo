#!/usr/bin/env python3

import requests
import time
import subprocess
import os
from pathlib import Path

def test_localhost_og():
    """Test OG image generation on localhost"""
    
    print("🧪 SIMPLEST OG Test - Localhost Only")
    print("=" * 50)
    
    # Test URLs for localhost
    localhost_urls = [
        "http://localhost:3000/api/og/test/simple",
        "http://localhost:3000/api/og/bart/golden-falcon-dreaming"
    ]
    
    print("📋 Testing these OG image URLs:")
    for url in localhost_urls:
        print(f"   {url}")
    
    print(f"\n🚀 Step 1: Checking if Next.js is running...")
    
    try:
        # Quick check if localhost:3000 is responding
        response = requests.get("http://localhost:3000", timeout=2)
        print(f"✅ Next.js server is running on localhost:3000")
        
        print(f"\n🖼️  Step 2: Testing OG image generation...")
        
        for i, url in enumerate(localhost_urls, 1):
            try:
                print(f"\n   Test {i}: {url}")
                
                # Make request to OG endpoint
                og_response = requests.get(url, timeout=5)
                
                if og_response.status_code == 200:
                    print(f"   ✅ SUCCESS! Status: {og_response.status_code}")
                    print(f"   📏 Content-Length: {len(og_response.content)} bytes")
                    print(f"   📄 Content-Type: {og_response.headers.get('content-type', 'unknown')}")
                    
                    # Save the image to verify it's actually an image
                    filename = f"og-test-{i}.png"
                    filepath = Path(__file__).parent / filename
                    
                    with open(filepath, 'wb') as f:
                        f.write(og_response.content)
                    
                    print(f"   💾 Saved image to: {filepath}")
                    print(f"   🖼️  Open with: open '{filepath}'")
                    
                else:
                    print(f"   ❌ FAILED! Status: {og_response.status_code}")
                    print(f"   📄 Response: {og_response.text[:200]}...")
                    
            except requests.exceptions.RequestException as e:
                print(f"   ❌ REQUEST FAILED: {e}")
        
        print(f"\n🎯 SUMMARY:")
        print(f"   If you see ✅ SUCCESS above, your OG images are working!")
        print(f"   Check the saved .png files in: {Path(__file__).parent}")
        
    except requests.exceptions.RequestException:
        print(f"❌ Next.js server is NOT running on localhost:3000")
        print(f"\n🚀 TO FIX THIS:")
        print(f"   1. Open a new terminal")
        print(f"   2. cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web")
        print(f"   3. npm run dev")
        print(f"   4. Wait for 'Ready' message")
        print(f"   5. Run this script again")
        
        return False
    
    return True

if __name__ == "__main__":
    test_localhost_og()
