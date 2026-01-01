#!/usr/bin/env python3
"""
Test script for agent_messages library

Tests all CRUD operations and validations.

Usage:
    python incubator/lib/test_agent_messages.py
"""

import sys
from pathlib import Path

# Add lib directory to path
sys.path.insert(0, str(Path(__file__).parent))

from agent_messages import (
    read_my_messages,
    read_broadcasts,
    read_inbox,
    read_all_for_agent,
    write_message,
    filter_by_tags,
    filter_by_type,
    get_message_summary
)


def test_write_self_note():
    """Test writing a self-note."""
    print("\n=== Test: Write SELF note ===")

    result = write_message(
        agent_id='test-agent',
        scope='SELF',
        type='lesson',
        content='Test self-note: This is a lesson learned',
        tags=['test', 'self-note'],
        context={'test_run': 1, 'environment': 'test'}
    )

    print(f"✓ Created message: {result['id']}")
    print(f"  Content: {result['content']}")
    print(f"  Tags: {result['tags']}")
    assert result['scope'] == 'SELF'
    assert result['agent_id'] == 'test-agent'
    assert result['recipient'] is None


def test_write_broadcast():
    """Test writing a broadcast message."""
    print("\n=== Test: Write ALL broadcast ===")

    result = write_message(
        agent_id='test-agent',
        scope='ALL',
        type='warning',
        content='Test broadcast: All agents should know this',
        tags=['test', 'broadcast'],
        context={'priority': 'high'}
    )

    print(f"✓ Created message: {result['id']}")
    print(f"  Content: {result['content']}")
    assert result['scope'] == 'ALL'
    assert result['recipient'] is None


def test_write_direct_message():
    """Test writing a direct message."""
    print("\n=== Test: Write DIRECT message ===")

    result = write_message(
        agent_id='test-agent',
        scope='DIRECT',
        recipient='test-recipient',
        type='observation',
        content='Test direct message: Hey test-recipient, check this out',
        tags=['test', 'direct']
    )

    print(f"✓ Created message: {result['id']}")
    print(f"  From: {result['agent_id']}")
    print(f"  To: {result['recipient']}")
    assert result['scope'] == 'DIRECT'
    assert result['recipient'] == 'test-recipient'


def test_validation_direct_without_recipient():
    """Test validation: DIRECT scope requires recipient."""
    print("\n=== Test: Validation - DIRECT without recipient ===")

    try:
        write_message(
            agent_id='test-agent',
            scope='DIRECT',
            type='lesson',
            content='This should fail'
        )
        print("✗ Should have raised ValueError")
        assert False
    except ValueError as e:
        print(f"✓ Correctly raised ValueError: {e}")
        assert "recipient required" in str(e)


def test_validation_self_with_recipient():
    """Test validation: SELF scope should not have recipient."""
    print("\n=== Test: Validation - SELF with recipient ===")

    try:
        write_message(
            agent_id='test-agent',
            scope='SELF',
            type='lesson',
            content='This should fail',
            recipient='someone'
        )
        print("✗ Should have raised ValueError")
        assert False
    except ValueError as e:
        print(f"✓ Correctly raised ValueError: {e}")
        assert "recipient must be None" in str(e)


def test_validation_invalid_scope():
    """Test validation: Invalid scope."""
    print("\n=== Test: Validation - Invalid scope ===")

    try:
        write_message(
            agent_id='test-agent',
            scope='INVALID',
            type='lesson',
            content='This should fail'
        )
        print("✗ Should have raised ValueError")
        assert False
    except ValueError as e:
        print(f"✓ Correctly raised ValueError: {e}")
        assert "Invalid scope" in str(e)


def test_validation_invalid_type():
    """Test validation: Invalid type."""
    print("\n=== Test: Validation - Invalid type ===")

    try:
        write_message(
            agent_id='test-agent',
            scope='SELF',
            type='invalid_type',
            content='This should fail'
        )
        print("✗ Should have raised ValueError")
        assert False
    except ValueError as e:
        print(f"✓ Correctly raised ValueError: {e}")
        assert "Invalid type" in str(e)


def test_read_my_messages():
    """Test reading self-notes."""
    print("\n=== Test: Read my messages ===")

    messages = read_my_messages('test-agent', days=1)
    print(f"✓ Found {len(messages)} self-notes")

    for msg in messages[:3]:  # Show first 3
        print(f"  - [{msg['type']}] {msg['content'][:50]}...")


def test_read_broadcasts():
    """Test reading broadcasts."""
    print("\n=== Test: Read broadcasts ===")

    messages = read_broadcasts(days=1)
    print(f"✓ Found {len(messages)} broadcasts")

    for msg in messages[:3]:
        print(f"  - From {msg['agent_id']}: {msg['content'][:50]}...")


def test_read_inbox():
    """Test reading inbox."""
    print("\n=== Test: Read inbox ===")

    messages = read_inbox('test-recipient', days=1)
    print(f"✓ Found {len(messages)} direct messages to test-recipient")

    for msg in messages[:3]:
        print(f"  - From {msg['agent_id']}: {msg['content'][:50]}...")


def test_read_all_for_agent():
    """Test reading all messages for an agent."""
    print("\n=== Test: Read all for agent ===")

    all_msgs = read_all_for_agent('test-agent', days=1)
    print(f"✓ Self-notes: {len(all_msgs['self'])}")
    print(f"✓ Broadcasts: {len(all_msgs['broadcasts'])}")
    print(f"✓ Inbox: {len(all_msgs['inbox'])}")


def test_filter_by_tags():
    """Test filtering by tags."""
    print("\n=== Test: Filter by tags ===")

    messages = read_my_messages('test-agent', days=1)
    filtered = filter_by_tags(messages, ['test'])
    print(f"✓ Filtered {len(messages)} messages → {len(filtered)} with 'test' tag")


def test_filter_by_type():
    """Test filtering by type."""
    print("\n=== Test: Filter by type ===")

    messages = read_my_messages('test-agent', days=1)
    lessons = filter_by_type(messages, 'lesson')
    warnings = filter_by_type(messages, 'warning')
    print(f"✓ Found {len(lessons)} lessons, {len(warnings)} warnings")


def test_get_summary():
    """Test getting message summary."""
    print("\n=== Test: Get summary ===")

    summary = get_message_summary('test-agent', days=1)
    print(f"✓ Summary for {summary['agent_id']}:")
    print(f"  Self-notes: {summary['self_notes_count']}")
    print(f"  Broadcasts: {summary['broadcasts_count']}")
    print(f"  Inbox: {summary['inbox_count']}")
    print(f"  Total: {summary['total_count']}")


def main():
    """Run all tests."""
    print("=" * 60)
    print("Agent Messages Library - Test Suite")
    print("=" * 60)

    try:
        # Write tests
        test_write_self_note()
        test_write_broadcast()
        test_write_direct_message()

        # Validation tests
        test_validation_direct_without_recipient()
        test_validation_self_with_recipient()
        test_validation_invalid_scope()
        test_validation_invalid_type()

        # Read tests
        test_read_my_messages()
        test_read_broadcasts()
        test_read_inbox()
        test_read_all_for_agent()

        # Filter tests
        test_filter_by_tags()
        test_filter_by_type()

        # Summary test
        test_get_summary()

        print("\n" + "=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
