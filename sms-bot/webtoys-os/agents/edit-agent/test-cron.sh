#!/bin/bash
# Test script to debug cron execution

echo "========================================="
echo "Test started at: $(date)"
echo "Running as user: $(whoami)"
echo "HOME is: $HOME"
echo "PATH is: $PATH"

# Test 1: Can we find claude?
echo -e "\n1. Claude location:"
which claude || echo "claude not in PATH"
ls -la /Users/bartdecrem/.local/bin/claude

# Test 2: Can we run claude without flags?
echo -e "\n2. Testing claude without flags:"
echo "hello" | /Users/bartdecrem/.local/bin/claude 2>&1 | head -3

# Test 3: Can we run claude with all flags?
echo -e "\n3. Testing claude with all flags:"
echo "hello" | /Users/bartdecrem/.local/bin/claude --print --verbose --dangerously-skip-permissions 2>&1 | head -3

# Test 4: Check config access
echo -e "\n4. Config file access:"
ls -la ~/.config/claude/credentials.json

echo -e "\nTest completed at: $(date)"
echo "========================================="