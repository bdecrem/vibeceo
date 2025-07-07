#!/usr/bin/env python3
import os
import sys
from datetime import datetime
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(dotenv_path=env_path)

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

if not supabase_url or not supabase_key:
    print("❌ Missing Supabase credentials")
    sys.exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def check_remix_genealogy():
    print("🧬 Checking remix genealogy entries...")
    print("=" * 60)
    
    try:
        # Get recent remix lineage entries
        result = supabase.table('wtaf_remix_lineage').select("""
            *,
            parent_content:wtaf_content!wtaf_remix_lineage_parent_app_id_fkey(app_slug, user_slug),
            child_content:wtaf_content!wtaf_remix_lineage_child_app_id_fkey(app_slug, user_slug)
        """).order('created_at', desc=True).limit(10).execute()
        
        if not result.data:
            print("📭 No remix entries found")
            return
            
        print(f"📊 Found {len(result.data)} recent remix entries:\n")
        
        for i, entry in enumerate(result.data, 1):
            parent_slug = entry['parent_content']['app_slug'] if entry['parent_content'] else 'unknown'
            child_slug = entry['child_content']['app_slug'] if entry['child_content'] else 'unknown'
            
            # Format timestamp
            created = datetime.fromisoformat(entry['created_at'].replace('Z', '+00:00'))
            time_str = created.strftime('%Y-%m-%d %H:%M:%S')
            
            print(f"{i:2d}. 🧬 Generation {entry['generation_level']}")
            print(f"    📅 {time_str}")
            print(f"    👤 {entry['parent_user_slug']}/{parent_slug}")
            print(f"    ↓  \"{entry['remix_prompt']}\"")
            print(f"    👤 {entry['child_user_slug']}/{child_slug}")
            print()
            
        # Check for generation level patterns
        generations = [entry['generation_level'] for entry in result.data]
        unique_generations = set(generations)
        
        print("📈 Generation Level Summary:")
        for gen in sorted(unique_generations):
            count = generations.count(gen)
            print(f"   Generation {gen}: {count} entries")
            
        if len(unique_generations) > 1:
            print("✅ Multiple generation levels detected - genealogy tracking working!")
        else:
            print("⚠️  All entries are same generation level")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_remix_genealogy() 