#!/usr/bin/env python3

import os
from pathlib import Path
from dotenv import load_dotenv

# Load the same way monitor.py does
env_path = Path(__file__).resolve().parent.parent / '.env.local'
print(f'Loading from: {env_path}')
print(f'File exists: {env_path.exists()}')

load_dotenv(dotenv_path=env_path)
api_key = os.getenv('ANTHROPIC_API_KEY')
print(f'ANTHROPIC_API_KEY loaded: {"SET (" + api_key[:10] + "...)" if api_key else "MISSING"}')

# Test the API key format
if api_key:
    if api_key.startswith('sk-ant-'):
        print('✅ API key has correct format')
    else:
        print('❌ API key does not start with sk-ant-')
        print(f'   Key starts with: {api_key[:10]}...')
else:
    print('❌ No API key found')

# Also check other environment variables
print(f'\nOther env vars:')
print(f'WEB_APP_URL: {os.getenv("WEB_APP_URL", "NOT SET")}')
print(f'OPENAI_API_KEY: {"SET" if os.getenv("OPENAI_API_KEY") else "NOT SET"}') 