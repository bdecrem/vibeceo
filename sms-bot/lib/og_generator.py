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
        """Extract the main title from HTML content"""
        # Try to find h1 tag first
        h1_match = re.search(r'<h1[^>]*>(.*?)</h1>', html_content, re.IGNORECASE | re.DOTALL)
        if h1_match:
            title = re.sub(r'<[^>]*>', '', h1_match.group(1)).strip()
            if title:
                return title
        
        # Try title tag as fallback
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html_content, re.IGNORECASE | re.DOTALL)
        if title_match:
            title = re.sub(r'<[^>]*>', '', title_match.group(1)).strip()
            if title and 'WTAF' not in title:
                return title
        
        return "WTAF Creation"
    
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
    
    def generate_via_htmlcsstoimage(self, html_content):
        """Generate image using HTMLCSStoImage API"""
        try:
            # Create authorization header
            auth_string = f"{self.htmlcss_user_id}:{self.htmlcss_api_key}"
            auth_header = base64.b64encode(auth_string.encode()).decode()
            
            # Prepare request data
            request_data = {
                'html': html_content,
                'viewport_width': 1200,
                'viewport_height': 630,  
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
            image_url = self.generate_via_htmlcsstoimage(page_data['html_content'])
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