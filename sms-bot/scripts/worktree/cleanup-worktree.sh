#!/bin/bash

# Safe Worktree Cleanup Script
# Removes worktrees and securely deletes all .env files
# Usage: ./cleanup-worktree.sh [worktree-id or branch-name]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get worktree identifier
IDENTIFIER="${1}"

if [ -z "$IDENTIFIER" ]; then
    echo -e "${RED}Usage: $0 [worktree-id or branch-name]${NC}"
    echo "Examples:"
    echo "  $0 2                # Remove worktree 2"
    echo "  $0 my-feature       # Remove worktree with branch my-feature"
    echo "  $0 all              # Remove ALL worktrees and clean up"
    exit 1
fi

PROJECT_ROOT="/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8"
WORKTREE_BASE="$PROJECT_ROOT/../vibeceo8-worktrees"

# Function to securely remove .env files
secure_remove_env_files() {
    local path="$1"
    echo -e "${YELLOW}🔒 Securely removing .env files from $path${NC}"
    
    # Find and list all .env files
    local env_files=$(find "$path" -name ".env*" -type f 2>/dev/null || true)
    
    if [ -z "$env_files" ]; then
        echo "   No .env files found"
    else
        echo "$env_files" | while read -r file; do
            if [ -f "$file" ]; then
                echo "   Removing: $file"
                # Overwrite with random data before deleting (more secure)
                dd if=/dev/urandom of="$file" bs=1024 count=10 2>/dev/null || true
                rm -f "$file"
            fi
        done
    fi
}

# Function to remove a single worktree
remove_worktree() {
    local worktree_path="$1"
    local branch_name=$(basename "$worktree_path" | sed 's/worktree-[0-9]-//')
    
    echo -e "${YELLOW}📦 Removing worktree: $worktree_path${NC}"
    
    # First, secure remove all .env files
    if [ -d "$worktree_path" ]; then
        secure_remove_env_files "$worktree_path"
    fi
    
    # Kill any tmux sessions for this worktree
    for i in {1..3}; do
        tmux kill-session -t "wtaf-$i" 2>/dev/null || true
    done
    
    # Remove the git worktree
    cd "$PROJECT_ROOT"
    git worktree remove "$worktree_path" --force 2>/dev/null || true
    
    # Double-check: remove directory if still exists
    if [ -d "$worktree_path" ]; then
        echo -e "${YELLOW}   Force removing directory${NC}"
        rm -rf "$worktree_path"
    fi
    
    # Prune worktree references
    git worktree prune
    
    echo -e "${GREEN}✅ Worktree removed and .env files securely deleted${NC}"
}

# Handle different input types
if [ "$IDENTIFIER" = "all" ]; then
    echo -e "${RED}⚠️  WARNING: This will remove ALL worktrees!${NC}"
    echo "Press Enter to continue or Ctrl+C to cancel..."
    read
    
    # Find all worktrees
    if [ -d "$WORKTREE_BASE" ]; then
        for worktree in "$WORKTREE_BASE"/worktree-*; do
            if [ -d "$worktree" ]; then
                remove_worktree "$worktree"
            fi
        done
    fi
    
    # Clean up any orphaned tmux sessions
    for i in {1..3}; do
        tmux kill-session -t "wtaf-$i" 2>/dev/null || true
    done
    
    echo -e "${GREEN}✅ All worktrees cleaned up${NC}"
    
elif [[ "$IDENTIFIER" =~ ^[0-9]+$ ]]; then
    # It's a worktree ID number
    WORKTREE_PATTERN="$WORKTREE_BASE/worktree-${IDENTIFIER}-*"
    WORKTREE_PATH=$(ls -d $WORKTREE_PATTERN 2>/dev/null | head -1)
    
    if [ -z "$WORKTREE_PATH" ] || [ ! -d "$WORKTREE_PATH" ]; then
        echo -e "${RED}Error: No worktree found with ID $IDENTIFIER${NC}"
        exit 1
    fi
    
    remove_worktree "$WORKTREE_PATH"
    
else
    # It's a branch name
    WORKTREE_PATTERN="$WORKTREE_BASE/worktree-*-${IDENTIFIER}"
    WORKTREE_PATH=$(ls -d $WORKTREE_PATTERN 2>/dev/null | head -1)
    
    if [ -z "$WORKTREE_PATH" ] || [ ! -d "$WORKTREE_PATH" ]; then
        echo -e "${RED}Error: No worktree found with branch $IDENTIFIER${NC}"
        exit 1
    fi
    
    remove_worktree "$WORKTREE_PATH"
fi

# Final cleanup - remove worktree base if empty
if [ -d "$WORKTREE_BASE" ]; then
    if [ -z "$(ls -A "$WORKTREE_BASE" 2>/dev/null)" ]; then
        echo -e "${YELLOW}Removing empty worktree base directory${NC}"
        rmdir "$WORKTREE_BASE"
    fi
fi

# List remaining worktrees (if any)
echo ""
echo "Current worktrees:"
cd "$PROJECT_ROOT"
git worktree list

echo ""
echo -e "${GREEN}🔒 Cleanup complete - all .env files securely removed${NC}"