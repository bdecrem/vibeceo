#!/bin/bash

echo "🎨 Starting Image Gallery Server..."
echo "📁 Serving from: $(pwd)"
echo "🌐 URL: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Use Python's built-in HTTP server
cd "$(dirname "$0")"
python3 -m http.server 3000