#!/bin/bash
# Reolink watcher — takes a pic every minute, compares with previous via Qwen 3.5
# Sends a macOS notification + saves the image when something changes
# Usage: ./watch.sh [interval_seconds]
#   Default interval: 60 seconds
#   Ctrl+C to stop

set -e

INTERVAL=${1:-60}
CAMERA_IP="192.168.7.22"
CAMERA_USER="admin"
CAMERA_PASS="8iguana61"
WATCH_DIR="/tmp/reolink-watch"
CHANGES_DIR="$WATCH_DIR/changes"

mkdir -p "$WATCH_DIR" "$CHANGES_DIR"

TOKEN=""
TOKEN_TIME=0

get_token() {
  TOKEN=$(curl -sk -X POST "https://$CAMERA_IP:443/cgi-bin/api.cgi?cmd=Login" \
    -H "Content-Type: application/json" \
    -d "[{\"cmd\":\"Login\",\"action\":0,\"param\":{\"User\":{\"userName\":\"$CAMERA_USER\",\"password\":\"$CAMERA_PASS\"}}}]" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['value']['Token']['name'])")
  TOKEN_TIME=$(date +%s)
}

snap() {
  # Refresh token every 50 min (expires at 60)
  local now=$(date +%s)
  if [ -z "$TOKEN" ] || [ $((now - TOKEN_TIME)) -gt 3000 ]; then
    get_token
  fi
  curl -sk -o "$1" \
    "https://$CAMERA_IP:443/cgi-bin/api.cgi?cmd=Snap&channel=0&token=$TOKEN"
}

compare_images() {
  # Returns "SAME" or "DIFFERENT" (+ explanation)
  local img1="$1" img2="$2"
  local b1 b2 tmpfile result

  b1=$(base64 -i "$img1" | tr -d '\n')
  b2=$(base64 -i "$img2" | tr -d '\n')

  tmpfile=$(mktemp)
  trap "rm -f $tmpfile" RETURN

  cat > "$tmpfile" <<ENDJSON
{
  "model": "qwen3.5:4b",
  "prompt": "Compare these two security camera images. Has anything meaningfully changed? Ignore minor lighting shifts or noise. Focus on: people appearing/leaving, objects moved, doors opening, pets, etc. Answer SAME if nothing meaningful changed, or DIFFERENT if something notable happened. First line must be just SAME or DIFFERENT. Second line: brief explanation. /no_think",
  "images": ["$b1", "$b2"],
  "stream": false,
  "options": {"num_predict": 150}
}
ENDJSON

  result=$(curl -s http://localhost:11434/api/generate -d @"$tmpfile" 2>&1 | python3 -c "
import sys, json, re
try:
    d = json.load(sys.stdin)
    resp = d.get('response', '')
    resp = re.sub(r'<think>.*?</think>', '', resp, flags=re.DOTALL).strip()
    print(resp if resp else 'ERROR')
except:
    print('ERROR')
")
  echo "$result"
}

notify() {
  local msg="$1"
  local img="$2"
  # macOS notification
  osascript -e "display notification \"$msg\" with title \"🏠 Living Room\" sound name \"Glass\"" 2>/dev/null || true
  echo "[$(date '+%H:%M:%S')] CHANGE: $msg"
  echo "  Saved: $img"
}

echo "🏠 Reolink Watcher starting (every ${INTERVAL}s)"
echo "   Camera: $CAMERA_IP"
echo "   Changes saved to: $CHANGES_DIR"
echo "   Press Ctrl+C to stop"
echo ""

# Take initial snapshot
PREV="$WATCH_DIR/prev.jpg"
snap "$PREV"
echo "[$(date '+%H:%M:%S')] Initial snapshot taken"

while true; do
  sleep "$INTERVAL"

  CURR="$WATCH_DIR/curr.jpg"
  snap "$CURR"

  echo -n "[$(date '+%H:%M:%S')] Comparing... "

  RESULT=$(compare_images "$PREV" "$CURR")
  FIRST_LINE=$(echo "$RESULT" | head -1 | tr -d '[:space:]')

  if [ "$FIRST_LINE" = "DIFFERENT" ]; then
    EXPLANATION=$(echo "$RESULT" | tail -n +2 | head -1)
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    SAVE_PATH="$CHANGES_DIR/change_${TIMESTAMP}.jpg"
    cp "$CURR" "$SAVE_PATH"
    notify "$EXPLANATION" "$SAVE_PATH"
  else
    echo "no change"
  fi

  # Current becomes previous
  mv "$CURR" "$PREV"
done
