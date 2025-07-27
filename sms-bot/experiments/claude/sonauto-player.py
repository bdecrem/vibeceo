#!/usr/bin/env python3
"""Simple terminal app for generating and playing music with Sonauto API"""

import os
import sys
import json
import time
import requests
import tempfile
import subprocess
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env.local'))

SONAUTO_API_KEY = os.getenv('SONAUTO_API_KEY')
API_BASE_URL = 'https://api.sonauto.ai/v1'

def generate_music(prompt):
    """Generate music using Sonauto API"""
    headers = {
        "Authorization": f"Bearer {SONAUTO_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "prompt": prompt
    }
    
    print(f"\n🎵 Generating music for: '{prompt}'...")
    print(f"   Duration: 1 minute 35 seconds (standard Sonauto length)")
    
    try:
        # Start generation
        response = requests.post(
            f"{API_BASE_URL}/generations",
            headers=headers,
            json=data
        )
        response.raise_for_status()
        result = response.json()
        
        if 'task_id' in result:
            return poll_for_result(result['task_id'], headers)
        else:
            return result
            
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Error generating music: {e}")
        if hasattr(e.response, 'text'):
            print(f"   Response: {e.response.text}")
        return None

def poll_for_result(task_id, headers):
    """Poll for the generation result"""
    print(f"   Task ID: {task_id}")
    print("   Checking generation status...")
    
    max_attempts = 60  # Max 2 minutes (should only take 20-30 seconds)
    attempt = 0
    last_status = None
    
    while attempt < max_attempts:
        try:
            # Try the status endpoint first
            response = requests.get(
                f"{API_BASE_URL}/generations/status/{task_id}",
                headers=headers
            )
            
            if response.status_code == 404:
                # Fall back to the generations endpoint
                response = requests.get(
                    f"{API_BASE_URL}/generations/{task_id}",
                    headers=headers
                )
            
            response.raise_for_status()
            
            # Handle different response types
            try:
                result = response.json()
            except json.JSONDecodeError:
                print(f"\n❌ Invalid JSON response: {response.text}")
                return None
            
            # Check if result is a dict
            if not isinstance(result, dict):
                # If it's a string status, convert it
                if isinstance(result, str):
                    result = {"status": result}
                else:
                    print(f"\n❌ Unexpected response type: {type(result)}")
                    print(f"   Response: {result}")
                    return None
            
            status = result.get('status', '').upper()
            
            # Show status updates
            if status != last_status:
                print(f"\n   Status: {status}", end="", flush=True)
                last_status = status
            else:
                print(".", end="", flush=True)
            
            if status in ['COMPLETED', 'SUCCESS']:
                print("\n   ✅ Generation complete!")
                # Get the full result if we only have status
                if 'audio_url' not in result and 'data' not in result:
                    response = requests.get(
                        f"{API_BASE_URL}/generations/{task_id}",
                        headers=headers
                    )
                    response.raise_for_status()
                    result = response.json()
                return result
            elif status in ['FAILED', 'FAILURE']:
                print("\n   ❌ Generation failed!")
                print(f"   Error: {result.get('error', 'Unknown error')}")
                return None
            
            time.sleep(2)  # Poll every 2 seconds
            attempt += 1
            
        except requests.exceptions.RequestException as e:
            print(f"\n❌ Error checking status: {e}")
            if hasattr(e, 'response') and hasattr(e.response, 'text'):
                print(f"   Response: {e.response.text}")
            return None
    
    print("\n   ⏱️  Timeout after 4 minutes")
    return None

def download_and_play(audio_url):
    """Download the audio file and play it"""
    print(f"\n📥 Downloading audio...")
    
    try:
        # Download audio file
        response = requests.get(audio_url)
        response.raise_for_status()
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as tmp_file:
            tmp_file.write(response.content)
            tmp_filename = tmp_file.name
        
        print(f"✅ Downloaded successfully!")
        
        # Detect OS and play audio
        if sys.platform == "darwin":  # macOS
            print("\n▶️  Playing audio...")
            subprocess.run(["afplay", tmp_filename])
        elif sys.platform == "linux":
            print("\n▶️  Playing audio...")
            subprocess.run(["mpg123", tmp_filename])
        elif sys.platform == "win32":
            print("\n▶️  Playing audio...")
            os.startfile(tmp_filename)
        else:
            print(f"\n⚠️  Audio saved to: {tmp_filename}")
            print("   (Automatic playback not supported on this platform)")
        
        # Clean up
        os.unlink(tmp_filename)
        
    except Exception as e:
        print(f"\n❌ Error playing audio: {e}")

def main():
    print("🎼 Sonauto Music Generator")
    print("=" * 40)
    
    if not SONAUTO_API_KEY:
        print("\n❌ Error: SONAUTO_API_KEY not found in environment!")
        print("   Please check your .env.local file")
        return
    
    while True:
        print("\nEnter a prompt to generate music (or 'quit' to exit):")
        prompt = input("🎵 > ").strip()
        
        if prompt.lower() in ['quit', 'exit', 'q']:
            print("\n👋 Goodbye!")
            break
        
        if not prompt:
            print("⚠️  Please enter a prompt!")
            continue
        
        # Generate music
        result = generate_music(prompt)
        
        if result:
            # Check for audio_url in the result or nested data
            audio_url = result.get('audio_url') or (result.get('data', {}).get('audio_url'))
            
            if audio_url:
                print(f"\n✅ Music generated successfully!")
                print(f"   ID: {result.get('id', 'N/A')}")
                download_and_play(audio_url)
            else:
                print(f"\n⚠️  No audio URL in response: {json.dumps(result, indent=2)}")

if __name__ == "__main__":
    main()