#!/bin/bash
# Reolink watcher — snap pair 1s apart, compare via Qwen 3.5, repeat every cycle
# Sends a macOS notification + saves the image when something changes
# Usage: ./watch.sh [cycle_seconds]
#   Default cycle: 120 seconds (2 min between comparisons)
#   Ctrl+C to stop
#
# Each cycle:
#   1. Take photo A
#   2. Wait 1 second
#   3. Take photo B
#   4. Wait 10 seconds (let system breathe)
#   5. Compare A vs B via Qwen 3.5 (~60s on M1)
#   6. Wait remaining cycle time, then repeat

set -e

CYCLE=${1:-120}
SNAP_GAP=1
PRE_COMPARE_WAIT=10
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
  local now=$(date +%s)
  if [ -z "$TOKEN" ] || [ $((now - TOKEN_TIME)) -gt 3000 ]; then
    get_token
  fi
  curl -sk -o "$1" \
    "https://$CAMERA_IP:443/cgi-bin/api.cgi?cmd=Snap&channel=0&token=$TOKEN"
}

compare_images() {
  local img1="$1" img2="$2"
  local b1 b2 tmpfile result

  b1=$(base64 -i "$img1" | tr -d '\n')
  b2=$(base64 -i "$img2" | tr -d '\n')

  tmpfile=$(mktemp)
  trap "rm -f $tmpfile" RETURN

  cat > "$tmpfile" <<ENDJSON
{
  "model": "qwen3.5:4b",
  "prompt": "Compare these two security camera images taken 1 second apart. Has anything meaningfully changed? Ignore compression artifacts and minor noise. Focus on: people appearing/leaving/moving, objects moved, doors opening/closing, pets, vehicles. First line must be just SAME or DIFFERENT. Second line: brief explanation of what changed (or 'no change'). /no_think",
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
  osascript -e "display notification \"$msg\" with title \"🏠 Living Room\" sound name \"Glass\"" 2>/dev/null || true
  echo "[$(date '+%H:%M:%S')] CHANGE: $msg"
  echo "  Saved: $img"
}

echo "🏠 Reolink Watcher starting (${CYCLE}s cycle)"
echo "   Snap pair (1s gap) → wait 10s → compare → wait for next cycle"
echo "   Camera: $CAMERA_IP"
echo "   Changes saved to: $CHANGES_DIR"
echo "   Press Ctrl+C to stop"
echo ""

while true; do
  CYCLE_START=$(date +%s)

  # Step 1 & 2: Take two photos 1 second apart
  FRAME_A="$WATCH_DIR/frame_a.jpg"
  FRAME_B="$WATCH_DIR/frame_b.jpg"

  snap "$FRAME_A"
  sleep "$SNAP_GAP"
  snap "$FRAME_B"
  echo -n "[$(date '+%H:%M:%S')] Snapped pair. "

  # Step 3: Breathe
  sleep "$PRE_COMPARE_WAIT"

  # Step 4: Compare
  echo -n "Comparing... "
  RESULT=$(compare_images "$FRAME_A" "$FRAME_B")
  FIRST_LINE=$(echo "$RESULT" | head -1 | tr -d '[:space:]')

  if [ "$FIRST_LINE" = "DIFFERENT" ]; then
    EXPLANATION=$(echo "$RESULT" | tail -n +2 | head -1)
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    SAVE_PATH="$CHANGES_DIR/change_${TIMESTAMP}.jpg"
    cp "$FRAME_B" "$SAVE_PATH"
    notify "$EXPLANATION" "$SAVE_PATH"
  else
    echo "no change"
  fi

  # Step 5: Wait remaining cycle time
  ELAPSED=$(( $(date +%s) - CYCLE_START ))
  REMAINING=$(( CYCLE - ELAPSED ))
  if [ "$REMAINING" -gt 0 ]; then
    sleep "$REMAINING"
  fi
done
