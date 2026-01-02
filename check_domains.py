#!/usr/bin/env python3
import socket
import sys

# Domains I want to check
domains = [
    "amber.ai",
    "ambertheai.com",
    "ambersdrawer.com",
    "intheamber.com",
    "suspended.in",
    "ambersidekick.com",
    "thingsinamber.com",
    "amberaccumulates.com",
    "presenceofamber.com",
    "amber.computer"
]

print("Checking domain availability...\n")

for domain in domains:
    try:
        # Try to resolve the domain
        socket.gethostbyname(domain)
        print(f"❌ {domain} - TAKEN (resolves to an IP)")
    except socket.gaierror:
        # Domain doesn't resolve - likely available
        print(f"✓ {domain} - AVAILABLE (doesn't resolve)")
    except Exception as e:
        print(f"? {domain} - UNKNOWN (error: {e})")
