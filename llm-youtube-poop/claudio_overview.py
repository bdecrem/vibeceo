#!/usr/bin/env python3
"""
Claudio App Overview Video Generator
======================================
Uses Xcode CLI + iOS Simulator to capture real app screenshots,
then composites them with rendered screens into a polished overview video.

Requires: PIL, numpy, ffmpeg, Xcode command line tools
"""

import os
import sys
import math
import random
import time
import json
import uuid
import wave
import subprocess
import shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# --- Config ---
W, H = 1080, 1920  # 9:16 portrait
FPS = 30
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "claudio_frames")
AUDIO_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "claudio_audio.wav")
VIDEO_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "claudio_overview.mp4")
SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "claudio_screenshots")

# Xcode / Simulator config
SIM_DEVICE = "iPhone 16 Pro"
BUNDLE_ID = "com.kochito.claudio"
PROJECT_DIR = "/Users/bartdecrem/Documents/coding2025/claudio"

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

# --- Theme (exact match from Claudio/Theme/Theme.swift) ---
THEME = {
    'background': (10, 10, 10),        # 0A0A0A
    'surface': (26, 26, 26),           # 1A1A1A
    'surface2': (34, 34, 34),          # 222222
    'border': (42, 42, 42),            # 2A2A2A
    'accent': (212, 164, 76),          # D4A44C
    'text_primary': (232, 232, 232),   # E8E8E8
    'text_secondary': (102, 102, 102), # 666666
    'text_dim': (58, 58, 58),          # 3A3A3A
    'green': (61, 189, 108),           # 3DBD6C
    'danger': (192, 57, 43),           # C0392B
}

# Launch screen colors
LAUNCH = {
    'bg': (17, 6, 4),                  # 110604
    'title_top': (212, 133, 106),      # D4856A
    'title_mid': (176, 82, 56),        # B05238
    'title_bot': (140, 48, 32),        # 8C3020
    'amber': (255, 208, 96),           # FFD060
    'body_light': (234, 176, 144),     # EAB090
    'body_dark': (98, 24, 8),          # 621808
    'arm': (154, 56, 32),              # 9A3820
    'leg': (122, 42, 24),              # 7A2A18
    'eye': (26, 8, 6),                 # 1A0806
    'antenna_stem': (192, 90, 60),     # C05A3C
    'antenna_tip': (212, 133, 106),    # D4856A
    'antenna_tip_inner': (234, 168, 130),  # EAA882
}

WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

# --- Fonts ---
FONT_ROUNDED = "/System/Library/Fonts/SFNSRounded.ttf"
FONT_SERIF = "/System/Library/Fonts/NewYork.ttf"
FONT_MONO = "/System/Library/Fonts/SFNSMono.ttf"
FONT_REGULAR = "/System/Library/Fonts/SFNS.ttf"


def font_rounded(size):
    return ImageFont.truetype(FONT_ROUNDED, size)


def font_serif(size):
    return ImageFont.truetype(FONT_SERIF, size)


def font_mono(size):
    return ImageFont.truetype(FONT_MONO, size)


def font_regular(size):
    return ImageFont.truetype(FONT_REGULAR, size)


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def rgb_alpha(color, alpha):
    """Blend color with background at given alpha (0-1)."""
    bg = THEME['background']
    return tuple(int(c * alpha + b * (1 - alpha)) for c, b in zip(color, bg))


