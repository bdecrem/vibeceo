#!/bin/bash
# Nova Scan — runs plain Claude Code with prompt-nova.txt, posts to #shipshot as Drift
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROMPT_FILE="$SCRIPT_DIR/prompt-nova.txt"
CHANNEL_ID="1472651712677286039"
OUTPUT_FILE="$SCRIPT_DIR/nova-scan-$(date +%Y%m%d).md"
POST_DISCORD=true

# Parse flags
for arg in "$@"; do
  case $arg in
    --no-discord) POST_DISCORD=false ;;
  esac
done

# Get Drift's Discord token from openclaw config (skip if not posting)
DRIFT_TOKEN=""
if [ "$POST_DISCORD" = true ]; then
  DRIFT_TOKEN=$(python3 -c "
import json
with open('$HOME/.openclaw/openclaw.json') as f:
    c = json.load(f)
print(c['channels']['discord']['accounts']['drift']['token'])
")
fi

echo "🔍 Running Nova ideation scan via Claude Code..."
echo "   Output: $OUTPUT_FILE"

# Run Claude Code with the raw prompt — no SOUL, no agents, just the prompt
# --max-turns: enough room for web searches + full report output
# --output-format text: plain text output (no JSON wrapping)
claude --print --dangerously-skip-permissions \
  --max-turns 30 \
  --output-format text \
  "$(cat "$PROMPT_FILE")" \
  > "$OUTPUT_FILE" 2>/dev/null

# Validate output — should be substantial (full report is 300+ lines)
LINE_COUNT=$(wc -l < "$OUTPUT_FILE")
if [ "$LINE_COUNT" -lt 50 ]; then
  echo "⚠️  Warning: Output is only $LINE_COUNT lines — report may be truncated"
  echo "   Check $OUTPUT_FILE"
fi

echo "✅ Scan complete: $OUTPUT_FILE ($LINE_COUNT lines)"

if [ "$POST_DISCORD" = false ]; then
  echo "🎯 Nova scan complete (Discord posting skipped — use without --no-discord to post)"
  exit 0
fi

echo "📡 Posting to #shipshot..."

# Discord has a 2000 char limit per message — split into chunks
export DRIFT_TOKEN CHANNEL_ID OUTPUT_FILE
python3 << 'PYEOF'
import requests, sys, os, time

token = os.environ.get("DRIFT_TOKEN") or sys.exit("No token")
channel_id = os.environ.get("CHANNEL_ID") or sys.exit("No channel")
output_file = os.environ.get("OUTPUT_FILE") or sys.exit("No output file")

with open(output_file) as f:
    content = f.read()

if not content.strip():
    print("❌ Empty output, skipping post")
    sys.exit(1)

# Split by ## headers to keep ideas together
sections = []
current = ""
for line in content.split("\n"):
    if line.startswith("## ") and current:
        sections.append(current.strip())
        current = line + "\n"
    else:
        current += line + "\n"
if current.strip():
    sections.append(current.strip())

# Merge small sections, split large ones at 1900 chars
messages = []
buf = ""
for section in sections:
    if len(buf) + len(section) + 2 > 1900:
        if buf:
            messages.append(buf)
        # If single section > 1900, chunk it
        while len(section) > 1900:
            messages.append(section[:1900])
            section = section[1900:]
        buf = section
    else:
        buf = buf + "\n\n" + section if buf else section
if buf:
    messages.append(buf)

headers = {
    "Authorization": f"Bot {token}",
    "Content-Type": "application/json"
}

url = f"https://discord.com/api/v10/channels/{channel_id}/messages"

for i, msg in enumerate(messages):
    r = requests.post(url, headers=headers, json={"content": msg})
    if r.status_code == 200:
        print(f"  Posted chunk {i+1}/{len(messages)}")
    else:
        print(f"  ❌ Failed chunk {i+1}: {r.status_code} {r.text}")
    if i < len(messages) - 1:
        time.sleep(1)  # Rate limit

print(f"📡 Done — {len(messages)} messages posted to #shipshot")
PYEOF

echo "🎯 Nova scan complete!"
