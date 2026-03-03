#!/usr/bin/env python3
"""DogCalm — plays music when Glimmer's on her bed (plush tiger visible).
Uses local Qwen 3.5 via Ollama for vision — zero API cost."""

import os
import subprocess
import time
from datetime import datetime
from pathlib import Path

import ollama
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
MODEL = os.environ.get("DOGCALM_MODEL", "qwen3.5:4b")


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


# --- Vision (local Qwen via Ollama) ---
def check_for_tiger(image_path: Path) -> tuple:
    """Ask Qwen if the plush tiger is visible. Returns (is_present, description)."""
    response = ollama.chat(
        model=MODEL,
        messages=[{
            "role": "user",
            "content": (
                "Is there a large plush or stuffed tiger visible in this image? "
                "Also note if there is a dog nearby. "
                "First word must be YES or NO. Then one sentence explaining what you see. "
                "/no_think"
            ),
            "images": [str(image_path)]
        }]
    )
    text = response.message.content.strip()
    # Strip any <think> tags if present
    import re
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()
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


# --- Image compression ---
def compress_and_save(src: Path, dest: Path):
    """Compress image to ~40KB and save."""
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

    print(f"🐕 DogCalm starting ({CYCLE}s cycle, local {MODEL})")
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
            # Snap and downscale for faster vision processing
            raw_frame = WORK_DIR / "frame_raw.jpg"
            frame = WORK_DIR / "frame.jpg"
            camera.snap(raw_frame)
            subprocess.run(
                ["magick", str(raw_frame), "-resize", "800x", str(frame)],
                capture_output=True, timeout=10)

            # Check for tiger (local Qwen ~46s)
            t0 = time.time()
            tiger_present, description = check_for_tiger(frame)
            vision_time = time.time() - t0
            ts = datetime.now().strftime("%H:%M:%S")

            if tiger_present:
                # Save compressed snap from full-res original
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                snap_path = SNAP_DIR / f"snap_{timestamp}.jpg"
                compress_and_save(raw_frame, snap_path)

                if not music_on:
                    play_music()
                    music_on = True
                    notify(f"🐕 Tiger spotted! Playing {PLAYLIST} for Glimmer 🎵")

                print(f"[{ts}] #{check_count} 🐯 tiger present — music on — "
                      f"saved {snap_path.name} ({vision_time:.0f}s)")
            else:
                if music_on:
                    stop_music()
                    music_on = False
                    notify("🐕 Tiger gone — music paused")

                print(f"[{ts}] #{check_count} no tiger ({vision_time:.0f}s) — "
                      f"{description[:80]}")

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
