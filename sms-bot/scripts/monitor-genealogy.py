#!/usr/bin/env python3
import os
import time
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

def check_latest():
    result = supabase.table('wtaf_remix_lineage').select('*').order('created_at', desc=True).limit(3).execute()
    for entry in result.data:
        print(f"Gen {entry['generation_level']}: {entry['child_user_slug']} remixed {entry['parent_user_slug']} - {entry['remix_prompt']}")

if __name__ == "__main__":
    print("🔥 REAL-TIME GENEALOGY MONITOR ACTIVE")
    print("=" * 50)
    while True:
        try:
            check_latest()
            print("-" * 30)
            time.sleep(3)
        except KeyboardInterrupt:
            break 