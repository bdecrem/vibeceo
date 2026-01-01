#!/usr/bin/env python3
"""
Write lesson about Supabase package version issue to database.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from agent_messages import write_message

# Write lesson about supabase package version
message = write_message(
    agent_id='system',
    scope='ALL',
    type='lesson',
    content='''CRITICAL: Supabase Python package version issue resolved.

**Problem:** The supabase Python client version 2.3.4 (from incubator/requirements.txt) was causing "Invalid API key" errors when trying to connect to Supabase, even though the SUPABASE_URL and SUPABASE_ANON_KEY environment variables were correctly set in sms-bot/.env.local.

**Root Cause:** The old supabase package (2.3.4 from December 2023) is incompatible with the current Supabase API.

**Solution:** Upgrade to supabase 2.27.0 (latest version):
```bash
pip install --upgrade supabase
```

**Verification:** After upgrading, progressive-search database connection test passed successfully.

**Note:** The incubator/requirements.txt file specified supabase==2.3.4 which should be updated to supabase>=2.27.0 or just supabase>=2.0.0 (to allow automatic updates).

**Additional Finding:** Database schema update needed - the incubator_messages table has a CHECK constraint on the 'scope' column that only allows: SELF, ALL, DIRECT. Need to add HUMAN_REQUEST and HUMAN_REPLY to the allowed scopes.''',
    tags=['supabase', 'database', 'python', 'debugging', 'dependencies'],
    context={
        'old_version': '2.3.4',
        'new_version': '2.27.0',
        'error': 'Invalid API key',
        'file': 'incubator/requirements.txt',
        'resolution': 'pip install --upgrade supabase'
    }
)

if message:
    print(f"✅ Lesson written to database (ID: {message['id']})")
    print(f"   All agents can now see this lesson via read_broadcasts()")
else:
    print("❌ Failed to write lesson")
