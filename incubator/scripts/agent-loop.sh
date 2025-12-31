#!/bin/bash

# Agent Loop Script for Token Tank Incubator
# Automatically runs agents in sequence with /clear between each

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
    echo "Run Token Tank agents in sequence with /clear between each."
    echo ""
    echo "Options:"
    echo "  -h, --help          Show this help message"
    echo "  -a, --all           Run all default agents (boss, forge, nix, drift, pulse, echo)"
    echo "  -l, --list          List available agents and exit"
    echo "  -n, --no-clear      Skip /clear between agents (not recommended)"
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
NO_CLEAR=false
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
        -n|--no-clear)
            NO_CLEAR=true
            shift
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
echo "  Clear between: $([ "$NO_CLEAR" = true ] && echo "No" || echo "Yes")"
echo "  Dry run: $([ "$DRY_RUN" = true ] && echo "Yes" || echo "No")"
echo "  Log file: $LOG_FILE"
echo ""

# Dry run mode
if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY RUN] Commands that would be executed:${NC}"
    for agent in "${AGENTS[@]}"; do
        if [ "$NO_CLEAR" = false ]; then
            echo "  claude '/clear'"
        fi
        echo "  claude '/$agent autonomous'"
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

    # Clear context between agents (unless disabled)
    if [ "$NO_CLEAR" = false ] && [ $i -gt 0 ]; then
        echo -e "${YELLOW}Clearing context...${NC}"
        log_silent "$(date '+%Y-%m-%d %H:%M:%S') - Clearing context"

        if claude '/clear'; then
            log_silent "$(date '+%Y-%m-%d %H:%M:%S') - Context cleared successfully"
        else
            log "${RED}Warning: /clear command failed${NC}"
        fi
    fi

    # Run the agent
    log_silent "$(date '+%Y-%m-%d %H:%M:%S') - Starting /$agent"

    if claude "/$agent autonomous"; then
        COMPLETED=$((COMPLETED + 1))
        log "${GREEN}✓ /$agent completed successfully${NC}"
        log_silent "$(date '+%Y-%m-%d %H:%M:%S') - /$agent completed successfully"
    else
        FAILED=$((FAILED + 1))
        log "${RED}✗ /$agent failed${NC}"
        log_silent "$(date '+%Y-%m-%d %H:%M:%S') - /$agent failed with exit code $?"

        # Ask whether to continue
        read -p "Agent failed. Continue with remaining agents? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "${YELLOW}Agent loop cancelled by user${NC}"
            break
        fi
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
