#!/usr/bin/env bash

# WEBTOYS Multi-Worktree Configuration
# ===================================

# Base project directory (where the main .git directory is)
PROJECT_ROOT="/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8"

# Worktree base directory (where worktree directories will be created)
WORKTREE_BASE="$PROJECT_ROOT/../vibeceo8-worktrees"

# Maximum number of simultaneous worktrees
MAX_WORKTREES=3

# Base tmux session name prefix
TMUX_SESSION_PREFIX="wtaf"

# Function to get port configuration for a worktree
get_worktree_ports() {
    local worktree_id="$1"
    case "$worktree_id" in
        1) echo "3030:3000:8000" ;;
        2) echo "3031:3001:8001" ;;
        3) echo "3032:3002:8002" ;;
        *) echo "" ;;
    esac
}

# Function to get tmux color for a worktree
get_tmux_color() {
    local worktree_id="$1"
    case "$worktree_id" in
        1) echo "blue" ;;
        2) echo "green" ;;
        3) echo "yellow" ;;
        *) echo "white" ;;
    esac
}

# Service names (space-separated)
SERVICES="sms-bot web engine ngrok"

# Default branch for new worktrees
DEFAULT_BRANCH="main"

# Paths
SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKTREE_DATA_DIR="$SCRIPTS_DIR/data"
PORT_ALLOCATION_FILE="$WORKTREE_DATA_DIR/port_allocation"
ACTIVE_WORKTREES_FILE="$WORKTREE_DATA_DIR/active_worktrees"

# Health check URLs (space-separated)
HEALTH_CHECK_PATHS="/health /api/health"

# Logging
LOG_DIR="$SCRIPTS_DIR/logs"
LOG_FILE="$LOG_DIR/worktree.log"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Utility functions for logging
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" | tee -a "$LOG_FILE"
}

log_debug() {
    echo -e "${PURPLE}[DEBUG]${NC} $*" | tee -a "$LOG_FILE"
}

# Ensure data and log directories exist
mkdir -p "$WORKTREE_DATA_DIR" "$LOG_DIR"

# Initialize files if they don't exist
[[ ! -f "$PORT_ALLOCATION_FILE" ]] && touch "$PORT_ALLOCATION_FILE"
[[ ! -f "$ACTIVE_WORKTREES_FILE" ]] && touch "$ACTIVE_WORKTREES_FILE"