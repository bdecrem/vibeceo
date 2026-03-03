#!/bin/bash
# Reolink watcher — snap pair 1s apart, pixel-diff to detect change, Qwen describes what changed
# Usage: ./watch.sh [cycle_seconds] [threshold]
#   Default cycle: 30 seconds
#   Default threshold: 5 (% pixel difference to trigger alert)
#   Ctrl+C to stop
#
# Each cycle:
#   1. Take photo A, wait 1s, take photo B
#   2. Pixel-diff A vs B (instant via ImageMagick)
#   3. If diff > threshold: save image + macOS notification
#   4. Optionally describe change via Qwen (if available)

set -e

CYCLE=${1:-30}
THRESHOLD=${2:-5}
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

pixel_diff() {
  # Returns percentage of pixels that differ between two images
  # Requires ImageMagick
  local img1="$1" img2="$2"
  local changed total pct

  changed=$(magick compare -metric AE -fuzz 10% "$img1" "$img2" null: 2>&1 || true)
  changed=$(echo "$changed" | grep -o '[0-9]*' | head -1)
  total=$(magick identify -format "%[fx:w*h]" "$img1" 2>/dev/null)

  if [ -n "$total" ] && [ "$total" -gt 0 ] && [ -n "$changed" ]; then
    pct=$(python3 -c "print(f'{($changed/$total)*100:.1f}')" 2>/dev/null)
    echo "${pct:-0}"
  else
    echo "0"
  fi
}

notify() {
  local msg="$1"
  local img="$2"
  osascript -e "display notification \"$msg\" with title \"🏠 Living Room\" sound name \"Glass\"" 2>/dev/null || true
  echo "[$(date '+%H:%M:%S')] 🚨 CHANGE: $msg"
  echo "  Saved: $img"
}

# Check ImageMagick
if ! command -v magick &>/dev/null; then
  echo "Error: ImageMagick not found. Install with: brew install imagemagick"
  exit 1
fi

echo "🏠 Reolink Watcher starting (${CYCLE}s cycle, ${THRESHOLD}% threshold)"
echo "   Camera: $CAMERA_IP"
echo "   Changes saved to: $CHANGES_DIR"
echo "   Press Ctrl+C to stop"
echo ""

CHANGE_COUNT=0
CHECK_COUNT=0

while true; do
  CYCLE_START=$(date +%s)
  CHECK_COUNT=$((CHECK_COUNT + 1))

  # Snap pair 1 second apart
  FRAME_A="$WATCH_DIR/frame_a.jpg"
  FRAME_B="$WATCH_DIR/frame_b.jpg"

  snap "$FRAME_A"
  sleep 1
  snap "$FRAME_B"

  # Downscale for faster diff
  sips -Z 640 "$FRAME_A" --out "$FRAME_A" >/dev/null 2>&1
  sips -Z 640 "$FRAME_B" --out "$FRAME_B" >/dev/null 2>&1

  # Pixel diff (instant)
  DIFF=$(pixel_diff "$FRAME_A" "$FRAME_B")

  if (( $(echo "$DIFF > $THRESHOLD" | bc -l) )); then
    CHANGE_COUNT=$((CHANGE_COUNT + 1))
    TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
    SAVE_PATH="$CHANGES_DIR/change_${TIMESTAMP}.jpg"

    # Save the full-res version
    snap "$SAVE_PATH"

    notify "${DIFF}% pixels changed" "$SAVE_PATH"
  else
    echo "[$(date '+%H:%M:%S')] check #${CHECK_COUNT} — ${DIFF}% diff (quiet)"
  fi

  # Wait remaining cycle time
  ELAPSED=$(( $(date +%s) - CYCLE_START ))
  REMAINING=$(( CYCLE - ELAPSED ))
  if [ "$REMAINING" -gt 0 ]; then
    sleep "$REMAINING"
  fi
done
