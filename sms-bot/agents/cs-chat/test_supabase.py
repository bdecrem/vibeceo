#!/usr/bin/env python3
"""
Simple test script to verify Supabase connection works from Python on Railway.
Run with: python3 agents/cs-chat/test_supabase.py
"""

import os
import sys
import json

print("=== Supabase Connection Test ===", file=sys.stderr)

# Check env vars
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")

print(f"SUPABASE_URL: {'SET (' + url[:30] + '...)' if url else 'MISSING'}", file=sys.stderr)
print(f"SUPABASE_SERVICE_KEY: {'SET (' + key[:20] + '...)' if key else 'MISSING'}", file=sys.stderr)

if not url or not key:
    result = {"error": "Missing env vars", "url_set": bool(url), "key_set": bool(key)}
    print(json.dumps(result))
    sys.exit(1)

try:
    from supabase import create_client
    print("Supabase library imported successfully", file=sys.stderr)

    client = create_client(url, key)
    print("Client created successfully", file=sys.stderr)

    # Try a simple query
    result = client.table("cs_content").select("id, url").limit(3).execute()
    print(f"Query returned {len(result.data)} rows", file=sys.stderr)

    output = {
        "success": True,
        "rows": len(result.data),
        "sample": result.data[:2] if result.data else []
    }
    print(json.dumps(output))

except Exception as e:
    print(f"Error: {type(e).__name__}: {e}", file=sys.stderr)
    import traceback
    traceback.print_exc(file=sys.stderr)

    output = {"error": str(e), "type": type(e).__name__}
    print(json.dumps(output))
    sys.exit(1)
