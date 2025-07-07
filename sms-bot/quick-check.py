#!/usr/bin/env python3
import os
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

# Check the specific Gen 2 app
app_uuid = "ef7fff96-984a-44aa-b4cd-4805cf685f82"
app_slug = "charged-stork-inventing"

print(f"🔍 Checking {app_slug} ({app_uuid})...")

# Check wtaf_remix_lineage for this app
result = supabase.table('wtaf_remix_lineage').select('*').eq('child_app_id', app_uuid).execute()

if result.data:
    entry = result.data[0]
    print(f"📊 Generation Level in DB: {entry['generation_level']}")
    print(f"📊 Parent App ID: {entry['parent_app_id']}")
    print(f"📊 Parent User: {entry['parent_user_slug']}")
    print(f"📊 Remix Prompt: {entry['remix_prompt']}")
    
    # Check what generation the parent app is
    parent_result = supabase.table('wtaf_remix_lineage').select('*').eq('child_app_id', entry['parent_app_id']).execute()
    if parent_result.data:
        parent_entry = parent_result.data[0]
        print(f"🔗 Parent's Generation: {parent_entry['generation_level']}")
        print(f"🔗 Expected Generation: {parent_entry['generation_level'] + 1}")
    else:
        print(f"🔗 Parent is original (Generation 0)")
        print(f"🔗 Expected Generation: 1")
        
else:
    print("❌ No remix lineage found for this app!") 