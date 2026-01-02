#!/bin/bash

# Agent Loop Script for Token Tank Incubator
# Automatically runs agents in sequence
# Each agent loads fresh context from their CLAUDE.md, LOG.md, and database

set -e  # Exit on error

# Set PATH for cron compatibility (claude and its dependencies need this)
export PATH="$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

# For cron: Use explicit path to claude
# This works across machines as long as claude is installed in ~/.local/bin
CLAUDE_CMD="$HOME/.local/bin/claude"

# Verify claude exists
if [ ! -f "$CLAUDE_CMD" ]; then
    echo "Error: claude not found at $CLAUDE_CMD"
    echo "Install claude or update CLAUDE_CMD in this script"
    exit 1
fi

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default agents (Token Tank personas)
# boss (i0) runs FIRST to provide operational oversight
DEFAULT_AGENTS=("boss" "forge" "nix" "drift" "pulse" "echo")

# Log file (relative to script location)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/agent-loop.log"

# Project directory (kochito root, two levels up from script location)
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Function to log with timestamp
log() {
    echo -e "${1}" | tee -a "$LOG_FILE"
}

# Function to log to file only (no stdout)
log_silent() {
    echo -e "${1}" >> "$LOG_FILE"
}

# Print usage
usage() {
    echo "Usage: $0 [OPTIONS] [agent1 agent2 ...]"
    echo ""
    echo "Run Token Tank agents in sequence. Fully autonomous - no user input required."
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -a, --all           Run all default agents (boss, forge, nix, drift, pulse, echo)"
    echo "  -l, --list          List available agents and exit"
    echo "  -d, --dry-run       Show what would be executed without running"
    echo "  -y, --yes           Skip confirmation prompt (useful for cron jobs)"
    echo ""
    echo "Examples:"
    echo "  $0 --all                    # Run all default agents"
    echo "  $0 forge nix                # Run only forge and nix"
    echo "  $0 --dry-run drift pulse    # Preview what would run"
    echo "  $0 --yes --all              # Run all agents without confirmation (for cron)"
    echo ""
    exit 0
}

# Parse arguments
AGENTS=()
RUN_ALL=false
DRY_RUN=false
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
        -l|--list)
            echo "Available agents:"
            for agent in "${DEFAULT_AGENTS[@]}"; do
                echo "  - $agent"
            done
            exit 0
            ;;
        -d|--dry-run)
            DRY_RUN=true
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
    echo "Use --all to run all agents, or specify agent names"
    echo "Run with --help for usage information"
    exit 1
fi

# Print configuration
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Token Tank Agent Loop${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Agents: ${AGENTS[*]}"
echo "  Dry run: $([ "$DRY_RUN" = true ] && echo "Yes" || echo "No")"
echo "  Log file: $LOG_FILE"
echo "  Mode: Fully autonomous (no user input required)"
echo ""

# Dry run mode
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Commands that would be executed:${NC}"
    for agent in "${AGENTS[@]}"; do
        echo "  echo '/$agent autonomous' | $CLAUDE_CMD --dangerously-skip-permissions"
    done
    exit 0
fi

# Confirm execution (skip if --yes flag is used)
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

    # Run the agent
    log_silent "$(date '+%Y-%m-%d %H:%M:%S') - Starting /$agent autonomous"

    # Create a temporary file to capture output
    TEMP_OUTPUT=$(mktemp)

    # Run claude with piped input, capture output, and monitor for completion marker
    # Use script to provide a pseudo-TTY which claude may need for slash commands
    # Navigate menu with arrow key and accept the bypass permissions warning
    {
        {
            sleep 2  # Wait for warning to appear
            printf "\x1b[B"  # Down arrow to select "Yes, I accept"
            sleep 1  # Give it time to register the selection
            printf "\r"  # Carriage return to confirm
            sleep 1  # Wait for Claude to be ready for input
            printf "/%s autonomous" "$agent"  # Type the command
            sleep 0.5  # Brief pause
            printf "\r"  # Submit the command
        } | (cd "$PROJECT_DIR" && script -qec "$CLAUDE_CMD --dangerously-skip-permissions" /dev/null 2>&1) | tee "$TEMP_OUTPUT" &
        CLAUDE_PID=$!

        # Monitor output for completion marker
        while kill -0 $CLAUDE_PID 2>/dev/null; do
            # Strip ANSI codes and check for completion marker
            if grep -oP "AGENT_SESSION_COMPLETE" "$TEMP_OUTPUT" > /dev/null 2>&1 || \
               sed 's/\x1b\[[0-9;]*m//g' "$TEMP_OUTPUT" | grep -q "AGENT_SESSION_COMPLETE"; then
                # Agent completed successfully - kill the process tree
                echo "Detected completion marker - terminating agent..."

                # Kill the entire process group to clean up script, claude, and all children
                # Get all child processes
                CHILD_PIDS=$(pgrep -P $CLAUDE_PID)

                # Kill children first
                for pid in $CHILD_PIDS; do
                    kill -TERM $pid 2>/dev/null
                done

                # Kill parent
                kill -TERM $CLAUDE_PID 2>/dev/null

                sleep 2  # Give processes time to terminate

                # Force kill any remaining
                for pid in $CHILD_PIDS; do
                    kill -9 $pid 2>/dev/null
                done
                kill -9 $CLAUDE_PID 2>/dev/null

                EXIT_CODE=0  # Mark as successful
                break
            fi
            sleep 2
        done

        # If loop exited because process ended naturally, check exit code
        if kill -0 $CLAUDE_PID 2>/dev/null; then
            # Process still running, force kill
            pkill -P $CLAUDE_PID 2>/dev/null
            kill $CLAUDE_PID 2>/dev/null
        fi
        wait $CLAUDE_PID 2>/dev/null
        EXIT_CODE=${EXIT_CODE:-$?}
    }

    # Calculate agent duration
    AGENT_END=$(date +%s)
    AGENT_DURATION=$((AGENT_END - AGENT_START))
    AGENT_MINUTES=$((AGENT_DURATION / 60))
    AGENT_SECONDS=$((AGENT_DURATION % 60))

    # Check if agent completed successfully
    if grep -q "AGENT_SESSION_COMPLETE" "$TEMP_OUTPUT"; then
        COMPLETED=$((COMPLETED + 1))
        log "${GREEN}✓ /$agent completed (${AGENT_MINUTES}m ${AGENT_SECONDS}s)${NC}"
        log_silent "$(date '+%Y-%m-%d %H:%M:%S') - /$agent completed successfully in ${AGENT_MINUTES}m ${AGENT_SECONDS}s"
        # Clean up temp file on success
        rm -f "$TEMP_OUTPUT"
    else
        FAILED=$((FAILED + 1))
        log "${RED}✗ /$agent failed or did not complete properly${NC}"
        log_silent "$(date '+%Y-%m-%d %H:%M:%S') - /$agent failed or incomplete (exit code: $EXIT_CODE)"

        # Save temp output for debugging
        DEBUG_FILE="$SCRIPT_DIR/debug-${agent}-$(date +%Y%m%d-%H%M%S).log"
        cp "$TEMP_OUTPUT" "$DEBUG_FILE"
        log_silent "Debug output saved to: $DEBUG_FILE"
        log "Debug output saved to: $DEBUG_FILE"
        rm -f "$TEMP_OUTPUT"
    fi
done

# Calculate duration
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
