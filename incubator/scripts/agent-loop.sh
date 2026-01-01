#!/bin/bash

# Agent Loop Script for Token Tank Incubator
# Automatically runs agents in sequence
# Each agent loads fresh context from their CLAUDE.md, LOG.md, and database

set -e  # Exit on error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default agents (Token Tank personas)
# boss (i0) runs FIRST to provide operational oversight
DEFAULT_AGENTS=("boss" "forge" "nix" "drift" "pulse" "echo")

# Log file
LOG_DIR="/home/whitcodes/Work/Dev/kochito/incubator/scripts"
LOG_FILE="$LOG_DIR/agent-loop.log"

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
    echo ""
    echo "Examples:"
    echo "  $0 --all                    # Run all default agents"
    echo "  $0 forge nix                # Run only forge and nix"
    echo "  $0 --dry-run drift pulse    # Preview what would run"
    echo ""
    exit 0
}

# Parse arguments
AGENTS=()
RUN_ALL=false
DRY_RUN=false

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
        echo "  echo '/$agent autonomous' | claude --dangerously-skip-permissions"
    done
    exit 0
fi

# Confirm execution
read -p "Start agent loop? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
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
    {
        echo "/$agent autonomous" | claude --dangerously-skip-permissions 2>&1 | tee "$TEMP_OUTPUT" &
        CLAUDE_PID=$!

        # Monitor output for completion marker
        while kill -0 $CLAUDE_PID 2>/dev/null; do
            if grep -q "AGENT_SESSION_COMPLETE" "$TEMP_OUTPUT"; then
                # Agent completed successfully
                wait $CLAUDE_PID
                EXIT_CODE=$?
                break
            fi
            sleep 2
        done

        # If loop exited because process ended, check if it was successful
        wait $CLAUDE_PID 2>/dev/null
        EXIT_CODE=$?
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
    else
        FAILED=$((FAILED + 1))
        log "${RED}✗ /$agent failed or did not complete properly${NC}"
        log_silent "$(date '+%Y-%m-%d %H:%M:%S') - /$agent failed or incomplete (exit code: $EXIT_CODE)"
    fi

    # Clean up temp file
    rm -f "$TEMP_OUTPUT"
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
