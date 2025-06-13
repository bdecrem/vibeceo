#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Add the parent directory to Python path so we can import from scripts
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

# Supabase setup
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

print(f"🔗 Supabase URL: {supabase_url[:50]}...")
print(f"🔑 Supabase Key: {'✅ Present' if supabase_key else '❌ Missing'}")

if not supabase_url or not supabase_key:
    print("❌ Missing Supabase credentials!")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def test_supabase_connection():
    """Test basic Supabase connection"""
    try:
        # Test connection by querying the wtaf_content table
        result = supabase.table('wtaf_content').select('id').limit(1).execute()
        print("✅ Supabase connection successful!")
        print(f"📊 WTAF content table accessible: {len(result.data)} records found")
        return True
    except Exception as e:
        print(f"❌ Supabase connection failed: {e}")
        return False

def test_user_lookup():
    """Test looking up a user by slug"""
    try:
        # Look for test user
        result = supabase.table('sms_subscribers').select('id, slug').eq('slug', 'testuser').execute()
        if result.data:
            print(f"✅ Found test user: {result.data[0]}")
        else:
            print("ℹ️ No test user found (this is normal)")
        return True
    except Exception as e:
        print(f"❌ User lookup failed: {e}")
        return False

def test_app_slug_generation():
    """Test the app slug generation logic"""
    try:
        # Import our generate_unique_app_slug function
        from scripts.monitor import generate_unique_app_slug
        
        # Test with non-existent user (should work)
        app_slug = generate_unique_app_slug("nonexistent-user")
        print(f"✅ Generated app slug: {app_slug}")
        
        # Verify it's a proper 3-part slug
        parts = app_slug.split('-')
        if len(parts) >= 3:
            print(f"✅ App slug format correct: {len(parts)} parts")
        else:
            print(f"⚠️ App slug format unexpected: {len(parts)} parts")
        
        return True
    except Exception as e:
        print(f"❌ App slug generation failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Supabase WTAF Integration...")
    print("=" * 50)
    
    tests = [
        ("Supabase Connection", test_supabase_connection),
        ("User Lookup", test_user_lookup), 
        ("App Slug Generation", test_app_slug_generation)
    ]
    
    passed = 0
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        if test_func():
            passed += 1
        else:
            print(f"❌ {test_name} failed")
    
    print("\n" + "=" * 50)
    print(f"📊 Tests passed: {passed}/{len(tests)}")
    
    if passed == len(tests):
        print("🎉 All tests passed! Supabase integration is ready.")
    else:
        print("⚠️ Some tests failed. Check your configuration.") 