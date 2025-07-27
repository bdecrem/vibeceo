#!/usr/bin/env python3
"""Simple experimental script for SMS bot testing"""

import json
import datetime
import random

def generate_test_message():
    """Generate a random test SMS message"""
    templates = [
        "Hello, this is test message #{num}",
        "Testing SMS functionality at {time}",
        "Random number: {random}",
        "Experiment running... Status: {status}"
    ]
    
    template = random.choice(templates)
    message = template.format(
        num=random.randint(1, 1000),
        time=datetime.datetime.now().strftime("%H:%M:%S"),
        random=random.randint(10000, 99999),
        status=random.choice(["OK", "READY", "ACTIVE"])
    )
    
    return message

def main():
    print("SMS Bot Experiment - Claude")
    print("=" * 40)
    
    # Generate some test messages
    for i in range(5):
        msg = generate_test_message()
        print(f"Message {i+1}: {msg}")
    
    # Simulate message processing
    print("\nSimulating message processing...")
    response_times = [random.uniform(0.1, 2.0) for _ in range(5)]
    avg_response = sum(response_times) / len(response_times)
    
    print(f"Average response time: {avg_response:.2f}s")
    print(f"Min response time: {min(response_times):.2f}s")
    print(f"Max response time: {max(response_times):.2f}s")

if __name__ == "__main__":
    main()