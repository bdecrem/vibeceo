#!/usr/bin/env python3

import os
import time
import subprocess
from pathlib import Path
from datetime import datetime

def log_with_timestamp(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def get_newest_file(directory):
    files = [f for f in Path(directory).glob("*.txt") if f.is_file() and not str(f).endswith('_EXECUTED.txt')]
    log_with_timestamp(f"Found {len(files)} unprocessed .txt files in {directory}")
    if not files:
        return None
    newest = max(files, key=os.path.getctime)
    log_with_timestamp(f"Newest file: {newest}")
    return newest

def execute_claude_code(prompt_file):
    log_with_timestamp(f"📖 Reading prompt file: {prompt_file}")
    
    with open(prompt_file, 'r') as f:
        prompt = f.read().strip()
    
    log_with_timestamp(f"📝 PROMPT: {prompt}")
    log_with_timestamp(f"📏 Prompt length: {len(prompt)} characters")
    
    command = ["claude", "--print", prompt]
    log_with_timestamp(f"🚀 Executing: {' '.join(command)}")
    log_with_timestamp(f"📂 Working directory: {os.path.abspath('../')}")
    
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            cwd="../",
            timeout=60  # 1 minute timeout for testing
        )
        
        log_with_timestamp(f"🔢 Return code: {result.returncode}")
        
        if result.stdout:
            log_with_timestamp(f"✅ STDOUT:")
            for line in result.stdout.split('\n')[:10]:  # First 10 lines
                log_with_timestamp(f"   {line}")
        
        if result.stderr:
            log_with_timestamp(f"❌ STDERR:")
            for line in result.stderr.split('\n')[:10]:  # First 10 lines
                log_with_timestamp(f"   {line}")
        
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        log_with_timestamp("⏰ Command timed out!")
        return False
    except Exception as e:
        log_with_timestamp(f"💥 Error: {e}")
        return False

# Test execution
log_with_timestamp("🎬 Starting manual test...")
newest_file = get_newest_file("../data/code/")

if newest_file:
    log_with_timestamp(f"🚨 Testing execution of: {newest_file}")
    success = execute_claude_code(newest_file)
    log_with_timestamp(f"🎯 Result: {'SUCCESS' if success else 'FAILED'}")
else:
    log_with_timestamp("📭 No files to process")

log_with_timestamp("🏁 Manual test complete")