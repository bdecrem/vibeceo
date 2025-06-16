#!/usr/bin/env python3
"""
Test HTMLCSStoImage API for OG image generation
"""

import requests
import json
import base64
import os
from datetime import datetime

def test_htmlcss_og():
    """Test HTMLCSStoImage API with WTAF OG template"""
    
    print("🎨 Testing HTMLCSStoImage API for OG generation...")
    
    # HTML template for OG image
    html_template = """
    <div style="
        width: 1200px;
        height: 630px;
        background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: relative;
        overflow: hidden;
    ">
        <div style="
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 30px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">
            WTAF.me
        </div>
        
        <div style="
            font-size: 36px;
            font-weight: 600;
            margin-bottom: 20px;
            text-align: center;
            max-width: 800px;
            line-height: 1.2;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        ">
            Sapphire Elephant Dreaming
        </div>
        
        <div style="
            font-size: 20px;
            opacity: 0.9;
            text-align: center;
            margin-bottom: 30px;
        ">
            Vibecoded chaos, shipped via SMS
        </div>
        
        <div style="
            font-size: 16px;
            opacity: 0.7;
            font-family: monospace;
        ">
            wtaf.me/bart/sapphire-elephant-dreaming
        </div>
        
        <!-- Decorative elements -->
        <div style="
            position: absolute;
            top: -50px;
            right: -50px;
            width: 200px;
            height: 200px;
            background: rgba(255,255,255,0.1);
            border-radius: 50%;
        "></div>
        
        <div style="
            position: absolute;
            bottom: -30px;
            left: -30px;
            width: 150px;
            height: 150px;
            background: rgba(255,255,255,0.05);
            border-radius: 50%;
        "></div>
    </div>
    """
    
    # API payload
    payload = {
        "html": html_template,
        "viewport_width": 1200,
        "viewport_height": 630,
        "device_scale_factor": 1
    }
    
    print("📤 Sending request to HTMLCSStoImage...")
    print("🔗 URL: https://hcti.io/v1/image")
    print("📝 Payload size:", len(json.dumps(payload)), "characters")
    
    try:
        # Make request to HTMLCSStoImage API
        # NOTE: This will fail without API credentials, but shows the structure
        response = requests.post(
            'https://hcti.io/v1/image',
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"📊 Response status: {response.status_code}")
        print(f"📊 Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCCESS!")
            print(f"🖼️  Image URL: {data.get('url', 'No URL returned')}")
            
            # Try to download the image
            if 'url' in data:
                img_response = requests.get(data['url'])
                if img_response.status_code == 200:
                    filename = f"htmlcss-og-test-{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                    with open(filename, 'wb') as f:
                        f.write(img_response.content)
                    print(f"💾 Image saved as: {filename}")
                    print(f"📏 Image size: {len(img_response.content)} bytes")
                else:
                    print(f"❌ Failed to download image: {img_response.status_code}")
        
        elif response.status_code == 401:
            print("🔑 AUTHENTICATION REQUIRED")
            print("📋 You need to sign up at https://htmlcsstoimage.com/")
            print("📋 Get your User ID and API Key")
            print("📋 Then add them to the script")
            
        else:
            print(f"❌ API Error: {response.status_code}")
            print(f"📄 Response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
    
    print("\n" + "="*60)
    print("📋 NEXT STEPS:")
    print("1. Sign up at https://htmlcsstoimage.com/")
    print("2. Get your free API credentials (50 images/month)")
    print("3. Add credentials to your environment variables")
    print("4. Test this script again")
    print("5. Integrate into your WTAF monitor.py")
    print("="*60)

if __name__ == "__main__":
    test_htmlcss_og()
