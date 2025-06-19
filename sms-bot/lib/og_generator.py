"""
OpenGraph Image Generator - Standalone module for generating and caching OG images

This module provides a clean interface for generating OpenGraph images using HTMLCSStoImage API
and caching them in Supabase Storage for high performance.

Usage:
    from lib.og_generator import generate_cached_og_image

    image_url = generate_cached_og_image("crimson-jaguar", "dancing-app")
"""

import os
import re
import base64
import requests
import json
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

class OGImageGenerator:
    def __init__(self):
        """Initialize the OG Image Generator with Supabase and HTMLCSStoImage credentials"""
        # Supabase setup
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

        if not self.supabase_url or not self.supabase_key:
            raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables")

        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

        # HTMLCSStoImage credentials
        self.htmlcss_user_id = os.getenv("HTMLCSS_USER_ID")
        self.htmlcss_api_key = os.getenv("HTMLCSS_API_KEY")

        if not self.htmlcss_user_id or not self.htmlcss_api_key:
            raise ValueError("Missing HTMLCSS_USER_ID or HTMLCSS_API_KEY environment variables")

    def log_with_timestamp(self, message):
        """Log message with timestamp"""
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")

    def extract_main_title(self, html_content):
        """Extract the main title from HTML content with enhanced priority"""
        # Try to find h1 tag first (highest priority)
        h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', html_content, re.IGNORECASE | re.DOTALL)
        if h1_match:
            title = re.sub(r'<[^>]*>', '', h1_match.group(1)).strip()
            if title and len(title) > 2:
                return title

        # Try to find any heading tag (h2, h3, etc.)
        heading_match = re.search(r'<h[2-6][^>]*>(.*?)</h[2-6]>', html_content, re.IGNORECASE | re.DOTALL)
        if heading_match:
            title = re.sub(r'<[^>]*>', '', heading_match.group(1)).strip()
            if title and len(title) > 2 and 'WTAF' not in title:
                return title

        # Try title tag as fallback
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html_content, re.IGNORECASE | re.DOTALL)
        if title_match:
            title = re.sub(r'<[^>]*>', '', title_match.group(1)).strip()
            if title and 'WTAF' not in title and len(title) > 2:
                return title

        return "WTAF Creation"

    def extract_background_gradient(self, html_content):
        """Extract the main background gradient from HTML/CSS content"""
        # Look for linear-gradient patterns in the HTML/CSS
        gradient_patterns = [
            r'background:\s*linear-gradient\([^)]+\)',
            r'background-image:\s*linear-gradient\([^)]+\)',
            r'background:\s*linear-gradient\([^;]+\);',
        ]

        for pattern in gradient_patterns:
            matches = re.findall(pattern, html_content, re.IGNORECASE)
            if matches:
                # Return the first gradient found
                gradient = matches[0]
                # Clean up the CSS property name, keep only the gradient value
                gradient = re.sub(r'^background(-image)?:\s*', '', gradient)
                gradient = gradient.rstrip(';')
                return gradient

        # Look for specific color themes and provide appropriate gradients
        html_lower = html_content.lower()

        # Hot pink theme
        if '#ff69b4' in html_lower or '#ff1493' in html_lower or 'hotpink' in html_lower:
            return 'linear-gradient(45deg, #ff69b4, #ff1493, #ff69b4, #ff1493)'

        # Red theme
        if '#ff0000' in html_lower or 'background: red' in html_lower:
            return 'linear-gradient(-45deg, #FF0000, #FF4D4D, #800000, #2B0000)'

        # Rainbow/multi-color theme
        if ('#ff6b6b' in html_lower and '#ffd93d' in html_lower) or 'rainbow' in html_lower:
            return 'linear-gradient(45deg, #ff6b6b, #ffd93d, #6bcaff, #b66bff)'

        # Pastel theme
        if '#ffd6a5' in html_lower or 'pastel' in html_lower:
            return 'linear-gradient(45deg, #ffd6a5, #ffb4a2, #e7c6ff, #b5deff)'

        # Purple theme
        if '#610c6f' in html_lower or '#2d0a3e' in html_lower or 'purple' in html_lower:
            return 'linear-gradient(240deg, #1a1a1a, #2d0a3e, #610c6f, #1a1a1a)'

        # Orange/warm theme
        if '#ff4b2b' in html_lower or '#ff416c' in html_lower:
            return 'linear-gradient(-45deg, #FF4B2B, #FF416C, #FFA41B, #FFD93D)'

        # Blue/professional theme
        if '#1e3c72' in html_lower or '#2a5298' in html_lower or 'business' in html_lower:
            return 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'

        # Default gradient
        return 'linear-gradient(135deg, #14b8a6, #0891b2)'

    def analyze_content_for_theme(self, html_content, title):
        """Analyze content to determine theme for emoji selection"""
        content_lower = html_content.lower() + ' ' + title.lower()

        # Business/Professional
        business_keywords = ['business', 'corporate', 'professional', 'company', 'office', 'meeting', 'strategy']
        if any(keyword in content_lower for keyword in business_keywords):
            return 'business'

        # Gaming/Tech
        gaming_keywords = ['game', 'gaming', 'tech', 'app', 'software', 'code', 'digital']
        if any(keyword in content_lower for keyword in gaming_keywords):
            return 'gaming'

        # Food/Restaurant
        food_keywords = ['food', 'restaurant', 'cafe', 'kitchen', 'recipe', 'cooking', 'dining']
        if any(keyword in content_lower for keyword in food_keywords):
            return 'food'

        # Pets/Animals
        pet_keywords = ['dog', 'cat', 'pet', 'animal', 'puppy', 'kitten', 'paws', 'furry']
        if any(keyword in content_lower for keyword in pet_keywords):
            return 'pets'

        # Beauty/Fashion
        beauty_keywords = ['beauty', 'fashion', 'style', 'makeup', 'skincare', 'luxury', 'elegant']
        if any(keyword in content_lower for keyword in beauty_keywords):
            return 'beauty'

        # Creative/Art
        creative_keywords = ['art', 'creative', 'design', 'music', 'paint', 'draw', 'artist']
        if any(keyword in content_lower for keyword in creative_keywords):
            return 'creative'

        # Health/Fitness
        health_keywords = ['health', 'fitness', 'gym', 'workout', 'wellness', 'medical', 'doctor']
        if any(keyword in content_lower for keyword in health_keywords):
            return 'health'

        # Peace/Spiritual
        peace_keywords = ['peace', 'zen', 'meditation', 'spiritual', 'calm', 'mindful']
        if any(keyword in content_lower for keyword in peace_keywords):
            return 'peace'

        return 'general'

    def generate_relevant_emojis(self, title, html_content):
        """Generate contextually relevant emojis based on content analysis"""
        theme = self.analyze_content_for_theme(html_content, title)

        emoji_sets = {
            'business': ['💼', '📈', '🏢', '💰', '⭐', '🎯'],
            'gaming': ['🎮', '🕹️', '⚡', '🎯', '🚀', '💫'],
            'food': ['🍽️', '🥘', '🍕', '☕', '🍰', '✨'],
            'pets': ['🐕', '🐱', '🌸', '✨', '🎨', '💖'],
            'beauty': ['💄', '✨', '🌸', '💎', '🦋', '🌺'],
            'creative': ['🎨', '✨', '🖌️', '🌈', '💫', '🎭'],
            'health': ['💚', '🏃', '✨', '🌱', '💪', '🧘'],
            'peace': ['☮️', '🕊️', '✨', '🌸', '🙏', '💙'],
            'general': ['⚡', '🚀', '✨', '💫', '🌟', '💎']
        }

        selected_emojis = emoji_sets.get(theme, emoji_sets['general'])

        # Return the first 4 emojis for floating elements
        return selected_emojis[:4]

    def create_simplified_og_template(self, title, gradient, emojis, user_slug, app_slug):
        """Create a simplified, glass morphism OG image template"""

        # Adjust font size based on title length
        if len(title) > 40:
            title_font_size = '2.8rem'
        elif len(title) > 25:
            title_font_size = '3.2rem'
        else:
            title_font_size = '3.8rem'

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600&display=swap');

                body {{
                    margin: 0;
                    font-family: 'Inter', sans-serif;
                    width: 1200px;
                    height: 675px;
                    background: {gradient};
                    background-size: 400% 400%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    overflow: hidden;
                    animation: gradientShift 15s ease infinite;
                }}

                @keyframes gradientShift {{
                    0%, 100% {{ background-position: 0% 50%; }}
                    50% {{ background-position: 100% 50%; }}
                }}

                @keyframes float {{
                    0%, 100% {{ transform: translateY(0px) rotate(0deg); }}
                    50% {{ transform: translateY(-12px) rotate(3deg); }}
                }}

                .floating-emoji {{
                    position: absolute;
                    font-size: 3rem;
                    opacity: 0.4;
                    animation: float 6s ease-in-out infinite;
                    z-index: 1;
                }}

                .floating-emoji.front {{
                    z-index: 3;
                    opacity: 0.6;
                }}

                #emoji1 {{ top: 12%; left: 8%; animation-delay: 0s; }}
                #emoji2 {{ top: 18%; right: 10%; animation-delay: 2s; }}
                #emoji3 {{ bottom: 18%; left: 12%; animation-delay: 1s; }}
                #emoji4 {{ bottom: 12%; right: 8%; animation-delay: 3s; }}

                .glass-container {{
                    background: rgba(255, 255, 255, 0.25);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 35px;
                    padding: 60px 50px;
                    text-align: center;
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                    max-width: 900px;
                    width: 85%;
                    position: relative;
                    z-index: 2;
                }}

                .main-title {{
                    font-family: 'Space Grotesk', sans-serif;
                    font-size: {title_font_size};
                    font-weight: 700;
                    line-height: 1.1;
                    margin-bottom: 30px;
                    color: rgba(255, 255, 255, 0.95);
                    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
                    letter-spacing: -1px;
                    position: relative;
                    z-index: 4;
                }}

                .brand-tag {{
                    font-family: 'Space Grotesk', sans-serif;
                    font-size: 1.4rem;
                    font-weight: 500;
                    color: rgba(255, 255, 255, 0.8);
                    margin-bottom: 25px;
                    letter-spacing: 1px;
                }}

                .url-display {{
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 1.1rem;
                    color: rgba(255, 255, 255, 0.7);
                    background: rgba(255, 255, 255, 0.15);
                    padding: 12px 24px;
                    border-radius: 15px;
                    display: inline-block;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    margin-top: 10px;
                }}
            </style>
        </head>
        <body>
            <div class="floating-emoji" id="emoji1">{emojis[0]}</div>
            <div class="floating-emoji front" id="emoji2">{emojis[1]}</div>
            <div class="floating-emoji" id="emoji3">{emojis[2]}</div>
            <div class="floating-emoji front" id="emoji4">{emojis[3] if len(emojis) > 3 else emojis[0]}</div>

            <div class="glass-container">
                <div class="brand-tag">WTAF.me</div>
                <h1 class="main-title">{title}</h1>
                <div class="url-display">wtaf.me/{user_slug}/{app_slug}</div>
            </div>
        </body>
        </html>
        """

    def download_image_from_url(self, image_url):
        """Download image from URL and return as bytes"""
        response = requests.get(image_url)
        if not response.ok:
            raise Exception(f"Failed to download image: {response.status_code}")
        return response.content

    def ensure_bucket_exists(self):
        """Ensure the og-images bucket exists with public access"""
        try:
            # Check if bucket exists
            buckets_response = self.supabase.storage.list_buckets()
            bucket_exists = False

            # Handle different response formats
            buckets_data = buckets_response if isinstance(buckets_response, list) else getattr(buckets_response, 'data', [])

            if buckets_data:
                bucket_exists = any(getattr(bucket, 'name', bucket.get('name') if isinstance(bucket, dict) else None) == 'og-images' for bucket in buckets_data)

            if not bucket_exists:
                self.log_with_timestamp('📦 Creating og-images bucket...')
                bucket_response = self.supabase.storage.create_bucket(
                    'og-images',
                    {'public': True, 'allowedMimeTypes': ['image/png', 'image/jpeg']}
                )

                if hasattr(bucket_response, 'error') and bucket_response.error:
                    raise Exception(f"Failed to create bucket: {bucket_response.error.message}")

                self.log_with_timestamp('✅ Created og-images bucket successfully')

        except Exception as e:
            self.log_with_timestamp(f"⚠️ Error ensuring bucket exists: {e}")
            # Continue anyway - bucket might exist but not be listable

    def upload_to_supabase_storage(self, image_data, file_name):
        """Upload image data to Supabase Storage and return public URL"""
        try:
            # Ensure bucket exists
            self.ensure_bucket_exists()

            # Upload to Supabase Storage
            upload_response = self.supabase.storage.from_('og-images').upload(
                path=file_name,
                file=image_data,
                file_options={"content-type": "image/png"}
            )

            if hasattr(upload_response, 'error') and upload_response.error:
                raise Exception(f"Supabase upload failed: {upload_response.error.message}")

            # Get public URL
            url_response = self.supabase.storage.from_('og-images').get_public_url(file_name)
            return url_response

        except Exception as e:
            self.log_with_timestamp(f"❌ Error uploading to Supabase Storage: {e}")
            raise

    def check_cached_image(self, file_name):
        """Check if image already exists in Supabase Storage"""
        try:
            list_response = self.supabase.storage.from_('og-images').list('', {'search': file_name})

            if hasattr(list_response, 'error') and list_response.error:
                self.log_with_timestamp(f"⚠️ Error checking cache: {list_response.error.message}")
                return None

            # Check if we have data and files found
            data = list_response if isinstance(list_response, list) else getattr(list_response, 'data', [])

            if data and len(data) > 0:
                # Image exists, get public URL
                url_response = self.supabase.storage.from_('og-images').get_public_url(file_name)
                return url_response

            return None

        except Exception as e:
            self.log_with_timestamp(f"⚠️ Error checking cached image: {e}")
            return None

    def fetch_content_from_database(self, user_slug, app_slug):
        """Fetch HTML content from wtaf_content table"""
        try:
            response = self.supabase.table('wtaf_content').select(
                'html_content, original_prompt, created_at'
            ).eq('user_slug', user_slug).eq('app_slug', app_slug).eq('status', 'published').single().execute()

            if hasattr(response, 'error') and response.error:
                raise Exception(f"Database error: {response.error.message}")

            if not response.data:
                raise Exception("Content not found")

            return response.data

        except Exception as e:
            self.log_with_timestamp(f"❌ Error fetching content: {e}")
            raise

    def generate_via_htmlcsstoimage(self, html_content, user_slug, app_slug):
        """Generate simplified OG image using HTMLCSStoImage API"""
        try:
            # Extract components for simplified template
            title = self.extract_main_title(html_content)
            gradient = self.extract_background_gradient(html_content)
            emojis = self.generate_relevant_emojis(title, html_content)

            self.log_with_timestamp(f"🎨 Extracted title: '{title}'")
            self.log_with_timestamp(f"🎨 Extracted gradient: '{gradient[:50]}...'")
            self.log_with_timestamp(f"🎨 Generated emojis: {emojis}")

            # Create simplified template
            simplified_html = self.create_simplified_og_template(title, gradient, emojis, user_slug, app_slug)

            # Create authorization header
            auth_string = f"{self.htmlcss_user_id}:{self.htmlcss_api_key}"
            auth_header = base64.b64encode(auth_string.encode()).decode()

            # Prepare request data with 16:9 aspect ratio
            request_data = {
                'html': simplified_html,
                'viewport_width': 1200,
                'viewport_height': 675,  # 16:9 aspect ratio
                'device_scale_factor': 1
            }

            # Make API call
            response = requests.post(
                'https://hcti.io/v1/image',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Basic {auth_header}'
                },
                json=request_data,
                timeout=30
            )

            if not response.ok:
                raise Exception(f"HTMLCSStoImage failed: {response.status_code} - {response.text}")

            data = response.json()

            if 'url' not in data:
                raise Exception("No image URL returned from HTMLCSStoImage")

            return data['url']

        except Exception as e:
            self.log_with_timestamp(f"❌ Error generating image via HTMLCSStoImage: {e}")
            raise

    def update_database_with_cached_url(self, user_slug, app_slug, image_url):
        """Update the wtaf_content record with cached image URL"""
        try:
            update_response = self.supabase.table('wtaf_content').update({
                'og_image_url': image_url,
                'og_image_cached_at': datetime.now().isoformat()
            }).eq('user_slug', user_slug).eq('app_slug', app_slug).execute()

            if hasattr(update_response, 'error') and update_response.error:
                self.log_with_timestamp(f"⚠️ Warning: Failed to update database with cached URL: {update_response.error.message}")
            else:
                self.log_with_timestamp("✅ Updated database with cached image URL")

        except Exception as e:
            self.log_with_timestamp(f"⚠️ Warning: Error updating database: {e}")
            # Don't raise - this is not critical for the main functionality

    def generate_cached_og_image(self, user_slug, app_slug):
        """
        Main method to generate or retrieve cached OG image

        Args:
            user_slug (str): User slug identifier
            app_slug (str): App slug identifier

        Returns:
            str: Public URL of the generated/cached image, or None if failed
        """
        try:
            file_name = f"{user_slug}-{app_slug}.png"

            self.log_with_timestamp(f"🎨 Checking cached OG image for: {user_slug}/{app_slug}")

            # 1. Check if we already have this image in Supabase Storage
            cached_url = self.check_cached_image(file_name)
            if cached_url:
                self.log_with_timestamp(f"⚡ Using cached OG image for {user_slug}/{app_slug}")
                return cached_url

            self.log_with_timestamp(f"🔄 Generating new OG image for: {user_slug}/{app_slug}")

            # 2. Fetch the real page content from Supabase
            page_data = self.fetch_content_from_database(user_slug, app_slug)

            # 3. Generate OG image via HTMLCSStoImage
            image_url = self.generate_via_htmlcsstoimage(page_data['html_content'], user_slug, app_slug)
            self.log_with_timestamp(f"✅ Generated image via HTMLCSStoImage: {image_url}")

            # 4. Download the image
            image_data = self.download_image_from_url(image_url)
            self.log_with_timestamp(f"📥 Downloaded image ({len(image_data)} bytes)")

            # 5. Upload to Supabase Storage
            supabase_url = self.upload_to_supabase_storage(image_data, file_name)
            self.log_with_timestamp(f"📤 Uploaded to Supabase Storage: {supabase_url}")

            # 6. Update the wtaf_content record with the cached URL
            self.update_database_with_cached_url(user_slug, app_slug, supabase_url)

            return supabase_url

        except Exception as e:
            self.log_with_timestamp(f"❌ Error generating cached OG image: {e}")
            return None


# Global instance for easy importing
_og_generator = None

def get_og_generator():
    """Get or create global OG generator instance"""
    global _og_generator
    if _og_generator is None:
        _og_generator = OGImageGenerator()
    return _og_generator

def generate_cached_og_image(user_slug, app_slug):
    """
    Simple function interface for generating cached OG images

    Args:
        user_slug (str): User slug identifier
        app_slug (str): App slug identifier

    Returns:
        str: Public URL of the generated/cached image, or None if failed
    """
    try:
        generator = get_og_generator()
        return generator.generate_cached_og_image(user_slug, app_slug)
    except Exception as e:
        print(f"❌ Error in generate_cached_og_image: {e}")
        return None


# Command line interface
if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print("Usage: python og_generator.py <user_slug> <app_slug>")
        sys.exit(1)

    user_slug = sys.argv[1]
    app_slug = sys.argv[2]

    print(f"🚀 Generating OG image for {user_slug}/{app_slug}...")

    result = generate_cached_og_image(user_slug, app_slug)

    if result:
        print(f"✅ Success! Image URL: {result}")
    else:
        print("❌ Failed to generate OG image")
        sys.exit(1)
