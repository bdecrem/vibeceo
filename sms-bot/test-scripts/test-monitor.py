#!/usr/bin/env python3

import os
import subprocess
from pathlib import Path

print("=== MONITOR DEBUG TEST ===")
print(f"Current working directory: {os.getcwd()}")

# Test paths
watch_dir = "../data/code/"
print(f"Watch directory: {watch_dir}")
print(f"Watch directory exists: {os.path.exists(watch_dir)}")

if os.path.exists(watch_dir):
    files = [f for f in Path(watch_dir).glob("*.txt") if f.is_file()]
    print(f"Found {len(files)} .txt files")
    for f in files[:3]:  # Show first 3
        print(f"  - {f}")
        
    # Find newest unprocessed file
    unprocessed = [f for f in files if not str(f).replace('.txt', '_EXECUTED.txt') in [str(x) for x in files]]
    print(f"Unprocessed files: {len(unprocessed)}")
    if unprocessed:
        newest = max(unprocessed, key=os.path.getctime)
        print(f"Newest unprocessed: {newest}")

# Test claude command
print("\n=== TESTING CLAUDE COMMAND ===")
try:
    result = subprocess.run(['which', 'claude'], capture_output=True, text=True)
    if result.returncode == 0:
        print(f"Claude found at: {result.stdout.strip()}")
    else:
        print("Claude command not found!")
        print("STDERR:", result.stderr)
except Exception as e:
    print(f"Error checking claude: {e}")

# Test npm/npx
try:
    result = subprocess.run(['which', 'npx'], capture_output=True, text=True) 
    if result.returncode == 0:
        print(f"NPX found at: {result.stdout.strip()}")
    else:
        print("NPX not found!")
except Exception as e:
    print(f"Error checking npx: {e}")

print("=== DEBUG TEST COMPLETE ===")