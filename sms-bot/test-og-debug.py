#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment
env_path = Path(__file__).resolve().parent / ".env.local"
load_dotenv(dotenv_path=env_path)

# Import after setting up environment
from scripts.monitor import generate_og_image_url, log_with_timestamp, WEB_APP_URL

def test_og_generation():
    log_with_timestamp("=== OG IMAGE GENERATION TEST ===")
    log_with_timestamp(f"WEB_APP_URL: {WEB_APP_URL}")
    
    # Test the function
    result = generate_og_image_url('bart', 'crimson-jaguar-jumping')
    
    log_with_timestamp(f"Final result: {result}")
    log_with_timestamp("=== TEST COMPLETE ===")
    
    return result

if __name__ == "__main__":
    test_og_generation() 