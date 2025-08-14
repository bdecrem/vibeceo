#!/usr/bin/env bash

echo "=== WEBTOYS Multi-Worktree System Test ==="
echo "Scripts location: $(pwd)"
echo ""

# Test that basic files exist
echo "Checking files:"
for file in config.sh wtaf-worktree.sh status.sh health-check.sh; do
    if [[ -f "$file" ]]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file"
    fi
done

echo ""

# Test basic functionality
echo "Testing basic functions:"
source config.sh 2>/dev/null && echo "  ✅ Config loads" || echo "  ❌ Config failed"

# Test port function
ports=$(get_worktree_ports 1) && echo "  ✅ Port function: $ports" || echo "  ❌ Port function failed"

# Test data directory
if [[ -d "data" ]]; then
    echo "  ✅ Data directory exists"
else
    mkdir -p data logs
    touch data/active_worktrees data/port_allocation
    echo "  ✅ Created data directory"
fi

echo ""
echo "=== Status Test ==="
if [[ -s "data/active_worktrees" ]]; then
    echo "Active worktrees found:"
    cat data/active_worktrees
else
    echo "No active worktrees (this is normal for first run)"
fi

echo ""
echo "=== Ready! ==="
echo "The multi-worktree system is installed and ready to use."
echo ""
echo "To start your first worktree:"
echo "  ./wtaf-worktree.sh start my-feature-branch"