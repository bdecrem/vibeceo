#!/bin/bash
echo "🧪 Testing Issue Tracker Pipeline..."
echo ""
echo "This will run in dry-run mode without making actual changes"
echo ""

# Run reformulation only (safe)
ENABLE_AUTO_FIX=false node monitor.js --reformulate

echo ""
echo "✅ Test complete. To run the full pipeline:"
echo "  ENABLE_AUTO_FIX=true node monitor.js"
