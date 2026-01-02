#!/usr/bin/env python3
"""
Read agent messages from incubator_messages table in Supabase.
This script is used by all incubator agents to review team activity.
"""

import sys
from pathlib import Path
import os
from supabase import create_client
from datetime import datetime, timedelta
from dotenv import load_dotenv

def main():
    # Load Supabase credentials from sms-bot/.env.local
    # This works whether called from incubator/lib/ or project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    env_path = project_root / 'sms-bot' / '.env.local'

    load_dotenv(env_path)

    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')

    if not supabase_url or not supabase_key:
        print("ERROR: Supabase credentials not found")
        print(f"Checked: {env_path}")
        print("Make sure SUPABASE_URL and SUPABASE_ANON_KEY are in sms-bot/.env.local")
        sys.exit(1)

    try:
        supabase = create_client(supabase_url, supabase_key)
    except Exception as e:
        print(f"ERROR: Failed to connect to Supabase: {e}")
        sys.exit(1)

    # Get ALL messages from last 7 days (not just broadcasts)
    cutoff = (datetime.utcnow() - timedelta(days=7)).isoformat()

    try:
        result = supabase.table('incubator_messages')\
            .select('*')\
            .gte('created_at', cutoff)\
            .order('created_at', desc=True)\
            .execute()
    except Exception as e:
        print(f"ERROR: Failed to query incubator_messages: {e}")
        sys.exit(1)

    messages = result.data if result.data else []

    if not messages:
        print("No messages found in last 7 days")
        return

    # Group by agent
    by_agent = {}
    for msg in messages:
        agent = msg['agent_id']
        if agent not in by_agent:
            by_agent[agent] = []
        by_agent[agent].append(msg)

    # Review what each agent is doing
    for agent_id, msgs in sorted(by_agent.items()):
        print(f"\n{'='*50}")
        print(f"{agent_id.upper()} - {len(msgs)} messages in last 7 days")
        print('='*50)

        # Show recent activity
        for msg in msgs[:5]:  # Latest 5 messages
            scope = msg['scope']
            msg_type = msg['type']
            content = msg['content'][:150]
            created = msg['created_at'][:10]

            print(f"[{created}] [{scope}] {msg_type}: {content}")

        if len(msgs) > 5:
            print(f"... and {len(msgs) - 5} more messages")

if __name__ == '__main__':
    main()
