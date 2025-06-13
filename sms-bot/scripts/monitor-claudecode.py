
import os
import time
import subprocess
from pathlib import Path
from datetime import datetime

WATCH_DIR = "/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/code/"
PROCESSED_DIR = "/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/processed/"
CLAUDE_OUTPUT_DIR = "/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/data/claude_outputs/"
WEB_OUTPUT_DIR = "/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/public/lab/"
CHECK_INTERVAL = 30

os.makedirs(PROCESSED_DIR, exist_ok=True)
os.makedirs(CLAUDE_OUTPUT_DIR, exist_ok=True)
os.makedirs(WEB_OUTPUT_DIR, exist_ok=True)
os.makedirs(os.path.join(WEB_OUTPUT_DIR, "outputs"), exist_ok=True)

def log_with_timestamp(message):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {message}")

def get_newest_file(directory):
    files = [f for f in Path(directory).glob("*.txt") if f.is_file()]
    if not files:
        return None
    return max(files, key=os.path.getctime)

def extract_code_blocks(stdout):
    lines = stdout.split('\n')
    in_block = False
    code_lines = []

    for line in lines:
        if line.strip().startswith("```"):
            in_block = not in_block
            continue
        if in_block:
            code_lines.append(line)
    return '\n'.join(code_lines)

def save_code_to_file(code, coach, slug, format="html"):
    filename = f"{slug}.html"
    output_dir = "/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/public/lab/"
    os.makedirs(output_dir, exist_ok=True)
    filepath = os.path.join(output_dir, filename)

    with open(filepath, 'w') as f:
        f.write(code)

    log_with_timestamp(f"💾 Saved HTML to: {filepath}")
    public_url = f"http://theaf-web.ngrok.io/lab/{filename}"
    return filename, public_url

    filename = f"{slug}.{format}"

    output_dir = f"/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/content/lab/{coach}/"
    os.makedirs(output_dir, exist_ok=True)

    filepath = os.path.join(output_dir, filename)
    with open(filepath, 'w') as f:
        f.write(code)

    log_with_timestamp(f"💾 Saved markdown to: {filepath}")
    public_url = f"http://localhost:3000/lab/{coach}/{slug}"
    return filename, public_url

def send_confirmation_sms(message):
    try:
        log_with_timestamp(f"📱 Sending confirmation SMS: {message}")
        result = subprocess.run(
            ["npx", "tsx", "send-direct-sms.ts", message],
            capture_output=True,
            text=True,
            cwd="."
        )
        if result.returncode == 0:
            log_with_timestamp("✅ Confirmation SMS sent successfully")
        else:
            log_with_timestamp(f"❌ Failed to send SMS: {result.stderr}")
    except Exception as e:
        log_with_timestamp(f"💥 Error sending SMS: {e}")
def execute_claude_code(prompt_file):
    log_with_timestamp(f"📖 Reading prompt file: {prompt_file}")

    with open(prompt_file, 'r') as f:
        raw_prompt = f.read().strip()

    # Format expected: "kailey - embracing-failure - actual prompt text"
    if "-" in raw_prompt:
        parts = raw_prompt.split("-", 2)
        coach = parts[0].strip().lower()
        slug = parts[1].strip().lower().replace(" ", "-")
        actual_prompt = parts[2].strip()
    else:
        coach = "default"
        slug = "untitled"
        actual_prompt = raw_prompt

    # Inject personality prompt
    personality = f"""
You are {coach.upper()}, an AI coach. Speak in their voice.
Now write a full HTML page called "{slug.replace('-', ' ').title()}".
Only return the HTML code wrapped in a code block.
"""

    prompt = personality + "\n\n" + actual_prompt

    log_with_timestamp(f"📝 FULL PROMPT:\n{prompt}")
    log_with_timestamp(f"📏 Prompt length: {len(prompt)} characters")

    result = subprocess.run(
        ["claude", "--print", prompt],
        capture_output=True,
        text=True,
        cwd="/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot",
        timeout=300
    )

    output_file = os.path.join(
        CLAUDE_OUTPUT_DIR,
        f"output_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    )
    with open(output_file, 'w') as f:
        f.write(result.stdout)

    if result.stdout:
        code = extract_code_blocks(result.stdout)
        if code:
            filename, public_url = save_code_to_file(code, coach=coach, slug=slug)
            log_with_timestamp(f"🌐 Public URL: {public_url}")
            send_confirmation_sms(f"✅ Output saved: {public_url}")
        else:
            log_with_timestamp("⚠️ No code block found in Claude output.")
    else:
        log_with_timestamp("⚠️ No stdout from Claude.")

    return result.returncode == 0

def move_to_processed(file_path):
    target = os.path.join(PROCESSED_DIR, os.path.basename(file_path))
    os.rename(file_path, target)
    log_with_timestamp(f"📦 Moved file to: {target}")

def monitor_loop():
    log_with_timestamp("🎬 Starting Claude Code monitor...")
    log_with_timestamp(f"👀 Watching directory: {WATCH_DIR}")
    log_with_timestamp(f"📁 Processed directory: {PROCESSED_DIR}")
    log_with_timestamp(f"⏰ Check interval: {CHECK_INTERVAL} seconds")

    processed = set()

    while True:
        try:
            newest = get_newest_file(WATCH_DIR)
            if newest and str(newest) not in processed:
                log_with_timestamp(f"🚨 New file detected: {newest}")
                if execute_claude_code(str(newest)):
                    move_to_processed(str(newest))
                    processed.add(str(newest))
                    log_with_timestamp("✅ File processed successfully.")
                else:
                    log_with_timestamp("❌ Claude execution failed.")
            else:
                log_with_timestamp("📭 No new files to process.")
            time.sleep(CHECK_INTERVAL)
        except KeyboardInterrupt:
            log_with_timestamp("🛑 Monitor stopped by user.")
            break
        except Exception as e:
            log_with_timestamp(f"💥 ERROR: {e}")
            time.sleep(CHECK_INTERVAL)

monitor_loop()
