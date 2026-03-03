#!/usr/bin/env python3
"""House Whisperer — AI-powered home awareness via Reolink camera + Claude vision."""

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
CYCLE = int(os.environ.get("WHISPERER_CYCLE", 30))
THRESHOLD = int(os.environ.get("WHISPERER_THRESHOLD", 5))
QUIET_INTERVAL = int(os.environ.get("WHISPERER_QUIET_INTERVAL", 600))  # 10min
NOTIFY = os.environ.get("WHISPERER_NOTIFY", "0") == "1"

CAMERA_IP = "192.168.7.22"
CAMERA_USER = "admin"
CAMERA_PASS = "8iguana61"
CAMERA_URL = f"https://{CAMERA_IP}:443/cgi-bin/api.cgi"

WORK_DIR = Path("/tmp/whisperer")
STATE_FILE = WORK_DIR / "whisperer_state.json"
LOG_FILE = Path(__file__).parent / "whisperer_messages.log"

claude = anthropic.Anthropic()
MODEL = "claude-haiku-4-20250514"


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

    def ensure_token(self):
        if not self.token or (time.time() - self.token_time) > 3000:
            self.login()

    def snap(self, path: Path):
        self.ensure_token()
        r = requests.get(f"{CAMERA_URL}?cmd=Snap&channel=0&token={self.token}",
                         verify=False, timeout=10)
        path.write_bytes(r.content)


# --- ImageMagick pixel diff ---
def pixel_diff(img_a: Path, img_b: Path) -> float:
    """Return percentage of pixels that differ between two images."""
    # Downscale both to 640px wide
    for img in (img_a, img_b):
        subprocess.run(["sips", "-Z", "640", "--out", str(img), str(img)],
                       capture_output=True)

    # Count changed pixels
    result = subprocess.run(
        ["magick", "compare", "-metric", "AE", "-fuzz", "10%",
         str(img_a), str(img_b), "null:"],
        capture_output=True, text=True
    )
    # AE metric outputs to stderr
    output = result.stderr.strip()
    try:
        changed = int(float(output.split()[0]))
    except (ValueError, IndexError):
        return 0.0

    # Get total pixels
    result = subprocess.run(
        ["magick", "identify", "-format", "%[fx:w*h]", str(img_a)],
        capture_output=True, text=True
    )
    try:
        total = int(float(result.stdout.strip()))
    except (ValueError, IndexError):
        return 0.0

    if total == 0:
        return 0.0
    return (changed / total) * 100


# --- State management ---
def load_state() -> dict:
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())
    return {
        "current_scene": None,
        "scene_since": None,
        "last_change": None,
        "last_quiet_message": None,
        "history": []
    }


def save_state(state: dict):
    STATE_FILE.write_text(json.dumps(state, indent=2))


# --- Claude API calls ---
def describe_scene(image_path: Path) -> str:
    """Send image to Claude for scene description."""
    img_data = base64.standard_b64encode(image_path.read_bytes()).decode()
    media_type = "image/jpeg"

    response = claude.messages.create(
        model=MODEL,
        max_tokens=200,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {
                    "type": "base64", "media_type": media_type, "data": img_data
                }},
                {"type": "text", "text": (
                    "Describe what you see in this security camera image. "
                    "Focus on: people (what they are doing), pets (where they are, "
                    "what they are doing), notable objects or changes. "
                    "Be specific and brief. 2-3 sentences max."
                )}
            ]
        }]
    )
    return response.content[0].text.strip()


def generate_message(prev_scene: str, new_scene: str,
                     duration_secs: float, time_of_day: str) -> str:
    """Generate a fun, warm message about the scene change."""
    duration = format_duration(duration_secs) if duration_secs else "unknown"

    response = claude.messages.create(
        model=MODEL,
        max_tokens=150,
        messages=[{
            "role": "user",
            "content": (
                "You are House Whisperer, a warm and slightly playful home awareness AI. "
                "Like a friend housesitting. Generate ONE short message (1-2 sentences) "
                "about this scene change.\n\n"
                f"Previous scene: {prev_scene or 'Nothing observed yet'}\n"
                f"Previous scene lasted: {duration}\n"
                f"New scene: {new_scene}\n"
                f"Time of day: {time_of_day}\n\n"
                "Be casual and warm. Mention specific details from the scene. "
                "If you see a cat, her name is Glimmer. "
                "Don't use emojis. Don't start with 'Hey' or greetings."
            )
        }]
    )
    return response.content[0].text.strip()


