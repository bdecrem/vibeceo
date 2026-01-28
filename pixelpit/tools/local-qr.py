#!/usr/bin/env python3
"""
Local QR Code Generator for Mobile Testing

Usage:
    python local-qr.py [port] [path]

Examples:
    python local-qr.py              # http://192.168.x.x:3000
    python local-qr.py 8080         # http://192.168.x.x:8080
    python local-qr.py 3000 /arcade # http://192.168.x.x:3000/arcade
"""

import socket
import subprocess
import sys
import platform
import webbrowser
import urllib.parse
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

def get_local_ip():
    """Get the local network IP address (not 127.0.0.1)."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        pass

    try:
        if platform.system() == "Darwin":
            result = subprocess.run(["ifconfig"], capture_output=True, text=True)
            for line in result.stdout.split("\n"):
                if "inet " in line and "127.0.0.1" not in line:
                    parts = line.strip().split()
                    if len(parts) >= 2:
                        return parts[1]
    except Exception:
        pass

    return "127.0.0.1"

def create_qr_html(url):
    """Create HTML with QR code from API."""
    encoded = urllib.parse.quote(url, safe='')
    return f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Local Dev QR</title>
    <style>
        body {{ font-family: system-ui; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #1a1a2e; color: white; }}
        img {{ background: white; padding: 20px; border-radius: 12px; margin: 20px; }}
        .url {{ font-family: monospace; background: #16213e; padding: 12px 20px; border-radius: 8px; color: #4ecca3; }}
        .hint {{ color: #888; font-size: 0.9rem; margin-top: 20px; }}
    </style>
</head>
<body>
    <h2>Scan with your phone (same WiFi)</h2>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data={encoded}" />
    <div class="url">{url}</div>
    <p class="hint">Make sure your dev server is running</p>
</body>
</html>'''

def main():
    port = sys.argv[1] if len(sys.argv) > 1 else "3000"
    path = sys.argv[2] if len(sys.argv) > 2 else ""

    if path and not path.startswith("/"):
        path = "/" + path

    ip = get_local_ip()
    url = f"http://{ip}:{port}{path}"

    print(f"\n📱 Opening QR code in browser...")
    print(f"   URL: {url}\n")

    # Save to persistent file
    html_path = os.path.join(SCRIPT_DIR, "qr.html")
    with open(html_path, 'w') as f:
        f.write(create_qr_html(url))

    # Open in browser
    webbrowser.open(f'file://{html_path}')

    print(f"   Scan it with your phone's camera\n")

if __name__ == "__main__":
    main()
