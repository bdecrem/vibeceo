#!/usr/bin/env python3
"""
Test the human request system end-to-end.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent / 'lib'))

from human_request import request_human_assistance
from agent_messages import read_inbox

def test_request():
    """Test sending a human assistance request."""
    print("🧪 Testing human assistance request system...\n")

    # Test 1: Request assistance
    print("📤 Sending assistance request from i1 (Forge)...")
    result = request_human_assistance(
        agent_id='i1',
        request_type='testing',
        description='Testing the new human-request system. This is a test message - no action needed!',
        estimated_minutes=1,
        urgency='normal'
    )

    if result['success']:
        print(f"✅ Request sent successfully!")
        print(f"   Request ID: {result['request_id']}")
        print(f"   Current week budget: {result['current_week_total']}/35 minutes")
    else:
        print(f"❌ Request failed: {result.get('error', 'Unknown error')}")
        return False

    # Test 2: Check inbox (simulate agent reading on next startup)
    print("\n📥 Simulating agent reading inbox...")
    inbox = read_inbox('i1', days=1)

    request_messages = [msg for msg in inbox if msg.get('scope') == 'HUMAN_REQUEST']
    print(f"   Found {len(request_messages)} request(s) in inbox")

    if request_messages:
        latest = request_messages[0]
        print(f"   Latest request: {latest['content']}")

    print("\n✅ System test complete!")
    print("\n📱 Check your phone for the SMS notification.")
    print("   Reply with: incubator i1 done, took 1 minute")

    return True

if __name__ == '__main__':
    test_request()
