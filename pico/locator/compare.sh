#!/bin/bash
# Image comparator — sends two images to Qwen 3.5 via Ollama to check if they're the same or different
# Usage: ./compare.sh <image1> <image2>

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./compare.sh <image1> <image2>"
  echo "Example: ./compare.sh photo_a.jpg photo_b.jpg"
  exit 1
fi

IMAGE1="$1"
IMAGE2="$2"

for img in "$IMAGE1" "$IMAGE2"; do
  if [ ! -f "$img" ]; then
    echo "Error: File not found: $img"
    exit 1
  fi
done

echo "Comparing images..."

IMG1_B64=$(base64 -i "$IMAGE1" | tr -d '\n')
IMG2_B64=$(base64 -i "$IMAGE2" | tr -d '\n')

TMPFILE=$(mktemp)
trap "rm -f $TMPFILE" EXIT

cat > "$TMPFILE" <<ENDJSON
{
  "model": "qwen3.5:4b",
  "prompt": "Compare these two images. Are they the same scene/place/thing or different? Answer with SAME or DIFFERENT on the first line, then briefly explain why in one sentence. /no_think",
  "images": ["$IMG1_B64", "$IMG2_B64"],
  "stream": false,
  "options": {"num_predict": 200}
}
ENDJSON

RESPONSE=$(curl -s http://localhost:11434/api/generate -d @"$TMPFILE" 2>&1)

echo "$RESPONSE" | python3 -c "
import sys, json, re
try:
    d = json.load(sys.stdin)
    resp = d.get('response', '')
    resp = re.sub(r'<think>.*?</think>', '', resp, flags=re.DOTALL).strip()
    if resp:
        print(resp)
    else:
        print('Error:', json.dumps(d, indent=2))
except Exception as e:
    print('Error parsing response:', e)
"
