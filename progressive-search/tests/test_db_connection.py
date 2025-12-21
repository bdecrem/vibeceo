#!/usr/bin/env python3
"""
Test Database Connection

Simple script to verify Supabase connection and table access.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from lib import db


def test_connection():
    """Test basic Supabase connection."""
    print("Testing Supabase connection...")
    print()

    try:
        # Test 1: Create a test project
        print("1. Creating test project...")
        project = db.create_project(
            initial_subject="Test project - please delete",
            category="general",
            created_by="test_script"
        )

        if project:
            project_id = project['id']
            print(f"   ✓ Project created: {project_id}")
            print(f"   Initial subject: {project['initial_subject']}")
            print(f"   Status: {project['status']}")
        else:
            print("   ✗ Failed to create project")
            return False

        print()

        # Test 2: Fetch the project
        print("2. Fetching project...")
        fetched = db.get_project(project_id)
        if fetched and fetched['id'] == project_id:
            print(f"   ✓ Project fetched successfully")
        else:
            print("   ✗ Failed to fetch project")
            return False

        print()

        # Test 3: Update project
        print("3. Updating project...")
        updated = db.save_clarified_subject(
            project_id,
            "Test clarified subject - senior engineers"
        )
        if updated and updated['clarified_subject']:
            print(f"   ✓ Project updated")
            print(f"   Status: {updated['status']}")
            print(f"   Clarified subject: {updated['clarified_subject']}")
        else:
            print("   ✗ Failed to update project")
            return False

        print()

        # Test 4: Add conversation message
        print("4. Adding conversation message...")
        message = db.add_message(
            project_id,
            step=1,
            role='user',
            content='Test message'
        )
        if message:
            print(f"   ✓ Message added")
        else:
            print("   ✗ Failed to add message")
            return False

        print()

        # Test 5: Get conversation
        print("5. Getting conversation...")
        conversation = db.get_conversation(project_id, step=1)
        if conversation and len(conversation) > 0:
            print(f"   ✓ Found {len(conversation)} message(s)")
        else:
            print("   ✗ Failed to get conversation")
            return False

        print()

        # Test 6: Get project summary
        print("6. Getting project summary...")
        summary = db.get_project_summary(project_id)
        if summary:
            print(f"   ✓ Summary retrieved:")
            print(f"     Status: {summary['project']['status']}")
            print(f"     Channels: {summary['channels_count']}")
            print(f"     Results: {summary['results_count']}")
        else:
            print("   ✗ Failed to get summary")
            return False

        print()
        print("=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)
        print()
        print(f"TEST PROJECT ID: {project_id}")
        print("You can manually delete this test project from Supabase if desired.")
        print()

        return True

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == '__main__':
    success = test_connection()
    sys.exit(0 if success else 1)
