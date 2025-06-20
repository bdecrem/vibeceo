#!/bin/bash

echo "🚀 Starting SMS Bot Production Services (TypeScript)..."
echo "📁 Current directory: $(pwd)"
echo "📁 Directory contents: $(ls -la)"

# Build the TypeScript first
echo "🔨 Building TypeScript..."
npm run build

# Start the SMS bot in the background
echo "📱 Starting SMS bot..."
npm run start:prod &
SMS_PID=$!

# Start TypeScript engine from the current directory
echo "⚡ Starting TypeScript WTAF engine..."
echo "📁 Looking for start-engine.js at: $(pwd)/dist/scripts/start-engine.js"
if [ -f "dist/scripts/start-engine.js" ]; then
    node dist/scripts/start-engine.js &
    ENGINE_PID=$!
    echo "✅ TypeScript engine started with PID: $ENGINE_PID"
else
    echo "❌ start-engine.js not found at $(pwd)/dist/scripts/start-engine.js"
    echo "📁 Contents of dist/scripts directory: $(ls -la dist/scripts/ 2>/dev/null || echo 'dist/scripts directory not found')"
    echo "🔨 Try running 'npm run build' first"
fi

echo "✅ Services started:"
echo "   SMS Bot PID: $SMS_PID"
echo "   TypeScript Engine PID: ${ENGINE_PID:-'FAILED'}"

# Function to cleanup on exit
cleanup() {
    echo "🛑 Shutting down services..."
    kill $SMS_PID ${ENGINE_PID:-} 2>/dev/null
    exit
}

# Set up signal handlers
trap cleanup SIGTERM SIGINT

# Wait for both processes (only wait for engine if it started)
if [ -n "$ENGINE_PID" ]; then
    wait $SMS_PID $ENGINE_PID
else
    echo "⚠️ Only waiting for SMS bot since TypeScript engine failed to start"
    wait $SMS_PID
fi 