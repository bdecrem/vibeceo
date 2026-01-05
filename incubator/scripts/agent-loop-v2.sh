#!/bin/bash

# Agent Loop Script v2 - Simplified
# Runs Token Tank agents in sequence with non-interactive Claude mode

set -e  # Exit on error

# Set PATH for cron compatibility (Linux and Mac)
export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:$PATH"

# Find claude command (try multiple locations for cross-platform compatibility)
CLAUDE_CMD=""
if command -v claude &> /dev/null; then
    CLAUDE_CMD="claude"
elif [ -f "$HOME/.local/bin/claude" ]; then
    CLAUDE_CMD="$HOME/.local/bin/claude"
elif [ -f "/usr/local/bin/claude" ]; then
    CLAUDE_CMD="/usr/local/bin/claude"
elif [ -f "/opt/homebrew/bin/claude" ]; then
    CLAUDE_CMD="/opt/homebrew/bin/claude"
else
    echo "Error: claude command not found"
    echo "Please ensure Claude Code is installed and in your PATH"
    echo "Checked: \$PATH, ~/.local/bin, /usr/local/bin, /opt/homebrew/bin"
    exit 1
fi

echo "Using claude at: $(command -v $CLAUDE_CMD || echo $CLAUDE_CMD)"

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_FILE="$SCRIPT_DIR/agent-loop.log"

# Default agents
DEFAULT_AGENTS=("boss" "forge" "nix" "drift" "pulse" "echo")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    echo -e "${1}" | tee -a "$LOG_FILE"
}

log_silent() {
    echo -e "${1}" >> "$LOG_FILE"
}

# Print usage
usage() {
    echo "Usage: $0 [OPTIONS] [agent1 agent2 ...]"
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help"
    echo "  -a, --all           Run all default agents"
    echo "  -y, --yes           Skip confirmation prompt"
    echo ""
    echo "Examples:"
    echo "  $0 --all            # Run all agents"
    echo "  $0 boss echo        # Run boss and echo"
    echo "  $0 -y boss          # Run boss without confirmation"
    echo ""
    exit 0
}

# Parse arguments
AGENTS=()
RUN_ALL=false
SKIP_CONFIRM=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            ;;
        -a|--all)
            RUN_ALL=true
            shift
            ;;
        -y|--yes)
            SKIP_CONFIRM=true
            shift
            ;;
        *)
            AGENTS+=("$1")
            shift
            ;;
    esac
done

# Determine which agents to run
if [ "$RUN_ALL" = true ]; then
    AGENTS=("${DEFAULT_AGENTS[@]}")
elif [ ${#AGENTS[@]} -eq 0 ]; then
    echo -e "${RED}Error: No agents specified${NC}"
    echo "Use --all or specify agent names"
    exit 1
fi

# Print configuration
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Token Tank Agent Loop${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Agents: ${AGENTS[*]}"
echo "  Log file: $LOG_FILE"
echo "  Working dir: $PROJECT_DIR"
echo ""

# Confirm execution
if [ "$SKIP_CONFIRM" = false ]; then
    read -p "Start agent loop? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled"
        exit 0
    fi
fi

# Start logging
log_silent "\n=========================================="
log_silent "$(date '+%Y-%m-%d %H:%M:%S') - Agent Loop Started"
log_silent "Agents: ${AGENTS[*]}"
log_silent "==========================================\n"

# Track timing
START_TIME=$(date +%s)
COMPLETED=0
FAILED=0

# Main loop
for i in "${!AGENTS[@]}"; do
    agent="${AGENTS[$i]}"
    agent_num=$((i + 1))
    total=${#AGENTS[@]}

    echo ""
    log "${GREEN}========================================${NC}"
    log "${GREEN}[$agent_num/$total] Running: /$agent${NC}"
    log "${GREEN}========================================${NC}"

    # Track agent start time
    AGENT_START=$(date +%s)
    log_silent "$(date '+%Y-%m-%d %H:%M:%S') - Starting /$agent autonomous"

    # Create output file
    AGENT_OUTPUT="$SCRIPT_DIR/output-${agent}-$(date +%Y%m%d-%H%M%S).log"

    # Run claude in non-interactive print mode
    # Change to project directory and run the agent command
    cd "$PROJECT_DIR"

    echo "/$agent autonomous" | "$CLAUDE_CMD" --print --dangerously-skip-permissions > "$AGENT_OUTPUT" 2>&1
    EXIT_CODE=$?

    # Calculate duration
    AGENT_END=$(date +%s)
    AGENT_DURATION=$((AGENT_END - AGENT_START))
    AGENT_MINUTES=$((AGENT_DURATION / 60))
    AGENT_SECONDS=$((AGENT_DURATION % 60))

    # Check if completed successfully
    if [ $EXIT_CODE -eq 0 ] && grep -q "AGENT_SESSION_COMPLETE" "$AGENT_OUTPUT"; then
        COMPLETED=$((COMPLETED + 1))
        log "${GREEN}✓ /$agent completed (${AGENT_MINUTES}m ${AGENT_SECONDS}s)${NC}"
        log_silent "$(date '+%Y-%m-%d %H:%M:%S') - /$agent completed successfully in ${AGENT_MINUTES}m ${AGENT_SECONDS}s"

        # Clean up output file on success
        rm -f "$AGENT_OUTPUT"
    else
        FAILED=$((FAILED + 1))
        log "${RED}✗ /$agent failed${NC}"
        log_silent "$(date '+%Y-%m-%d %H:%M:%S') - /$agent failed (exit code: $EXIT_CODE)"
        log "Output saved to: $AGENT_OUTPUT"

        # Show last 20 lines of output for debugging
        echo ""
        echo "Last 20 lines of output:"
        tail -20 "$AGENT_OUTPUT"
    fi
done

# Calculate total duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
MINUTES=$((DURATION / 60))
SECONDS=$((DURATION % 60))

# Final summary
echo ""
log "${BLUE}========================================${NC}"
log "${BLUE}Agent Loop Complete${NC}"
log "${BLUE}========================================${NC}"
log "  Completed: ${GREEN}$COMPLETED${NC}"
log "  Failed: ${RED}$FAILED${NC}"
log "  Total time: ${MINUTES}m ${SECONDS}s"
log "  Log: $LOG_FILE"
echo ""

log_silent "$(date '+%Y-%m-%d %H:%M:%S') - Agent loop finished"
log_silent "Completed: $COMPLETED, Failed: $FAILED, Duration: ${MINUTES}m ${SECONDS}s"
log_silent "==========================================\n"

# Exit with error if any failed
if [ $FAILED -gt 0 ]; then
    exit 1
fi