def generate_quiet_message(scene: str, quiet_mins: int, time_of_day: str) -> str:
    """Generate a message for extended quiet periods."""
    response = claude.messages.create(
        model=MODEL,
        max_tokens=100,
        messages=[{
            "role": "user",
            "content": (
                "You are House Whisperer. The scene has been unchanged. "
                "Generate ONE short quiet-status message (1 sentence).\n\n"
                f"Current scene: {scene or 'Empty room'}\n"
                f"Unchanged for: {quiet_mins} minutes\n"
                f"Time of day: {time_of_day}\n\n"
                "Be brief and warm. No emojis. If a cat named Glimmer is mentioned, "
                "reference her by name."
            )
        }]
    )
    return response.content[0].text.strip()


# --- Helpers ---
def format_duration(seconds: float) -> str:
    if seconds < 60:
        return f"{int(seconds)}s"
    if seconds < 3600:
        return f"{int(seconds / 60)} minutes"
    hours = seconds / 3600
    if hours < 24:
        return f"{hours:.1f} hours"
    return f"{hours / 24:.1f} days"


def time_of_day() -> str:
    hour = datetime.now().hour
    if hour < 6:
        return "late night"
    if hour < 9:
        return "early morning"
    if hour < 12:
        return "morning"
    if hour < 14:
        return "early afternoon"
    if hour < 17:
        return "afternoon"
    if hour < 20:
        return "evening"
    return "night"


def deliver(message: str):
    """Print, log, and optionally send via WhatsApp."""
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {message}"
    print(line)

    with open(LOG_FILE, "a") as f:
        f.write(line + "\n")

    if NOTIFY:
        try:
            subprocess.run(
                ["openclaw", "message", "send",
                 "--channel", "whatsapp", "--target", "Bart",
                 "--message", message],
                capture_output=True, timeout=15
            )
        except Exception as e:
            print(f"  [notify error: {e}]")


# --- Main loop ---
def run():
    if not os.environ.get("ANTHROPIC_API_KEY"):
        print("Error: ANTHROPIC_API_KEY not set")
        sys.exit(1)

    WORK_DIR.mkdir(parents=True, exist_ok=True)

    camera = Camera()
    state = load_state()

    print(f"House Whisperer starting ({CYCLE}s cycle, {THRESHOLD}% threshold)")
    print(f"  Camera: {CAMERA_IP}")
    print(f"  Notify: {'WhatsApp' if NOTIFY else 'stdout only'}")
    print(f"  Log: {LOG_FILE}")
    print()

    check_count = 0

    while True:
        cycle_start = time.time()
        check_count += 1

        try:
            # 1. Snap pair
            frame_a = WORK_DIR / "frame_a.jpg"
            frame_b = WORK_DIR / "frame_b.jpg"

            camera.snap(frame_a)
            time.sleep(1)
            camera.snap(frame_b)

            # 2. Pixel diff
            diff = pixel_diff(frame_a, frame_b)

            if diff > THRESHOLD:
                # Something changed — describe and message
                print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                      f"change detected ({diff:.1f}% diff)")

                scene = describe_scene(frame_b)
                prev_scene = state["current_scene"]
                prev_since = state["scene_since"]

                duration = None
                if prev_since:
                    duration = time.time() - prev_since

                msg = generate_message(prev_scene, scene, duration, time_of_day())
                deliver(msg)

                # Update state
                if prev_scene:
                    state["history"].append({
                        "scene": prev_scene,
                        "started": prev_since,
                        "duration": duration
                    })
                    state["history"] = state["history"][-10:]  # keep last 10

                state["current_scene"] = scene
                state["scene_since"] = time.time()
                state["last_change"] = time.time()
                state["last_quiet_message"] = None
                save_state(state)

            else:
                # No change — check for quiet period messages
                now = time.time()
                last_change = state.get("last_change") or now
                quiet_secs = now - last_change
                last_quiet = state.get("last_quiet_message") or 0

                # Every QUIET_INTERVAL (10min), send a quiet update
                if (quiet_secs >= QUIET_INTERVAL and
                        (now - last_quiet) >= QUIET_INTERVAL):
                    quiet_mins = int(quiet_secs / 60)
                    msg = generate_quiet_message(
                        state.get("current_scene"),
                        quiet_mins, time_of_day()
                    )
                    deliver(msg)
                    state["last_quiet_message"] = now
                    save_state(state)
                else:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                          f"check #{check_count} — {diff:.1f}% diff (quiet)")

        except requests.exceptions.ConnectionError:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                  f"camera unreachable, retrying next cycle")
        except Exception as e:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] error: {e}")

        # Wait remaining cycle time
        elapsed = time.time() - cycle_start
        remaining = CYCLE - elapsed
        if remaining > 0:
            time.sleep(remaining)


if __name__ == "__main__":
    run()
