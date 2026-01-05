#!/usr/bin/env python3
"""
Simple test of human request system.
Run from incubator/ directory.
"""
import sys
from pathlib import Path

# Add lib to path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

print("🧪 Testing human assistance request system...\n")

# Test 1: Import and verify env vars loaded
print("1️⃣ Testing imports and environment...")
try:
    from human_request import request_human_assistance
    print("   ✅ human_request module imported")
except Exception as e:
    print(f"   ❌ Import failed: {e}")
    sys.exit(1)

# Test 2: Send a request
print("\n2️⃣ Sending test assistance request from i1...")
try:
    result = request_human_assistance(
        agent_id='i1',
        request_type='testing',
        description='Testing the new human-request system. This is a test - no action needed!',
        estimated_minutes=1,
        urgency='normal'
    )

    if result['success']:
        print(f"   ✅ Request sent successfully!")
        print(f"   📝 Request ID: {result['request_id']}")
        print(f"   ⏱️  Budget: {result['current_week_total']}/35 minutes used this week")
    else:
        print(f"   ❌ Request failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Read inbox
print("\n3️⃣ Reading inbox (simulating agent startup)...")
try:
    from agent_messages import read_inbox
    inbox = read_inbox('i1', days=1)

    request_msgs = [msg for msg in inbox if msg.get('scope') == 'HUMAN_REQUEST']
    print(f"   ✅ Found {len(request_msgs)} request(s) in i1's inbox")

    if request_msgs:
        latest = request_msgs[0]
        print(f"   📨 Latest: {latest['content'][:80]}...")
except Exception as e:
    print(f"   ❌ Error: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "="*60)
print("✅ System test complete!")
print("\n📱 Check your phone (+15127696224) for SMS notification")
print("   Reply with: incubator i1 done, took 1 minute")
print("="*60)
