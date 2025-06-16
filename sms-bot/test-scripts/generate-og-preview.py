#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import requests
from PIL import Image, ImageDraw, ImageFont
import io

# Load environment
env_path = Path(__file__).resolve().parent.parent / '.env.local'
load_dotenv(dotenv_path=env_path)

def create_og_image(user_slug="bart", app_slug="golden-falcon-dreaming"):
    """Create an OpenGraph preview image similar to the Next.js API route"""
    
    # Image dimensions (standard OG size)
    width, height = 1200, 630
    
    # Create image with purple background (matching the Next.js route)
    img = Image.new('RGB', (width, height), color='#7c3aed')
    draw = ImageDraw.Draw(img)
    
    try:
        # Try to use a system font
        title_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 48)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 32)
        small_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 18)
        tiny_font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 16)
    except:
        # Fallback to default font
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
        tiny_font = ImageFont.load_default()
    
    # Generate title from app slug (same logic as Next.js route)
    if app_slug == 'wtaf-app':
        app_title = 'WTAF Creation'
    else:
        app_title = app_slug.replace('-', ' ').title()
    
    # Draw text elements (matching the Next.js layout)
    
    # Main title "WTAF.me"
    title_text = "WTAF.me"
    title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
    title_width = title_bbox[2] - title_bbox[0]
    draw.text(((width - title_width) // 2, 150), title_text, fill='white', font=title_font)
    
    # App title
    app_bbox = draw.textbbox((0, 0), app_title, font=subtitle_font)
    app_width = app_bbox[2] - app_bbox[0]
    draw.text(((width - app_width) // 2, 230), app_title, fill='white', font=subtitle_font)
    
    # Subtitle
    subtitle = "Built with WTAF • Vibecoded chaos"
    sub_bbox = draw.textbbox((0, 0), subtitle, font=small_font)
    sub_width = sub_bbox[2] - sub_bbox[0]
    draw.text(((width - sub_width) // 2, 320), subtitle, fill='rgba(255,255,255,0.8)', font=small_font)
    
    # Slug info
    slug_info = f"{user_slug}/{app_slug}"
    slug_bbox = draw.textbbox((0, 0), slug_info, font=tiny_font)
    slug_width = slug_bbox[2] - slug_bbox[0]
    draw.text(((width - slug_width) // 2, 380), slug_info, fill='rgba(255,255,255,0.6)', font=tiny_font)
    
    return img

def main():
    print("🎨 OpenGraph Image Generator")
    print("=" * 50)
    
    # Test with sample data
    user_slug = "bart"
    app_slug = "golden-falcon-dreaming"
    
    print(f"📝 Generating OG image for: {user_slug}/{app_slug}")
    
    # Create the image
    og_image = create_og_image(user_slug, app_slug)
    
    # Save the image
    output_path = Path(__file__).parent / f"og-preview-{user_slug}-{app_slug}.png"
    og_image.save(output_path)
    
    print(f"✅ OG image saved to: {output_path}")
    print(f"📏 Image size: {og_image.size[0]}x{og_image.size[1]} pixels")
    
    # Also create a simple test image
    simple_img = create_og_image("test-user", "awesome-app")
    simple_path = Path(__file__).parent / "og-preview-simple.png"
    simple_img.save(simple_path)
    
    print(f"✅ Simple test image saved to: {simple_path}")
    
    print(f"\n🖼️  How to view your OG images:")
    print(f"   1. Open Finder and navigate to: {Path(__file__).parent}")
    print(f"   2. Double-click on the .png files to view them")
    print(f"   3. Or run: open '{output_path}'")
    
    print(f"\n🌐 Your WTAF OG API URLs:")
    WEB_APP_URL = os.getenv("WEB_APP_URL", "https://theaf.us")
    print(f"   {WEB_APP_URL}/api/og/{user_slug}/{app_slug}")
    print(f"   {WEB_APP_URL}/api/og/test-user/awesome-app")
    
    print(f"\n💡 Next steps:")
    print(f"   1. Start your Next.js dev server: npm run dev")
    print(f"   2. Visit the API URLs above to see live OG images")
    print(f"   3. Test with Facebook's debugger: https://developers.facebook.com/tools/debug/")

if __name__ == "__main__":
    main()
