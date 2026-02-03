#!/bin/bash
# Migrate drawer/ files to ~/.amber/memory/
# Run once to set up the new memory system

MEMORY_DIR="$HOME/.amber/memory"
DRAWER_DIR="/Users/bart/Documents/code/vibeceo/drawer"

echo "Migrating Amber's memory to $MEMORY_DIR..."

# Create memory directory
mkdir -p "$MEMORY_DIR"

# Copy identity files
if [ -f "$DRAWER_DIR/PERSONA.md" ]; then
  cp "$DRAWER_DIR/PERSONA.md" "$MEMORY_DIR/"
  echo "✓ Copied PERSONA.md"
else
  echo "⚠ PERSONA.md not found in drawer/"
fi

if [ -f "$DRAWER_DIR/MEMORY.md" ]; then
  cp "$DRAWER_DIR/MEMORY.md" "$MEMORY_DIR/"
  echo "✓ Copied MEMORY.md"
else
  echo "⚠ MEMORY.md not found in drawer/"
fi

echo ""
echo "Migration complete. Memory directory contents:"
ls -la "$MEMORY_DIR"

echo ""
echo "drawer/ files preserved as backup in git"
echo ""
echo "The daemon will now load identity from ~/.amber/memory/"
echo "Daily logs will be created automatically as YYYY-MM-DD.md"
