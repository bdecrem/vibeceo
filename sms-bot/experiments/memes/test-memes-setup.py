#!/usr/bin/env python3

import os
from pathlib import Path
from dotenv import load_dotenv

def test_memes_setup():
    print("🧪 Testing memes script setup...")
    print("=" * 50)
    
    # Load environment variables from sms-bot/.env.local
    env_path = Path(__file__).resolve().parent.parent.parent / '.env.local'
    print(f"📁 Loading .env from: {env_path}")
    print(f"📁 File exists: {env_path.exists()}")
    
    if not env_path.exists():
        print("❌ .env.local file not found!")
        print("   Please create sms-bot/.env.local with OPENAI_API_KEY")
        return False
    
    load_dotenv(dotenv_path=env_path)
    
    # Check OpenAI API key
    openai_api_key = os.getenv("OPENAI_API_KEY")
    if openai_api_key:
        print(f"✅ OPENAI_API_KEY found: {openai_api_key[:10]}...{openai_api_key[-10:]}")
        print(f"🔑 Key length: {len(openai_api_key)} characters")
        
        # Basic validation
        if len(openai_api_key) < 40:
            print("⚠️  Warning: API key seems too short")
        elif not openai_api_key.startswith("sk-"):
            print("⚠️  Warning: API key doesn't start with 'sk-'")
        else:
            print("✅ API key format looks correct")
            
    else:
        print("❌ OPENAI_API_KEY not found in .env.local")
        return False
    
    # Test OpenAI import
    try:
        from openai import OpenAI
        print("✅ OpenAI library import successful")
        
        # Test client initialization (without making API call)
        client = OpenAI(api_key=openai_api_key)
        print("✅ OpenAI client initialization successful")
        
    except ImportError:
        print("❌ OpenAI library not installed")
        print("   Run: pip install openai>=1.0.0")
        return False
    except Exception as e:
        print(f"❌ Error with OpenAI client: {e}")
        return False
    
    print("\n🎉 All checks passed! The memes script should work correctly.")
    print("   Run: python memes.py")
    return True

if __name__ == "__main__":
    test_memes_setup() 