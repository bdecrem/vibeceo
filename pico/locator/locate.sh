#!/bin/bash
# Location guesser — sends an image to Qwen 3.5 via Ollama for location recognition
# Usage: ./locate.sh <image_path>

set -e

if [ -z "$1" ]; then
  echo "Usage: ./locate.sh <path-to-image>"
  echo "Example: ./locate.sh ~/Desktop/photo.jpg"
  exit 1
fi

IMAGE_PATH="$1"

if [ ! -f "$IMAGE_PATH" ]; then
  echo "Error: File not found: $IMAGE_PATH"
  exit 1
fi

echo "Analyzing image... (this takes ~60s on M1)"

IMAGE_B64=$(base64 -i "$IMAGE_PATH" | tr -d '\n')

TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

cat > "$TMPFILE" <<ENDJSON
{
  "model": "qwen3.5:4b",
  "prompt": "You are a location recognition expert. Look at this image and determine WHERE it was taken. Provide: 1) Your best guess for the specific location (city, neighborhood, landmark) 2) Country 3) Confidence level (high/medium/low) 4) Key visual clues that led to your guess. Be specific. If you recognize a landmark, name it. /no_think",
  "images": ["$IMAGE_B64"],
  "stream": false,
  "options": {"num_predict": 500}
}
ENDJSON

RESPONSE=$(curl -s http://localhost:11434/api/generate -d @"$TMPFILE" 2>&1)

echo "$RESPONSE" | python3 -c "
import sys, json, re
try:
    d = json.load(sys.stdin)
    # Check both response and thinking fields
    resp = d.get('response', '')
    thinking = d.get('thinking', '')
    resp = re.sub(r'<think>.*?</think>', '', resp, flags=re.DOTALL).strip()
    if resp:
        print(resp)
    elif thinking:
        print(thinking.strip())
    else:
        print('Error:', json.dumps(d, indent=2))
except Exception as e:
    print('Error parsing response:', e)
"
