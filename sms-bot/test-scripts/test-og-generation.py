#!/usr/bin/env python3
"""
Test OG image generation function
"""

import requests
import json
import os
from datetime import datetime

def log_with_timestamp(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def generate_og_image_url(user_slug, app_slug):
    """Generate OG image using HTMLCSStoImage API and return the actual image URL"""
    try:
        # Use localhost for testing
        WEB_APP_URL = "http://localhost:3000"
        
        # Call our API to generate the image
        api_url = f"{WEB_APP_URL}/api/og-htmlcss?user={user_slug}&app={app_slug}"
        log_with_timestamp(f"🔗 Calling: {api_url}")
        
        response = requests.get(api_url, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('image_url'):
                log_with_timestamp(f"✅ Generated OG image: {data['image_url']}")
                return data['image_url']
        
        log_with_timestamp(f"❌ Failed to generate OG image: {response.status_code}")
        log_with_timestamp(f"📄 Response: {response.text}")
        return None
        
    except Exception as e:
        log_with_timestamp(f"❌ Error generating OG image: {e}")
        return None

if __name__ == "__main__":
    log_with_timestamp("🎨 Testing OG image generation...")
    
    # Test with different pages
    test_cases = [
        ("bart", "sapphire-elephant-dreaming"),
        ("bart", "golden-fox-painting"),
        ("lab", "test-app")
    ]
    
    for user_slug, app_slug in test_cases:
        log_with_timestamp(f"🧪 Testing: {user_slug}/{app_slug}")
        result = generate_og_image_url(user_slug, app_slug)
        
        if result:
            log_with_timestamp(f"✅ SUCCESS: {result}")
        else:
            log_with_timestamp(f"❌ FAILED for {user_slug}/{app_slug}")
        
        print("-" * 60)
