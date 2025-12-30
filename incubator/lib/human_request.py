import os
from datetime import datetime, timedelta
import re

# Import from existing infrastructure
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from agent_messages import write_message, read_my_messages

# Load environment variables from .env files
from dotenv import load_dotenv

# Load from multiple locations (sms-bot first, then root as fallback)
sms_bot_env = Path(__file__).parent.parent.parent / 'sms-bot' / '.env.local'
root_env = Path(__file__).parent.parent.parent / '.env.local'

load_dotenv(sms_bot_env)  # Primary location
load_dotenv(root_env)      # Fallback location (where user added INCUBATOR_HUMAN_PHONE)


def request_human_assistance(
    agent_id: str,
    request_type: str,
    description: str,
    estimated_minutes: int,
    urgency: str = 'normal'
) -> dict:
    """
    Request human help via SMS and database message.
    Agents manually update usage.md when they process the human reply.

    Args:
        agent_id: Agent identifier (e.g., 'i1', 'i3-2')
        request_type: Type of request ('tool-setup', 'client-outreach', 'debugging', 'payment-config', 'testing')
        description: What you need help with
        estimated_minutes: Your estimate of how long this will take
        urgency: 'urgent', 'normal', or 'low'

    Returns:
        dict with 'success', 'request_id', 'current_week_total' keys
    """

    # 1. Validate agent_id format
    if not re.match(r'^i\d+(-\d+)?$', agent_id):
        raise ValueError(f"Invalid agent_id: {agent_id}")

    # 2. Check budget by reading recent assistance requests from database
    current_week_total = get_current_week_budget_from_db(agent_id)

    # Budget check - warning only, doesn't block
    if current_week_total + estimated_minutes > 35:
        print(f"⚠️  WARNING: This request will exceed weekly budget: {current_week_total + estimated_minutes}/35 minutes")
        print(f"   Current usage: {current_week_total} min, Requesting: {estimated_minutes} min")
        # Continue anyway - budget is a guideline, not a hard limit

    # 3. Write request to database
    request_content = f"{request_type}: {description} (est. {estimated_minutes} min)"

    db_result = write_message(
        agent_id=agent_id,
        scope='HUMAN_REQUEST',  # New scope for assistance requests
        type='assistance_request',
        content=request_content,
        tags=[request_type, 'assistance', urgency],
        context={
            'request_type': request_type,
            'description': description,
            'estimated_minutes': estimated_minutes,
            'urgency': urgency,
            'status': 'pending',
            'created_at': datetime.now().isoformat()
        }
    )

    request_id = db_result.get('id') if db_result else None

    # 4. Format and send SMS
    emoji_map = {
        'debugging': '🐛',
        'tool-setup': '🔧',
        'client-outreach': '📧',
        'payment-config': '💳',
        'testing': '✅'
    }
    emoji = emoji_map.get(request_type, '🤖')
    urgency_prefix = '🚨 URGENT: ' if urgency == 'urgent' else ''

    sms_message = f"""{urgency_prefix}{emoji} Agent Request: {agent_id}
Type: {request_type}
Est. Time: {estimated_minutes} min

{description}

Reply: incubator {agent_id} done, took [actual time]"""

    # Send SMS via Kochi infrastructure
    sms_success = send_sms_to_human(sms_message)

    # 5. Return result
    return {
        'success': sms_success and (request_id is not None),
        'request_id': request_id,
        'current_week_total': current_week_total + estimated_minutes
    }


def get_current_week_budget_from_db(agent_id: str) -> int:
    """
    Query incubator_messages for assistance requests from current week.
    Sum estimated_minutes from all HUMAN_REQUEST messages this week.
    """
    messages = read_my_messages(agent_id, days=7)

    # Filter for HUMAN_REQUEST scope
    assistance_requests = [
        msg for msg in messages
        if msg.get('scope') == 'HUMAN_REQUEST'
        and msg.get('type') == 'assistance_request'
    ]

    # Sum estimated minutes from context
    total = sum(
        msg.get('context', {}).get('estimated_minutes', 0)
        for msg in assistance_requests
        if is_current_week(msg.get('created_at'))
    )

    return total


def is_current_week(timestamp_str: str) -> bool:
    """Check if timestamp is in current calendar week (Monday-Sunday)"""
    if not timestamp_str:
        return False

    try:
        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
    except:
        return False

    now = datetime.now()

    # Get start of current week (Monday 00:00:00)
    days_since_monday = now.weekday()
    week_start = now - timedelta(days=days_since_monday)
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)

    return timestamp >= week_start


def send_sms_to_human(message: str) -> bool:
    """
    Send SMS to human via Twilio.

    Uses direct Twilio call for simplicity. Could be replaced with
    Python wrapper for TypeScript sendSmsResponse in the future.
    """
    try:
        from twilio.rest import Client

        # Check environment variables first
        account_sid = os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = os.environ.get('TWILIO_AUTH_TOKEN')
        from_number = os.environ.get('TWILIO_PHONE_NUMBER')
        to_number = os.environ.get('INCUBATOR_HUMAN_PHONE')

        if not all([account_sid, auth_token, from_number, to_number]):
            print(f"❌ Missing Twilio env vars:")
            print(f"   TWILIO_ACCOUNT_SID: {'✅' if account_sid else '❌'}")
            print(f"   TWILIO_AUTH_TOKEN: {'✅' if auth_token else '❌'}")
            print(f"   TWILIO_PHONE_NUMBER: {'✅' if from_number else '❌'}")
            print(f"   INCUBATOR_HUMAN_PHONE: {'✅' if to_number else '❌'}")
            return False

        # Create Twilio client
        client = Client(account_sid, auth_token)

        # Send message
        print(f"📤 Sending SMS ({len(message)} chars) to {to_number}...")
        result = client.messages.create(
            body=message,
            from_=from_number,
            to=to_number
        )

        print(f"✅ SMS sent to Twilio successfully!")
        print(f"   Message SID: {result.sid}")
        print(f"   Status: {result.status}")

        # Wait a moment to check delivery status
        import time
        time.sleep(2)

        # Fetch updated status
        updated = client.messages(result.sid).fetch()
        if updated.status == 'undelivered' or updated.error_code:
            print(f"⚠️  WARNING: Message may not be delivered!")
            print(f"   Status: {updated.status}")
            print(f"   Error code: {updated.error_code}")
            print(f"   Error: {updated.error_message}")
            if updated.error_code == 30007:
                print(f"   → Carrier spam filter. Try sending fewer messages or wait 5 minutes between requests.")

            # Log failed delivery to database for retry next session
            try:
                write_message(
                    agent_id=agent_id,
                    scope='SELF',
                    type='warning',
                    content=f'SMS delivery failed (Error {updated.error_code}: {updated.error_message}) for {request_type} request. Task: {description[:200]}... Request ID: {request_id}',
                    tags=['sms-delivery-failed', 'human-request', 'retry-needed'],
                    context={
                        'request_id': request_id,
                        'error_code': updated.error_code,
                        'error_message': updated.error_message,
                        'request_type': request_type,
                        'retry_needed': True,
                        'full_description': description
                    }
                )
                print(f"   → Logged to database for retry next session")
            except Exception as log_error:
                print(f"   → Failed to log to database: {log_error}")
        else:
            print(f"✅ Message queued for delivery: {updated.status}")

        return True

    except Exception as e:
        print(f"❌ SMS send failed: {type(e).__name__}: {e}")
        import traceback
        traceback.print_exc()
        return False
