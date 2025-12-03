#!/bin/bash

# Autonomous Image Gallery Bot Runner
# This script uses headless Claude Code to run the gallery system autonomously

# Configuration
GALLERY_BOT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="$GALLERY_BOT_DIR/logs/autonomous-runner.log"
CLAUDE_LOG="$GALLERY_BOT_DIR/logs/claude-decisions.log"
LOOP_INTERVAL=1800  # 30 minutes in seconds
MONITOR_INTERVAL=300  # 5 minutes in seconds

# Ensure log directory exists
mkdir -p "$GALLERY_BOT_DIR/logs"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to run Claude Code with a task
run_claude_task() {
    local task="$1"
    local context="$2"
    
    log_message "Running Claude Code task: $task"
    
    # Create a temporary instruction file
    cat > /tmp/claude_instruction.txt << EOF
You are running autonomously to maintain the image gallery bot system.

Current working directory: $GALLERY_BOT_DIR
Current time: $(date)

Task: $task

Context: $context

Instructions are in task.txt. Follow them carefully.
Log your decisions to logs/autonomous-decisions.log
Fix any issues you encounter.
Keep the system running smoothly.
EOF

    # Run Claude Code in headless mode
    cd "$GALLERY_BOT_DIR"
    claude code --headless --file /tmp/claude_instruction.txt >> "$CLAUDE_LOG" 2>&1
    
    # Clean up
    rm -f /tmp/claude_instruction.txt
}

# Main autonomous loop
main_loop() {
    log_message "Starting Autonomous Image Gallery Bot"
    
    # Initial setup check
    run_claude_task "Initial System Check" "Read task.txt and verify all components are ready. Run diagnostics and fix any issues."
    
    while true; do
        log_message "=== Starting new cycle ==="
        
        # Main workflow execution
        run_claude_task "Execute Gallery Workflow" "
1. Run system diagnostics (node src/self-diagnostic.js)
2. Check monitoring status (node src/monitor.js status)
3. Execute main gallery creation (node src/main.js)
4. Verify success and log results
5. Clean up old files if needed
"
        
        # Wait for next main cycle
        log_message "Main cycle complete. Waiting $LOOP_INTERVAL seconds for next cycle."
        
        # Monitor system health between main cycles
        end_time=$(($(date +%s) + $LOOP_INTERVAL))
        while [ $(date +%s) -lt $end_time ]; do
            # Quick health check
            sleep $MONITOR_INTERVAL
            
            run_claude_task "Quick Health Check" "
Run: node src/monitor.js status
Check for any critical issues.
Only fix if something is seriously wrong.
Be brief in your actions.
"
        done
    done
}

# Error handling and recovery
handle_error() {
    log_message "ERROR: Script interrupted or failed"
    
    run_claude_task "Error Recovery" "
The autonomous runner encountered an error.
1. Check logs/autonomous-runner.log for details
2. Diagnose the problem
3. Fix any code issues
4. Ensure the system can recover
5. Document your recovery actions
"
    
    # Restart after recovery attempt
    log_message "Attempting to restart after error recovery..."
    sleep 60
    exec "$0"
}

# Set up error handling
trap handle_error ERR EXIT

# Startup message
cat << EOF
========================================
Autonomous Image Gallery Bot Runner
========================================
Working Directory: $GALLERY_BOT_DIR
Main Cycle: Every $LOOP_INTERVAL seconds
Health Checks: Every $MONITOR_INTERVAL seconds
Logs: $LOG_FILE

This script will run indefinitely.
Press Ctrl+C to stop.
========================================
EOF

# Check if Claude Code is available
if ! command -v claude &> /dev/null; then
    echo "ERROR: Claude Code CLI not found. Please install it first."
    echo "Visit: https://github.com/anthropics/claude-code"
    exit 1
fi

# Start the main loop
main_loop