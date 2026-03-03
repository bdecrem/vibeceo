#!/usr/bin/env python3
"""DogCalm — plays music when Glimmer's on her bed (plush tiger visible)."""

import base64
import json
import os
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import anthropic
import requests
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# --- Config ---
CYCLE = int(os.environ.get("DOGCALM_CYCLE", 180))  # 3 minutes
CAMERA_IP = "192.168.7.22"
CAMERA_USER = "admin"
CAMERA_PASS = "8iguana61"
CAMERA_URL = f"https://{CAMERA_IP}:443/cgi-bin/api.cgi"
SPEAKER = os.environ.get("DOGCALM_SPEAKER", "Roaming w Bart")
PLAYLIST = os.environ.get("DOGCALM_PLAYLIST", "dogmusic")
VOLUME = int(os.environ.get("DOGCALM_VOLUME", 25))
SNAP_DIR = Path(os.environ.get("DOGCALM_SNAP_DIR",
    "/Users/bart/Documents/code/vibeceo/web/public/whisperer/snaps"))
WORK_DIR = Path("/tmp/dogcalm")
NOTIFY = os.environ.get("DOGCALM_NOTIFY", "0") == "1"

claude = anthropic.Anthropic()
MODEL = "claude-3-haiku-20240307"


# --- Camera ---
class Camera:
    def __init__(self):
        self.token = None
        self.token_time = 0

    def login(self):
        payload = [{"cmd": "Login", "action": 0, "param": {
            "User": {"userName": CAMERA_USER, "password": CAMERA_PASS}
        }}]
        r = requests.post(f"{CAMERA_URL}?cmd=Login",
                          json=payload, verify=False, timeout=10)
        self.token = r.json()[0]["value"]["Token"]["name"]
        self.token_time = time.time()

    def snap(self, path: Path):
        if not self.token or (time.time() - self.token_time) > 3000:
            self.login()
        r = requests.get(f"{CAMERA_URL}?cmd=Snap&channel=0&token={self.token}",
                         verify=False, timeout=10)
        path.write_bytes(r.content)


# --- Vision ---
def check_for_tiger(image_path: Path) -> tuple[bool, str]:
    """Ask Claude if the plush tiger is visible. Returns (is_present, description)."""
    img_data = base64.standard_b64encode(image_path.read_bytes()).decode()
    response = claude.messages.create(
        model=MODEL,
        max_tokens=150,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {
                    "type": "base64", "media_type": "image/jpeg", "data": img_data
                }},
                {"type": "text", "text": (
                    "Is there a large plush/stuffed tiger visible in this security camera image? "
                    "Also note if there's a dog (Glimmer) near it. "
                    "First word must be YES or NO. Then one sentence explaining what you see."
                )}
            ]
        }]
    )
    text = response.content[0].text.strip()
    is_present = text.upper().startswith("YES")
    return is_present, text


# --- Music Control ---
def play_music():
    """Play dogmusic playlist shuffled on the HomePod."""
    script = f'''
    tell application "Music"
        repeat with d in (every AirPlay device)
            if name of d is "{SPEAKER}" then set selected of d to true
        end repeat
        set shuffle enabled to true
        set sound volume to {VOLUME}
        play playlist "{PLAYLIST}"
    end tell
    '''
    subprocess.run(["osascript", "-e", script],
                   capture_output=True, timeout=15)


def stop_music():
    """Pause music."""
    subprocess.run(["osascript", "-e", 'tell application "Music" to pause'],
                   capture_output=True, timeout=10)


def is_music_playing() -> bool:
    """Check if Music.app is currently playing."""
    r = subprocess.run(
        ["osascript", "-e", 'tell application "Music" to return player state as string'],
        capture_output=True, text=True, timeout=10)
    return "playing" in r.stdout.strip().lower()


# --- Image compression ---
def compress_and_save(src: Path, dest: Path):
    """Compress image to ~100KB and save."""
    # Resize to 800px wide first, then use magick for quality control
    subprocess.run(
        ["magick", str(src), "-resize", "800x", "-quality", "60", str(dest)],
        capture_output=True, timeout=15)


# --- Notify ---
def notify(msg: str):
    """Send WhatsApp notification if enabled."""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")
    if NOTIFY:
        subprocess.run(
            ["openclaw", "message", "send",
             "--channel", "whatsapp", "--target", "+16508989508",
             "--message", msg],
            capture_output=True, timeout=15)


# --- Main ---
def main():
    WORK_DIR.mkdir(parents=True, exist_ok=True)
    SNAP_DIR.mkdir(parents=True, exist_ok=True)

    camera = Camera()
    music_on = False
    check_count = 0

    print(f"🐕 DogCalm starting ({CYCLE}s cycle)")
    print(f"   Camera: {CAMERA_IP}")
    print(f"   Speaker: {SPEAKER}")
    print(f"   Playlist: {PLAYLIST}")
    print(f"   Snaps: {SNAP_DIR}")
    print(f"   Notify: {'WhatsApp' if NOTIFY else 'stdout only'}")
    print()

    while True:
        cycle_start = time.time()
        check_count += 1

        try:
            # Snap
            frame = WORK_DIR / "frame.jpg"
            camera.snap(frame)

            # Check for tiger
            tiger_present, description = check_for_tiger(frame)
            ts = datetime.now().strftime("%H:%M:%S")

            if tiger_present:
                # Save compressed snap
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                snap_path = SNAP_DIR / f"snap_{timestamp}.jpg"
                compress_and_save(frame, snap_path)

                if not music_on:
                    play_music()
                    music_on = True
                    notify(f"🐕 Tiger spotted! Playing {PLAYLIST} for Glimmer 🎵")

                print(f"[{ts}] #{check_count} 🐯 tiger present — music on — saved {snap_path.name}")
            else:
                if music_on:
                    stop_music()
                    music_on = False
                    notify("🐕 Tiger gone — music paused")

                print(f"[{ts}] #{check_count} no tiger — {description[:60]}")

        except requests.exceptions.ConnectionError:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] camera unreachable")
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] error: {e}")

        # Wait for next cycle
        elapsed = time.time() - cycle_start
        remaining = CYCLE - elapsed
        if remaining > 0:
            time.sleep(remaining)


if __name__ == "__main__":
    main()
