#!/usr/bin/env python3
import os
from supabase import create_client
from dotenv import load_dotenv

# Load environment variables
load_dotenv(dotenv_path="../.env.local")

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

app_slug = "linen-baboon-nurturing"
user_slug = "bart"

print(f"🔍 Checking {user_slug}/{app_slug}...")

# Check wtaf_content table
result = supabase.table('wtaf_content').select('*').eq('user_slug', user_slug).eq('app_slug', app_slug).execute()

if result.data:
    app = result.data[0]
    print(f"✅ Found app in database:")
    print(f"   📝 Type: {app.get('type')}")
    print(f"   🎨 Coach: {app.get('coach')}")
    print(f"   🖼️ OG Image URL: {app.get('og_image_url')}")
    print(f"   📅 Created: {app.get('created_at')}")
    print(f"   💬 Prompt: {app.get('original_prompt', 'No prompt')[:100]}...")
    
    # Check if HTML contains meme content
    html_content = app.get('html_content', '')
    if 'meme-container' in html_content:
        print(f"   🎭 HTML contains meme content: YES")
    else:
        print(f"   🎭 HTML contains meme content: NO")
        
    # Check for meme image URLs in HTML
    import re
    meme_images = re.findall(r'meme-\d+-[a-z0-9]+\.png', html_content)
    if meme_images:
        print(f"   🖼️ Meme images in HTML: {meme_images}")
    else:
        print(f"   🖼️ No meme images found in HTML")
        
else:
    print("❌ App not found in database!") 