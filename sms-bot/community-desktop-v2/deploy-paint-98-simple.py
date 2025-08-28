#!/usr/bin/env python3
"""
Simple deployment script for Paint 98 app
Updates the Paint 98 app in Supabase with new features
"""

import os
import json
import requests
from datetime import datetime

def deploy_paint_98():
    print("🎨 Deploying Paint 98 app to Supabase...")
    
    # Read environment variables
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase credentials in environment")
        return False
    
    # Read HTML file
    html_path = 'paint-98.html'
    try:
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        print(f"📄 Read HTML file: {len(html_content)} bytes")
    except FileNotFoundError:
        print(f"❌ HTML file not found: {html_path}")
        return False
    
    # Setup headers
    headers = {
        'apikey': supabase_key,
        'Authorization': f'Bearer {supabase_key}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }
    
    base_url = f"{supabase_url}/rest/v1"
    
    # Check if app exists
    check_url = f"{base_url}/wtaf_content?user_slug=eq.public&app_slug=eq.paint-98&select=id"
    
    try:
        response = requests.get(check_url, headers=headers)
        response.raise_for_status()
        existing_apps = response.json()
        
        # Prepare data
        app_data = {
            'user_slug': 'public',
            'app_slug': 'paint-98',
            'html_content': html_content,
            'original_prompt': 'Paint 98 - Retro-style Paint app with brush, spray, stamps, eraser tools, gradient colors, expanded color palette, and art gallery',
            'updated_at': datetime.utcnow().isoformat() + 'Z'
        }
        
        if existing_apps:
            # Update existing app
            print("📝 Updating existing Paint 98 app...")
            update_url = f"{base_url}/wtaf_content?user_slug=eq.public&app_slug=eq.paint-98"
            response = requests.patch(update_url, headers=headers, json=app_data)
            response.raise_for_status()
            print("✅ Updated existing app")
        else:
            # Create new app
            print("🆕 Creating new Paint 98 app...")
            app_data['created_at'] = datetime.utcnow().isoformat() + 'Z'
            create_url = f"{base_url}/wtaf_content"
            response = requests.post(create_url, headers=headers, json=app_data)
            response.raise_for_status()
            print("✅ Created new app")
        
        print("🎉 Paint 98 deployed successfully!")
        print("🔗 App URL: https://webtoys.ai/public/paint-98")
        print("")
        print("🎨 Features updated:")
        print("  - 🌈 Rainbow Gradient painting mode")
        print("  - 🎨 Expanded color palette with 48+ colors")
        print("  - 🖍️ Custom hex color input")
        print("  - Enhanced color selection interface")
        print("  - Gradient support for all tools (brush, spray, stamps)")
        print("  - 🗑️ Gallery delete functionality (restricted to user 'bart' only)")
        
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Deployment error: {e}")
        return False

if __name__ == "__main__":
    deploy_paint_98()