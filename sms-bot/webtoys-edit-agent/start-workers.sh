#!/bin/bash

# Webtoys Edit Agent - Start Worker System
# This script starts the worker manager instead of the old monitor

echo "🎨 Starting Webtoys Edit Agent Worker System"
echo "=========================================="

# Change to script directory
cd "$(dirname "$0")"

# Check if worker manager is already running
if pgrep -f "worker-manager.js" > /dev/null; then
    echo "⚠️  Worker manager is already running"
    echo "   Run 'pkill -f worker-manager.js' to stop it first"
    exit 1
fi

# Start the worker manager
echo "🚀 Starting worker manager..."
node worker-manager.js

# Note: The worker manager will spawn and manage individual workers