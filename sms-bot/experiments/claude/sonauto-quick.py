#!/usr/bin/env python3
"""Quick Sonauto submission - just submit and get task ID"""

import os
import json
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env.local'))

SONAUTO_API_KEY = os.getenv('SONAUTO_API_KEY')
API_BASE_URL = 'https://api.sonauto.ai/v1'

def submit_generation(prompt):
    """Submit a generation request and return task_id"""
    headers = {
        "Authorization": f"Bearer {SONAUTO_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {"prompt": prompt}
    
    try:
        response = requests.post(
            f"{API_BASE_URL}/generations",
            headers=headers,
            json=data
        )
        response.raise_for_status()
        result = response.json()
        return result.get('task_id')
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        return None

def check_status(task_id):
    """Check the status of a generation"""
    headers = {"Authorization": f"Bearer {SONAUTO_API_KEY}"}
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/generations/{task_id}",
            headers=headers
        )
        response.raise_for_status()
        result = response.json()
        
        status = result.get('status', 'UNKNOWN')
        print(f"\nStatus: {status}")
        
        # Show all data to debug
        print(f"\nFull response:")
        print(json.dumps(result, indent=2))
        
        return result
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        return None

def main():
    print("🎼 Sonauto Quick Submit")
    print("=" * 40)
    
    if len(os.sys.argv) > 1:
        # Check status mode
        if os.sys.argv[1] == "check" and len(os.sys.argv) > 2:
            task_id = os.sys.argv[2]
            print(f"Checking status for task: {task_id}")
            check_status(task_id)
            return
    
    # Submit mode
    prompt = input("Enter prompt: ").strip()
    if prompt:
        task_id = submit_generation(prompt)
        if task_id:
            print(f"\n✅ Submitted! Task ID: {task_id}")
            print(f"\nTo check status later, run:")
            print(f"python3 {os.sys.argv[0]} check {task_id}")

if __name__ == "__main__":
    main()