def center_text(draw, y, text, font, fill):
    """Draw centered text."""
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((W - tw) // 2, y), text, fill=fill, font=font)
    return bbox[3] - bbox[1]


def draw_rounded_rect(draw, bbox, radius, fill=None, outline=None, width=1):
    """Draw a rounded rectangle."""
    x0, y0, x1, y1 = bbox
    if fill:
        draw.rectangle([x0 + radius, y0, x1 - radius, y1], fill=fill)
        draw.rectangle([x0, y0 + radius, x1, y1 - radius], fill=fill)
        draw.pieslice([x0, y0, x0 + 2*radius, y0 + 2*radius], 180, 270, fill=fill)
        draw.pieslice([x1 - 2*radius, y0, x1, y0 + 2*radius], 270, 360, fill=fill)
        draw.pieslice([x0, y1 - 2*radius, x0 + 2*radius, y1], 90, 180, fill=fill)
        draw.pieslice([x1 - 2*radius, y1 - 2*radius, x1, y1], 0, 90, fill=fill)
    if outline:
        # Top and bottom edges
        draw.line([x0 + radius, y0, x1 - radius, y0], fill=outline, width=width)
        draw.line([x0 + radius, y1, x1 - radius, y1], fill=outline, width=width)
        # Left and right edges
        draw.line([x0, y0 + radius, x0, y1 - radius], fill=outline, width=width)
        draw.line([x1, y0 + radius, x1, y1 - radius], fill=outline, width=width)
        # Corner arcs
        draw.arc([x0, y0, x0 + 2*radius, y0 + 2*radius], 180, 270, fill=outline, width=width)
        draw.arc([x1 - 2*radius, y0, x1, y0 + 2*radius], 270, 360, fill=outline, width=width)
        draw.arc([x0, y1 - 2*radius, x0 + 2*radius, y1], 90, 180, fill=outline, width=width)
        draw.arc([x1 - 2*radius, y1 - 2*radius, x1, y1], 0, 90, fill=outline, width=width)


def ease_in_out(t):
    return t * t * (3 - 2 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def lerp_color(c1, c2, t):
    return tuple(int(lerp(a, b, t)) for a, b in zip(c1, c2))


# ============================================================
# PHASE 1: Simulator Screenshots
# ============================================================

def get_sim_udid():
    """Find the UDID for our target simulator device."""
    result = subprocess.run(
        ["xcrun", "simctl", "list", "devices", "available", "-j"],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    for runtime, devices in data.get("devices", {}).items():
        if "iOS" not in runtime:
            continue
        for device in devices:
            if device["name"] == SIM_DEVICE and device["state"] != "Shutdown":
                return device["udid"]
            if device["name"] == SIM_DEVICE:
                return device["udid"]
    return None


def boot_simulator(udid):
    """Boot the simulator if not already booted."""
    result = subprocess.run(
        ["xcrun", "simctl", "list", "devices", "-j"],
        capture_output=True, text=True
    )
    data = json.loads(result.stdout)
    for runtime, devices in data.get("devices", {}).items():
        for device in devices:
            if device["udid"] == udid:
                if device["state"] == "Booted":
                    print(f"  Simulator already booted: {device['name']}")
                    return
                break

    print(f"  Booting simulator {udid}...")
    subprocess.run(["xcrun", "simctl", "boot", udid], check=True)
    # Open Simulator.app to see it
    subprocess.run(["open", "-a", "Simulator"])
    time.sleep(5)


def set_clean_status_bar(udid):
    """Set a clean status bar for screenshots."""
    subprocess.run([
        "xcrun", "simctl", "status_bar", udid, "override",
        "--time", "9:41",
        "--batteryState", "charged",
        "--batteryLevel", "100",
        "--wifiBars", "3",
        "--cellularBars", "4",
        "--operatorName", "",
    ], check=True)


def build_app():
    """Build the app for the simulator."""
    print("  Building Claudio...")
    result = subprocess.run([
        "xcodebuild", "-project", f"{PROJECT_DIR}/Claudio.xcodeproj",
        "-scheme", "Claudio",
        "-sdk", "iphonesimulator",
        "-destination", f"platform=iOS Simulator,name={SIM_DEVICE}",
        "-derivedDataPath", f"{PROJECT_DIR}/build",
        "build"
    ], capture_output=True, text=True, timeout=300)
    if result.returncode != 0:
        print(f"  Build failed:\n{result.stderr[-500:]}")
        sys.exit(1)
    print("  Build succeeded.")


def install_app(udid):
    """Install the built app on the simulator."""
    app_path = None
    build_dir = f"{PROJECT_DIR}/build/Build/Products/Debug-iphonesimulator"
    for name in os.listdir(build_dir):
        if name.endswith(".app"):
            app_path = os.path.join(build_dir, name)
            break
    if not app_path:
        # Fall back to DerivedData
        dd = os.path.expanduser("~/Library/Developer/Xcode/DerivedData")
        for d in os.listdir(dd):
            if d.startswith("Claudio"):
                candidate = os.path.join(dd, d, "Build/Products/Debug-iphonesimulator/Claudio.app")
                if os.path.exists(candidate):
                    app_path = candidate
                    break

    if not app_path:
        print("  ERROR: Could not find built .app")
        sys.exit(1)

    print(f"  Installing {app_path}...")
    subprocess.run(["xcrun", "simctl", "install", udid, app_path], check=True)


def take_screenshot(udid, name):
    """Take a simulator screenshot and save it."""
    path = os.path.join(SCREENSHOT_DIR, f"{name}.png")
    subprocess.run([
        "xcrun", "simctl", "io", udid, "screenshot", path
    ], check=True)
    print(f"  Screenshot: {name}.png")
    return path


def launch_app(udid):
    """Launch the app."""
    subprocess.run(["xcrun", "simctl", "launch", udid, BUNDLE_ID], check=True)


def terminate_app(udid):
    """Terminate the app."""
    subprocess.run(["xcrun", "simctl", "terminate", udid, BUNDLE_ID],
                   capture_output=True)


def inject_mock_data(udid):
    """Inject mock server config and chat messages via UserDefaults."""
    # Terminate app first so we can write to its defaults
    terminate_app(udid)
    time.sleep(0.5)

    # Inject a fake server
    server_json = json.dumps([{
        "url": "https://demo.openclaw.ai",
        "token": "demo-token-12345",
        "nickname": "My Server",
        "useHTTP": False
    }])

    # Create mock chat messages
    now = time.time()
    messages = [
        {
            "id": str(uuid.uuid4()).upper(),
            "role": "user",
            "content": "Hey, what's the weather like in San Francisco today?",
            "timestamp": now - 120,
            "imageURLs": []
        },
        {
            "id": str(uuid.uuid4()).upper(),
            "role": "assistant",
            "content": "It's currently 62\u00b0F and partly cloudy in San Francisco. Expected high of 67\u00b0F with a slight chance of fog rolling in this evening. Perfect weather for a walk along the Embarcadero!",
            "timestamp": now - 110,
            "imageURLs": []
        },
        {
            "id": str(uuid.uuid4()).upper(),
            "role": "user",
            "content": "Can you help me write a haiku about it?",
            "timestamp": now - 60,
            "imageURLs": []
        },
        {
            "id": str(uuid.uuid4()).upper(),
            "role": "assistant",
            "content": "Here's a haiku for you:\n\nFog creeps through the gate\nSunlight breaks on city hills\nSan Francisco sighs",
            "timestamp": now - 50,
            "imageURLs": []
        },
    ]

    agent_id = "0:demo-agent"
    chat_state = {
        "histories": {agent_id: messages},
        "savedAt": now
    }

    # Write to app's UserDefaults via simctl
    # We need to write as plist data, so we'll create a temp plist
    import plistlib

    # Write savedServers
    servers_plist = plistlib.dumps(json.loads(server_json))
    tmp_servers = "/tmp/claudio_servers.plist"
    with open(tmp_servers, "wb") as f:
        f.write(servers_plist)

    # Write via defaults command (simctl spawn)
    subprocess.run([
        "xcrun", "simctl", "spawn", udid, "defaults", "write",
        BUNDLE_ID, "activeServerIndex", "-int", "0"
    ], check=True)

    subprocess.run([
        "xcrun", "simctl", "spawn", udid, "defaults", "write",
        BUNDLE_ID, "selectedAgent", "-string", agent_id
    ], check=True)

    # For complex data types, write the plist directly
    container_result = subprocess.run(
        ["xcrun", "simctl", "get_app_container", udid, BUNDLE_ID, "data"],
        capture_output=True, text=True
    )
    if container_result.returncode == 0:
        container = container_result.stdout.strip()
        plist_path = os.path.join(container, "Library/Preferences", f"{BUNDLE_ID}.plist")

        # Read existing plist or create new
        try:
            with open(plist_path, "rb") as f:
                plist_data = plistlib.load(f)
        except (FileNotFoundError, plistlib.InvalidFileException):
            plist_data = {}

        plist_data["savedServers"] = servers_plist
        plist_data["activeServerIndex"] = 0
        plist_data["selectedAgent"] = agent_id

        # Encode chat state as JSON data (matching what Swift's JSONEncoder produces)
        chat_json = json.dumps(chat_state).encode("utf-8")
        plist_data["chatState"] = chat_json

        with open(plist_path, "wb") as f:
            plistlib.dump(plist_data, f)

        print("  Injected mock data into UserDefaults")
    else:
        print("  WARNING: Could not get app container, mock data injection may fail")


def clear_mock_data(udid):
    """Remove injected mock data."""
    terminate_app(udid)
    time.sleep(0.3)
    for key in ["savedServers", "activeServerIndex", "selectedAgent", "chatState"]:
        subprocess.run([
            "xcrun", "simctl", "spawn", udid, "defaults", "delete",
            BUNDLE_ID, key
        ], capture_output=True)


def capture_simulator_screenshots():
    """
    Orchestrate simulator to capture real app screenshots.
    Returns dict of screenshot paths.
    """
    print("\n[PHASE 1] Capturing simulator screenshots...")

    udid = get_sim_udid()
    if not udid:
        print("  WARNING: No simulator found, will use rendered screens only")
        return {}

    screenshots = {}

    try:
        boot_simulator(udid)
        set_clean_status_bar(udid)
        build_app()
        install_app(udid)

        # --- Screenshot 1: Launch Screen ---
        terminate_app(udid)
        clear_mock_data(udid)
        time.sleep(0.5)
        launch_app(udid)
        time.sleep(0.8)  # Catch the launch screen before it fades
        screenshots['launch'] = take_screenshot(udid, "launch")

        # --- Screenshot 2: Onboarding (no server) ---
        time.sleep(2.0)  # Wait for launch screen to fade
        screenshots['onboarding'] = take_screenshot(udid, "onboarding")

        # --- Screenshot 3: Settings (tap "Add Server" button) ---
        # The "Add Server" button is roughly centered at y~960 (on 1179x2556)
        # We'll try to navigate there
        terminate_app(udid)
        time.sleep(0.3)
        launch_app(udid)
        time.sleep(2.5)  # Wait for launch fade + render

        # Tap the gear icon (top right, roughly x=1100, y=140 on device coords)
        # Device coords for iPhone 16 Pro: 393x852 points
        # Gear button is at roughly (370, 70) in points
        # Using simctl io sendEvent isn't available, so we use a different approach
        # Just capture the onboarding with the "Add Server" button visible
        screenshots['onboarding_full'] = take_screenshot(udid, "onboarding_full")

        # --- Screenshot 4: With mock data (chat) ---
        inject_mock_data(udid)
        time.sleep(0.3)
        launch_app(udid)
        time.sleep(3.0)  # Wait for app to load and try to connect
        screenshots['chat'] = take_screenshot(udid, "chat")

        # Clean up
        terminate_app(udid)
        clear_mock_data(udid)

    except Exception as e:
        print(f"  Screenshot capture error: {e}")
        print("  Continuing with rendered screens...")

    return screenshots


# ============================================================
# PHASE 2: Rendered Screens (pixel-perfect app recreation)
# ============================================================

def render_launch_screen():
    """Render the Claudio launch screen (character + title)."""
    img = Image.new("RGB", (W, H), LAUNCH['bg'])
    draw = ImageDraw.Draw(img)

    cx, cy = W // 2, H // 2 - 80

    # Draw Claudio character
    # Scale factor (original is 148x165, we'll draw at ~3x)
    scale = 2.5
    char_cx = cx
    char_cy = cy - 40

    # Body (large circle with gradient simulation)
    body_r = int(68 * scale)
    for r in range(body_r, 0, -1):
        t = r / body_r
        color = lerp_color(LAUNCH['body_dark'], LAUNCH['body_light'], t * t)
        draw.ellipse([
            char_cx - r, char_cy - r,
            char_cx + r, char_cy + r
        ], fill=color)

    # Specular highlight
    spec_cx = char_cx - int(24 * scale)
    spec_cy = char_cy - int(26 * scale)
    for r in range(int(30 * scale), 0, -1):
        alpha = 0.12 * (r / (30 * scale))
        color = lerp_color(LAUNCH['body_light'], WHITE, alpha)
        draw.ellipse([
            spec_cx - r, spec_cy - int(r * 0.67),
            spec_cx + r, spec_cy + int(r * 0.67)
        ], fill=color)

    # Arms
    arm_r_x = int(14 * scale)
    arm_r_y = int(12 * scale)
    arm_y = char_cy
    draw.ellipse([char_cx - int(64 * scale) - arm_r_x, arm_y - arm_r_y,
                  char_cx - int(64 * scale) + arm_r_x, arm_y + arm_r_y],
                 fill=LAUNCH['arm'])
    draw.ellipse([char_cx + int(64 * scale) - arm_r_x, arm_y - arm_r_y,
                  char_cx + int(64 * scale) + arm_r_x, arm_y + arm_r_y],
                 fill=LAUNCH['arm'])

    # Legs
    leg_w = int(18 * scale)
    leg_h = int(30 * scale)
    leg_y = char_cy + int(54 * scale)
    draw_rounded_rect(draw, [char_cx - int(26 * scale), leg_y,
                              char_cx - int(26 * scale) + leg_w, leg_y + leg_h],
                      int(7 * scale), fill=LAUNCH['leg'])
    draw_rounded_rect(draw, [char_cx + int(8 * scale), leg_y,
                              char_cx + int(8 * scale) + leg_w, leg_y + leg_h],
                      int(7 * scale), fill=LAUNCH['leg'])

    # Eyes (dark sockets)
    eye_r = int(17 * scale)
    eye_y = char_cy - int(2 * scale)
    draw.ellipse([char_cx - int(19 * scale) - eye_r, eye_y - eye_r,
                  char_cx - int(19 * scale) + eye_r, eye_y + eye_r],
                 fill=LAUNCH['eye'])
    draw.ellipse([char_cx + int(19 * scale) - eye_r, eye_y - eye_r,
                  char_cx + int(19 * scale) + eye_r, eye_y + eye_r],
                 fill=LAUNCH['eye'])

    # Amber catchlights
    catch_r = int(5.5 * scale)
    catch_y = eye_y - int(5 * scale)
    draw.ellipse([char_cx - int(15 * scale) - catch_r, catch_y - catch_r,
                  char_cx - int(15 * scale) + catch_r, catch_y + catch_r],
                 fill=LAUNCH['amber'])
    draw.ellipse([char_cx + int(23 * scale) - catch_r, catch_y - catch_r,
                  char_cx + int(23 * scale) + catch_r, catch_y + catch_r],
                 fill=LAUNCH['amber'])

    # Small secondary catchlights
    catch2_r = int(1.8 * scale)
    catch2_y = eye_y + int(3 * scale)
    draw.ellipse([char_cx - int(22 * scale) - catch2_r, catch2_y - catch2_r,
                  char_cx - int(22 * scale) + catch2_r, catch2_y + catch2_r],
                 fill=rgb_alpha(LAUNCH['amber'], 0.25))
    draw.ellipse([char_cx + int(16 * scale) - catch2_r, catch2_y - catch2_r,
                  char_cx + int(16 * scale) + catch2_r, catch2_y + catch2_r],
                 fill=rgb_alpha(LAUNCH['amber'], 0.25))

    # Mic badge
    mic_cx = char_cx + int(39 * scale)
    mic_cy = char_cy + int(41 * scale)
    mic_r = int(16 * scale)
    draw.ellipse([mic_cx - mic_r, mic_cy - mic_r, mic_cx + mic_r, mic_cy + mic_r],
                 fill=(14, 6, 4))
    # Mic body
    mic_w = int(7 * scale)
    mic_h = int(11 * scale)
    draw_rounded_rect(draw, [mic_cx - mic_w // 2, mic_cy - int(10 * scale),
                              mic_cx + mic_w // 2, mic_cy - int(10 * scale) + mic_h],
                      int(3.5 * scale), fill=WHITE)

    # Antennae (simplified as lines with dots)
    # Left antenna
    ant_base_y = char_cy - int(60 * scale)
    ant_tip_lx = char_cx - int(19 * scale)
    ant_tip_rx = char_cx + int(19 * scale)
    ant_tip_y = char_cy - int(78 * scale)
    draw.line([(char_cx - int(14 * scale), ant_base_y),
               (ant_tip_lx, ant_tip_y)],
              fill=LAUNCH['antenna_stem'], width=int(2.2 * scale))
    draw.ellipse([ant_tip_lx - int(3 * scale), ant_tip_y - int(3 * scale),
                  ant_tip_lx + int(3 * scale), ant_tip_y + int(3 * scale)],
                 fill=LAUNCH['antenna_tip'])
    draw.ellipse([ant_tip_lx - int(1.8 * scale), ant_tip_y - int(1.8 * scale),
                  ant_tip_lx + int(1.8 * scale), ant_tip_y + int(1.8 * scale)],
                 fill=LAUNCH['antenna_tip_inner'])

    # Right antenna
    draw.line([(char_cx + int(14 * scale), ant_base_y),
               (ant_tip_rx, ant_tip_y)],
              fill=LAUNCH['antenna_stem'], width=int(2.2 * scale))
    draw.ellipse([ant_tip_rx - int(3 * scale), ant_tip_y - int(3 * scale),
                  ant_tip_rx + int(3 * scale), ant_tip_y + int(3 * scale)],
                 fill=LAUNCH['antenna_tip'])
    draw.ellipse([ant_tip_rx - int(1.8 * scale), ant_tip_y - int(1.8 * scale),
                  ant_tip_rx + int(1.8 * scale), ant_tip_y + int(1.8 * scale)],
                 fill=LAUNCH['antenna_tip_inner'])

    # Title: "Claudio" in serif with gradient colors
    title_y = cy + int(90 * scale)
    title_font = font_serif(84)
    center_text(draw, title_y, "Claudio", title_font, LAUNCH['title_mid'])

    # Subtitle: "VOICE & TEXT"
    sub_y = title_y + 100
    sub_font = font_rounded(26)
    sub_color = rgb_alpha(WHITE, 0.25)
    center_text(draw, sub_y, "V O I C E   &   T E X T", sub_font, sub_color)

    return img


def render_onboarding_screen():
    """Render the onboarding/empty state screen."""
    img = Image.new("RGB", (W, H), THEME['background'])
    draw = ImageDraw.Draw(img)

    # Status bar area (leave blank)
    # Header with gear icon
    header_y = 120
    gear_font = font_regular(40)
    draw.text((W - 80, header_y), "\u2699", fill=THEME['text_secondary'], font=gear_font)

    # Divider
    draw.line([(0, header_y + 60), (W, header_y + 60)], fill=THEME['border'], width=2)

    # Center content
    cy = H // 2 - 60

    # "claudio" text
    title_font = font_rounded(72)
    title_color = rgb_alpha(THEME['text_secondary'], 0.4)
    center_text(draw, cy - 50, "claudio", title_font, title_color)

    # Subtitle
    sub_font = font_rounded(34)
    sub_color = rgb_alpha(THEME['text_secondary'], 0.6)
    center_text(draw, cy + 40, "Connect to your server", sub_font, sub_color)
    center_text(draw, cy + 82, "to get started.", sub_font, sub_color)

    # "Add Server" button (accent capsule)
    btn_w = 280
    btn_h = 80
    btn_x = (W - btn_w) // 2
    btn_y = cy + 160
    draw_rounded_rect(draw, [btn_x, btn_y, btn_x + btn_w, btn_y + btn_h],
                      btn_h // 2, fill=THEME['accent'])
    btn_font = font_rounded(34)
    btn_text = "Add Server"
    bbox = draw.textbbox((0, 0), btn_text, font=btn_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(((W - tw) // 2, btn_y + (btn_h - th) // 2 - 4),
              btn_text, fill=THEME['background'], font=btn_font)

    return img


def render_chat_screen():
    """Render a chat screen with mock messages."""
    img = Image.new("RGB", (W, H), THEME['background'])
    draw = ImageDraw.Draw(img)

    # --- Header ---
    header_y = 100
    # Agent name centered
    agent_font = font_mono(28)
    center_text(draw, header_y, "amber", agent_font, THEME['text_primary'])
    # Status
    status_font = font_mono(20)
    center_text(draw, header_y + 34, "connected", status_font, THEME['green'])

    # Gear icon (right)
    gear_font = font_regular(36)
    draw.text((W - 70, header_y + 6), "\u2699", fill=THEME['text_secondary'], font=gear_font)

    # Divider
    div_y = header_y + 70
    draw.line([(0, div_y), (W, div_y)], fill=THEME['border'], width=2)

    # --- Agent picker pills ---
    picker_y = div_y + 16
    pill_font = font_rounded(26)
    pills = [("amber", True), ("atlas", False), ("coder", False)]
    pill_x = 40
    for name, selected in pills:
        bbox = draw.textbbox((0, 0), name, font=pill_font)
        pw = bbox[2] - bbox[0] + 40
        ph = 52

        if selected:
            draw_rounded_rect(draw, [pill_x, picker_y, pill_x + pw, picker_y + ph],
                              ph // 2, fill=THEME['accent'])
            draw.text((pill_x + 20, picker_y + 10), name,
                      fill=THEME['background'], font=pill_font)
        else:
            draw_rounded_rect(draw, [pill_x, picker_y, pill_x + pw, picker_y + ph],
                              ph // 2, fill=THEME['surface'])
            draw.text((pill_x + 20, picker_y + 10), name,
                      fill=THEME['text_secondary'], font=pill_font)
        pill_x += pw + 16

    # Rooms pill
    rooms_text = "rooms"
    bbox = draw.textbbox((0, 0), rooms_text, font=pill_font)
    rw = bbox[2] - bbox[0] + 40
    draw_rounded_rect(draw, [pill_x, picker_y, pill_x + rw, picker_y + 52],
                      26, fill=THEME['surface'])
    draw.text((pill_x + 20, picker_y + 10), rooms_text,
              fill=THEME['text_secondary'], font=pill_font)

    # --- Messages ---
    msg_start_y = picker_y + 80
    messages = [
        ("user", "Hey, what's the weather like in San Francisco today?"),
        ("assistant", "It's currently 62\u00b0F and partly cloudy in San Francisco. Expected high of 67\u00b0F with a slight chance of fog rolling in this evening.\n\nPerfect weather for a walk along the Embarcadero!"),
        ("user", "Can you help me write a haiku about it?"),
        ("assistant", "Here's a haiku for you:\n\nFog creeps through the gate\nSunlight breaks on city hills\nSan Francisco sighs"),
    ]

    msg_y = msg_start_y
    msg_font = font_regular(30)
    msg_padding = 28
    max_msg_w = int(W * 0.75)

    for role, content in messages:
        is_user = role == "user"

        # Wrap text
        words = content.split()
        lines = []
        current_line = ""
        for word in words:
            if word == "\n" or (current_line and word.startswith("\n")):
                if current_line:
                    lines.append(current_line.strip())
                # Handle embedded newlines
                parts = word.split("\n")
                for p in parts[:-1]:
                    if p.strip():
                        lines.append(p.strip())
                    else:
                        lines.append("")
                current_line = parts[-1] + " " if parts[-1] else ""
                continue

            test = current_line + word + " "
            bbox = draw.textbbox((0, 0), test.strip(), font=msg_font)
            if bbox[2] - bbox[0] > max_msg_w - msg_padding * 2:
                if current_line.strip():
                    lines.append(current_line.strip())
                current_line = word + " "
            else:
                current_line = test

        if current_line.strip():
            lines.append(current_line.strip())

        # Handle newlines in content more carefully
        all_lines = []
        for line in content.split("\n"):
            if not line.strip():
                all_lines.append("")
                continue
            # Word wrap each line
            words_in_line = line.split()
            current = ""
            for word in words_in_line:
                test = current + word + " "
                bbox = draw.textbbox((0, 0), test.strip(), font=msg_font)
                if bbox[2] - bbox[0] > max_msg_w - msg_padding * 2:
                    if current.strip():
                        all_lines.append(current.strip())
                    current = word + " "
                else:
                    current = test
            if current.strip():
                all_lines.append(current.strip())

        lines = all_lines
        line_height = 38
        bubble_h = len(lines) * line_height + msg_padding * 2

        # Calculate bubble width
        max_line_w = 0
        for line in lines:
            if line:
                bbox = draw.textbbox((0, 0), line, font=msg_font)
                max_line_w = max(max_line_w, bbox[2] - bbox[0])
        bubble_w = min(max_msg_w, max_line_w + msg_padding * 2)

        if is_user:
            bubble_x = W - bubble_w - 30
            bubble_color = THEME['surface2']
            text_color = THEME['text_primary']
        else:
            bubble_x = 30
            bubble_color = THEME['surface']
            text_color = THEME['text_primary']

        # Draw bubble
        draw_rounded_rect(draw, [bubble_x, msg_y, bubble_x + bubble_w, msg_y + bubble_h],
                          28, fill=bubble_color)

        # Draw text
        text_y = msg_y + msg_padding
        for line in lines:
            if line:
                draw.text((bubble_x + msg_padding, text_y), line,
                          fill=text_color, font=msg_font)
            text_y += line_height

        msg_y += bubble_h + 16

    # --- Input bar ---
    input_y = H - 140
    draw.line([(0, input_y - 10), (W, input_y - 10)], fill=THEME['border'], width=1)

    # Input field
    input_x = 30
    input_w = W - 160
    input_h = 80
    draw_rounded_rect(draw, [input_x, input_y, input_x + input_w, input_y + input_h],
                      input_h // 2, fill=THEME['surface'])

    # Placeholder
    placeholder_font = font_rounded(28)
    draw.text((input_x + 28, input_y + 22), "Message...",
              fill=THEME['text_dim'], font=placeholder_font)

    # Photo icon (left of input)
    # Mic button (right)
    mic_x = input_x + input_w + 20
    mic_r = 32
    mic_cy = input_y + input_h // 2
    draw.ellipse([mic_x, mic_cy - mic_r, mic_x + mic_r * 2, mic_cy + mic_r],
                 fill=THEME['accent'])

    return img


def render_voice_orb(t=0.5, audio_level=0.3):
    """Render the voice orb screen."""
    img = Image.new("RGB", (W, H), THEME['background'])
    draw = ImageDraw.Draw(img)

    cx, cy = W // 2, H // 2 - 100

    # Pulsing rings
    pulse = 0.5 + 0.5 * math.sin(t * math.pi * 2)

    # Outer ring
    outer_r = int(200 * (1.0 + pulse * 0.15 + audio_level * 0.2))
    for r in range(outer_r, outer_r - 40, -1):
        alpha = 0.08 * (r - outer_r + 40) / 40 * (0.3 + pulse * 0.3)
        color = rgb_alpha(THEME['accent'], alpha)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    # Middle ring
    mid_r = int(150 * (1.0 + pulse * 0.1 + audio_level * 0.15))
    for r in range(mid_r, mid_r - 30, -1):
        alpha = 0.15 * (r - mid_r + 30) / 30 * (0.5 + pulse * 0.2)
        color = rgb_alpha(THEME['accent'], alpha)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    # Core orb (radial gradient)
    core_r = int(100 * (1.0 + audio_level * 0.1))
    for r in range(core_r, 0, -1):
        t_grad = r / core_r
        alpha = 0.5 + 0.4 * (1 - t_grad)
        color = rgb_alpha(THEME['accent'], alpha)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    # Glow
    glow_r = core_r + 40
    for r in range(glow_r, core_r, -1):
        alpha = 0.4 * (1 - (r - core_r) / 40)
        color = rgb_alpha(THEME['accent'], alpha * 0.3)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)

    # Transcript bubbles above
    transcript_messages = [
        ("user", "Tell me about the history of jazz music"),
        ("assistant", "Jazz originated in the late 19th century in New Orleans, blending African rhythms, blues, and European harmonies..."),
    ]

    msg_y = 200
    msg_font = font_regular(28)
    for role, text in transcript_messages:
        is_user = role == "user"
        # Truncate for display
        if len(text) > 80:
            text = text[:77] + "..."

        bbox = draw.textbbox((0, 0), text, font=msg_font)
        tw = bbox[2] - bbox[0]
        bubble_w = min(W - 120, tw + 48)
        bubble_h = 60

        if is_user:
            bx = W - bubble_w - 40
            bg_color = THEME['surface2']
        else:
            bx = 40
            bg_color = THEME['surface']

        draw_rounded_rect(draw, [bx, msg_y, bx + bubble_w, msg_y + bubble_h],
                          24, fill=bg_color)
        # Clip text
        draw.text((bx + 24, msg_y + 14), text, fill=THEME['text_primary'], font=msg_font)
        msg_y += bubble_h + 12

    # State label
    state_font = font_rounded(28)
    state_y = cy + core_r + 80
    center_text(draw, state_y, "Listening...", state_font, THEME['text_secondary'])

    # Stop button (bottom right)
    stop_x = W - 120
    stop_y = H - 160
    stop_r = 32
    draw.ellipse([stop_x - stop_r, stop_y - stop_r, stop_x + stop_r, stop_y + stop_r],
                 fill=THEME['danger'])
    # X mark
    xsize = 14
    draw.line([(stop_x - xsize, stop_y - xsize), (stop_x + xsize, stop_y + xsize)],
              fill=WHITE, width=4)
    draw.line([(stop_x + xsize, stop_y - xsize), (stop_x - xsize, stop_y + xsize)],
              fill=WHITE, width=4)

    return img


def render_settings_screen():
    """Render the settings screen."""
    img = Image.new("RGB", (W, H), THEME['background'])
    draw = ImageDraw.Draw(img)

    # Navigation bar
    nav_y = 120
    nav_font = font_rounded(38)
    center_text(draw, nav_y, "Settings", nav_font, THEME['text_primary'])

    # Back arrow (left)
    back_font = font_regular(36)
    draw.text((30, nav_y + 2), "\u2190", fill=THEME['accent'], font=back_font)

    # Divider
    draw.line([(0, nav_y + 56), (W, nav_y + 56)], fill=THEME['border'], width=2)

    section_y = nav_y + 90

    # --- Servers section ---
    section_font = font_rounded(24)
    section_color = THEME['text_secondary']
    draw.text((40, section_y), "SERVERS", fill=section_color, font=section_font)
    section_y += 50

    # Server card
    card_x = 30
    card_w = W - 60
    card_h = 120
    draw_rounded_rect(draw, [card_x, section_y, card_x + card_w, section_y + card_h],
                      14, fill=THEME['surface'])

    # Server info
    server_font = font_rounded(30)
    url_font = font_mono(22)
    draw.text((card_x + 24, section_y + 20), "My Server",
              fill=THEME['text_primary'], font=server_font)
    draw.text((card_x + 24, section_y + 58), "demo.openclaw.ai",
              fill=THEME['text_secondary'], font=url_font)

    # Green dot (connected)
    dot_x = card_x + card_w - 50
    dot_y = section_y + card_h // 2
    draw.ellipse([dot_x - 8, dot_y - 8, dot_x + 8, dot_y + 8], fill=THEME['green'])

    section_y += card_h + 30

    # Add server button (dashed outline)
    add_h = 100
    draw_rounded_rect(draw, [card_x, section_y, card_x + card_w, section_y + add_h],
                      14, outline=rgb_alpha(THEME['accent'], 0.15))

    # Plus icon + text
    plus_font = font_regular(56)
    center_text(draw, section_y + 10, "+", plus_font, THEME['accent'])
    add_font = font_rounded(26)
    center_text(draw, section_y + 58, "Add Server", add_font, rgb_alpha(THEME['accent'], 0.7))

    section_y += add_h + 20

    # QR button
    qr_font = font_rounded(30)
    center_text(draw, section_y, "Login with QR", qr_font, THEME['accent'])
    section_y += 40
    qr_sub = font_rounded(24)
    qr_text = 'Type "openclaw qr" in your terminal'
    center_text(draw, section_y, qr_text, qr_sub, rgb_alpha(THEME['text_secondary'], 0.6))

    section_y += 80

    # --- Agents section ---
    draw.text((40, section_y), "AGENTS", fill=section_color, font=section_font)
    section_y += 50

    agents = [
        ("amber", "Personal AI sidekick", True),
        ("atlas", "Research & analysis", True),
        ("coder", "Code generation", False),
    ]

    for name, desc, visible in agents:
        agent_h = 80
        draw_rounded_rect(draw, [card_x, section_y, card_x + card_w, section_y + agent_h],
                          14, fill=THEME['surface'])

        draw.text((card_x + 24, section_y + 14), name,
                  fill=THEME['text_primary'], font=font_rounded(28))
        draw.text((card_x + 24, section_y + 46), desc,
                  fill=THEME['text_secondary'], font=font_rounded(22))

        # Toggle indicator
        toggle_x = card_x + card_w - 70
        toggle_y = section_y + agent_h // 2 - 14
        toggle_w = 52
        toggle_h = 28
        if visible:
            draw_rounded_rect(draw, [toggle_x, toggle_y, toggle_x + toggle_w, toggle_y + toggle_h],
                              toggle_h // 2, fill=THEME['green'])
            draw.ellipse([toggle_x + toggle_w - toggle_h + 2, toggle_y + 2,
                          toggle_x + toggle_w - 2, toggle_y + toggle_h - 2], fill=WHITE)
        else:
            draw_rounded_rect(draw, [toggle_x, toggle_y, toggle_x + toggle_w, toggle_y + toggle_h],
                              toggle_h // 2, fill=THEME['border'])
            draw.ellipse([toggle_x + 2, toggle_y + 2,
                          toggle_x + toggle_h - 2, toggle_y + toggle_h - 2], fill=WHITE)

        section_y += agent_h + 12

    return img


def render_feature_card(features, title=None):
    """Render a feature highlights card."""
    img = Image.new("RGB", (W, H), THEME['background'])
    draw = ImageDraw.Draw(img)

    start_y = H // 2 - len(features) * 60

    if title:
        title_font = font_rounded(48)
        center_text(draw, start_y - 100, title, title_font, THEME['accent'])

    icon_font = font_regular(44)
    text_font = font_rounded(34)
    desc_font = font_rounded(26)

    for i, (icon, name, description) in enumerate(features):
        y = start_y + i * 130

        # Icon circle
        icon_cx = 100
        icon_cy = y + 25
        draw.ellipse([icon_cx - 30, icon_cy - 30, icon_cx + 30, icon_cy + 30],
                     fill=THEME['surface'])
        draw.text((icon_cx - 14, icon_cy - 16), icon,
                  fill=THEME['accent'], font=icon_font)

        # Text
        draw.text((160, y), name, fill=THEME['text_primary'], font=text_font)
        draw.text((160, y + 44), description,
                  fill=THEME['text_secondary'], font=desc_font)

    return img


def render_title_card(title, subtitle=None, accent_color=None):
    """Render a centered title card."""
    img = Image.new("RGB", (W, H), THEME['background'])
    draw = ImageDraw.Draw(img)

    color = accent_color or THEME['accent']

    title_font = font_serif(72) if len(title) < 20 else font_rounded(52)
    cy = H // 2 - 60
    center_text(draw, cy, title, title_font, color)

    if subtitle:
        sub_font = font_rounded(30)
        center_text(draw, cy + 90, subtitle, sub_font, THEME['text_secondary'])

    return img


def render_outro():
    """Render the outro card."""
    img = Image.new("RGB", (W, H), LAUNCH['bg'])
    draw = ImageDraw.Draw(img)

    cy = H // 2 - 120

    # Mini character (reuse launch screen logic, scaled down)
    # Just draw a simplified version
    char_cx = W // 2
    char_cy = cy - 20
    body_r = 60
    for r in range(body_r, 0, -1):
        t = r / body_r
        color = lerp_color(LAUNCH['body_dark'], LAUNCH['body_light'], t * t)
        draw.ellipse([char_cx - r, char_cy - r, char_cx + r, char_cy + r], fill=color)

    # Eyes
    eye_r = 15
    eye_y = char_cy - 2
    draw.ellipse([char_cx - 17 - eye_r, eye_y - eye_r,
                  char_cx - 17 + eye_r, eye_y + eye_r], fill=LAUNCH['eye'])
    draw.ellipse([char_cx + 17 - eye_r, eye_y - eye_r,
                  char_cx + 17 + eye_r, eye_y + eye_r], fill=LAUNCH['eye'])

    # Catchlights
    catch_r = 5
    catch_y = eye_y - 4
    draw.ellipse([char_cx - 13 - catch_r, catch_y - catch_r,
                  char_cx - 13 + catch_r, catch_y + catch_r], fill=LAUNCH['amber'])
    draw.ellipse([char_cx + 21 - catch_r, catch_y - catch_r,
                  char_cx + 21 + catch_r, catch_y + catch_r], fill=LAUNCH['amber'])

    # Title
    title_y = cy + 100
    title_font = font_serif(72)
    center_text(draw, title_y, "Claudio", title_font, LAUNCH['title_mid'])

    # Tagline
    tag_font = font_rounded(30)
    center_text(draw, title_y + 90, "Voice & Text AI Client", tag_font,
                rgb_alpha(WHITE, 0.5))

    # Features line
    feat_font = font_rounded(26)
    feat_y = title_y + 160
    center_text(draw, feat_y, "Self-hosted \u00b7 Private \u00b7 No account needed", feat_font,
                rgb_alpha(WHITE, 0.3))

    # URL
    url_font = font_mono(28)
    center_text(draw, feat_y + 60, "claudio.la", url_font, THEME['accent'])

    return img


# ============================================================
# PHASE 3: Video Composition
# ============================================================

def crossfade(img1, img2, t):
    """Crossfade between two PIL images."""
    # Ensure both images are the same mode and size
    img1 = img1.convert("RGB").resize((W, H), Image.LANCZOS) if img1.size != (W, H) or img1.mode != "RGB" else img1.convert("RGB")
    img2 = img2.convert("RGB").resize((W, H), Image.LANCZOS) if img2.size != (W, H) or img2.mode != "RGB" else img2.convert("RGB")
    return Image.blend(img1, img2, t)


def build_video_sequence(screenshots):
    """
    Build the full video frame sequence.
    Returns list of PIL images.
    """
    print("\n[PHASE 2] Building video sequence...")

    # Pre-render all screens
    print("  Rendering screens...")
    screen_launch = render_launch_screen()
    screen_onboarding = render_onboarding_screen()
    screen_chat = render_chat_screen()
    screen_settings = render_settings_screen()
    screen_outro = render_outro()

    # Use simulator screenshots if available, otherwise use rendered versions
    if 'launch' in screenshots:
        try:
            sim_launch = Image.open(screenshots['launch']).convert("RGB").resize((W, H), Image.LANCZOS)
            screen_launch = sim_launch
            print("  Using simulator launch screenshot")
        except Exception:
            pass

    if 'onboarding' in screenshots or 'onboarding_full' in screenshots:
        key = 'onboarding_full' if 'onboarding_full' in screenshots else 'onboarding'
        try:
            sim_onboard = Image.open(screenshots[key]).convert("RGB").resize((W, H), Image.LANCZOS)
            screen_onboarding = sim_onboard
            print("  Using simulator onboarding screenshot")
        except Exception:
            pass

    # Feature cards
    screen_features = render_feature_card([
        ("\u26a1", "Voice-First", "Natural conversations with your AI"),
        ("\U0001f512", "Self-Hosted", "Your server, your data, your rules"),
        ("\U0001f6e1", "Private", "Zero tracking, zero data collection"),
        ("\U0001f310", "Open Protocol", "Works with any OpenClaw server"),
    ], title="Built Different")

    # Define scene timeline
    scenes = [
        # (duration_sec, screen_or_callable, label)
        (3.0, screen_launch, "Launch"),
        (0.5, None, "fade"),  # crossfade
        (3.0, screen_onboarding, "Onboarding"),
        (0.5, None, "fade"),
        (5.0, screen_chat, "Chat"),
        (0.5, None, "fade"),
        (3.5, "voice_anim", "Voice"),  # animated
        (0.5, None, "fade"),
        (3.0, screen_settings, "Settings"),
        (0.5, None, "fade"),
        (4.0, screen_features, "Features"),
        (0.5, None, "fade"),
        (4.0, screen_outro, "Outro"),
    ]

    frames = []
    prev_screen = None

    for scene_idx, (duration, screen, label) in enumerate(scenes):
        n_frames = int(duration * FPS)

        if label == "fade" and prev_screen is not None:
            # Find next non-fade screen
            next_screen = None
            for j in range(scene_idx + 1, len(scenes)):
                if scenes[j][2] != "fade":
                    ns = scenes[j][1]
                    if isinstance(ns, str) and ns == "voice_anim":
                        next_screen = render_voice_orb(0, 0.3)
                    elif ns is not None:
                        next_screen = ns
                    break

            if next_screen:
                for f in range(n_frames):
                    t = f / max(1, n_frames - 1)
                    t = ease_in_out(t)
                    frame = crossfade(prev_screen, next_screen, t)
                    frames.append(frame)
                prev_screen = next_screen
            continue

        if isinstance(screen, str) and screen == "voice_anim":
            # Animated voice orb
            for f in range(n_frames):
                t = f / max(1, n_frames - 1)
                # Simulate audio levels
                audio = 0.2 + 0.3 * abs(math.sin(t * 8))
                frame = render_voice_orb(t * 4, audio)
                frames.append(frame)
                prev_screen = frame
        elif screen is not None:
            for _ in range(n_frames):
                frames.append(screen)
            prev_screen = screen

    print(f"  Total frames: {len(frames)} ({len(frames) / FPS:.1f}s)")
    return frames


# ============================================================
# PHASE 4: Audio Generation
# ============================================================

def generate_audio(total_frames):
    """Generate ambient audio for the overview video."""
    sample_rate = 44100
    duration_sec = total_frames / FPS
    n_samples = int(sample_rate * duration_sec)
    audio = np.zeros(n_samples, dtype=np.float64)
    t = np.linspace(0, duration_sec, n_samples)

    # Warm ambient pad
    pad = 0.06 * np.sin(2 * np.pi * 110 * t)
    pad += 0.04 * np.sin(2 * np.pi * 165 * t)  # Fifth
    pad += 0.03 * np.sin(2 * np.pi * 220 * t)  # Octave
    pad += 0.02 * np.sin(2 * np.pi * 277.18 * t)  # Major third

    # Slow LFO modulation
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.15 * t)
    pad *= lfo

    # Fade in/out
    fade_len = int(sample_rate * 2)
    pad[:fade_len] *= np.linspace(0, 1, fade_len)
    pad[-fade_len:] *= np.linspace(1, 0, fade_len)

    audio += pad

    # Gentle chime at scene transitions
    scene_times = [0.5, 3.5, 7.0, 12.5, 16.5, 20.5, 24.5]
    for st in scene_times:
        if st * sample_rate >= n_samples:
            continue
        start = int(st * sample_rate)
        length = int(0.8 * sample_rate)
        end = min(start + length, n_samples)
        seg_t = np.linspace(0, 0.8, end - start)
        chime = 0.08 * np.sin(2 * np.pi * 880 * seg_t) * np.exp(-seg_t * 4)
        chime += 0.05 * np.sin(2 * np.pi * 1320 * seg_t) * np.exp(-seg_t * 5)
        audio[start:end] += chime

    # Normalize
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio = audio / peak * 0.7

    audio_16 = (audio * 32767).astype(np.int16)
    with wave.open(AUDIO_FILE, "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_16.tobytes())

    print(f"  Audio: {AUDIO_FILE}")


# ============================================================
# PHASE 5: Compile Video
# ============================================================

def render_and_save_frames(frames):
    """Save all frames to disk."""
    print("\n[PHASE 3] Saving frames...")
    for i, frame in enumerate(frames):
        if i % FPS == 0:
            print(f"  Frame {i}/{len(frames)} ({i / FPS:.0f}s)")
        frame.save(os.path.join(OUT_DIR, f"frame_{i:05d}.png"))


def compile_video():
    """Use ffmpeg to combine frames + audio."""
    print("\n[PHASE 4] Compiling video...")
    cmd = [
        "ffmpeg", "-y",
        "-framerate", str(FPS),
        "-i", os.path.join(OUT_DIR, "frame_%05d.png"),
        "-i", AUDIO_FILE,
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-shortest",
        VIDEO_FILE,
    ]
    subprocess.run(cmd, check=True)
    print(f"  Video: {VIDEO_FILE}")


def cleanup():
    """Remove temporary files."""
    import glob
    for f in glob.glob(os.path.join(OUT_DIR, "frame_*.png")):
        os.remove(f)
    try:
        os.rmdir(OUT_DIR)
    except OSError:
        pass
    if os.path.exists(AUDIO_FILE):
        os.remove(AUDIO_FILE)
    if os.path.exists(SCREENSHOT_DIR):
        shutil.rmtree(SCREENSHOT_DIR, ignore_errors=True)
    print("  Cleaned up temp files.")


# ============================================================
# MAIN
# ============================================================

def main():
    print("=" * 56)
    print("  CLAUDIO OVERVIEW VIDEO GENERATOR")
    print("  Using Xcode CLI + real app theme")
    print("=" * 56)

    # Phase 1: Capture real simulator screenshots
    screenshots = {}
    if "--no-sim" not in sys.argv:
        screenshots = capture_simulator_screenshots()
    else:
        print("\n[PHASE 1] Skipping simulator (--no-sim flag)")

    # Phase 2: Build video sequence
    frames = build_video_sequence(screenshots)

    # Phase 3: Generate audio
    print("\n[PHASE 2.5] Generating audio...")
    generate_audio(len(frames))

    # Phase 4: Save frames
    render_and_save_frames(frames)

    # Phase 5: Compile
    compile_video()

    # Cleanup
    cleanup()

    print(f"\n{'=' * 56}")
    print(f"  DONE!")
    print(f"  Video: {VIDEO_FILE}")
    print(f"  Duration: {len(frames) / FPS:.1f}s @ {FPS}fps")
    print(f"{'=' * 56}")


if __name__ == "__main__":
    main()
