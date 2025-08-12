#!/bin/bash

# WEBTOYS Tmux Session Manager
# ===========================
# Creates and manages tmux sessions for each worktree with organized panes

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Function to get session name for worktree
get_session_name() {
    local worktree_id="$1"
    echo "${TMUX_SESSION_PREFIX}-${worktree_id}"
}

# Function to check if tmux session exists
session_exists() {
    local session_name="$1"
    tmux has-session -t "$session_name" 2>/dev/null
}

# Function to get worktree info for tmux creation
get_tmux_worktree_data() {
    local worktree_id="$1"
    local worktree_info
    worktree_info=$(get_worktree_info "$worktree_id")
    
    if [[ -z "$worktree_info" ]]; then
        log_error "Worktree $worktree_id not found"
        return 1
    fi
    
    # Parse the info: worktree_id:branch:path:ports:timestamp
    IFS=':' read -r wt_id branch path ports timestamp <<< "$worktree_info"
    IFS=':' read -r sms_port web_port ngrok_port <<< "$ports"
    
    # Export for use by calling functions
    export WORKTREE_BRANCH="$branch"
    export WORKTREE_PATH="$path"
    export SMS_PORT="$sms_port"
    export WEB_PORT="$web_port"
    export NGROK_PORT="$ngrok_port"
    export SESSION_COLOR="$(get_tmux_color "$worktree_id")"
}

# Function to create a new tmux session for a worktree
create_session() {
    local worktree_id="$1"
    local session_name=$(get_session_name "$worktree_id")
    
    # Get worktree data
    get_tmux_worktree_data "$worktree_id"
    
    if session_exists "$session_name"; then
        log_warning "Tmux session $session_name already exists"
        return 0
    fi
    
    log_info "Creating tmux session: $session_name"
    
    # Create main session with status bar customization
    tmux new-session -d -s "$session_name" -c "$WORKTREE_PATH"
    
    # Configure status bar for this session
    tmux set-option -t "$session_name" status-style "bg=$SESSION_COLOR,fg=white"
    tmux set-option -t "$session_name" status-left "#[fg=white,bold][WTAF-$worktree_id: $WORKTREE_BRANCH] "
    tmux set-option -t "$session_name" status-left-length 40
    tmux set-option -t "$session_name" status-right "#[fg=white]SMS:$SMS_PORT WEB:$WEB_PORT NGROK:$NGROK_PORT #[fg=yellow]%H:%M"
    tmux set-option -t "$session_name" status-right-length 60
    
    # Rename the first window
    tmux rename-window -t "$session_name:0" "main"
    
    # Split the main window into organized panes
    # Layout: 
    # +-------------------+-------------------+
    # |     SMS Bot       |    Web Server     |
    # +-------------------+-------------------+
    # |    Engine Log     |   Terminal/Dev    |
    # +-------------------+-------------------+
    
    # Split horizontally (top/bottom)
    tmux split-window -t "$session_name:0" -v -c "$WORKTREE_PATH"
    
    # Split both panes vertically (left/right)
    tmux split-window -t "$session_name:0.0" -h -c "$WORKTREE_PATH/sms-bot"
    tmux split-window -t "$session_name:0.2" -h -c "$WORKTREE_PATH"
    
    # Name the panes
    tmux select-pane -t "$session_name:0.0" -T "SMS Bot"
    tmux select-pane -t "$session_name:0.1" -T "Web Server" 
    tmux select-pane -t "$session_name:0.2" -T "Engine Logs"
    tmux select-pane -t "$session_name:0.3" -T "Terminal"
    
    # Set up pane content
    
    # Pane 0: SMS Bot monitoring
    tmux send-keys -t "$session_name:0.0" "cd sms-bot" Enter
    tmux send-keys -t "$session_name:0.0" "echo 'SMS Bot - Port $SMS_PORT'" Enter
    tmux send-keys -t "$session_name:0.0" "echo 'Logs: tail -f ../logs/worktree-${worktree_id}-sms.log'" Enter
    tmux send-keys -t "$session_name:0.0" "echo 'Dev Reroute: npm run dev:reroute'" Enter
    tmux send-keys -t "$session_name:0.0" "echo 'Health: curl http://localhost:$SMS_PORT/health'" Enter
    tmux send-keys -t "$session_name:0.0" ""  # Leave at prompt
    
    # Pane 1: Web Server monitoring  
    tmux send-keys -t "$session_name:0.1" "cd web" Enter
    tmux send-keys -t "$session_name:0.1" "echo 'Web Server - Port $WEB_PORT'" Enter
    tmux send-keys -t "$session_name:0.1" "echo 'URL: http://localhost:$WEB_PORT'" Enter
    tmux send-keys -t "$session_name:0.1" "echo 'Logs: tail -f ../logs/worktree-${worktree_id}-web.log'" Enter
    tmux send-keys -t "$session_name:0.1" ""  # Leave at prompt
    
    # Pane 2: Engine logs (start tailing immediately)
    tmux send-keys -t "$session_name:0.2" "echo 'WTAF Engine Logs'" Enter
    tmux send-keys -t "$session_name:0.2" "echo 'Waiting for logs...'" Enter
    
    # Create a function to start log tailing after a delay
    tmux send-keys -t "$session_name:0.2" "sleep 10 && tail -f logs/worktree-${worktree_id}-engine.log 2>/dev/null || echo 'Engine logs not available yet'" Enter
    
    # Pane 3: Main terminal for development
    tmux send-keys -t "$session_name:0.3" "echo 'Development Terminal - Worktree $worktree_id'" Enter
    tmux send-keys -t "$session_name:0.3" "echo 'Branch: $WORKTREE_BRANCH'" Enter
    tmux send-keys -t "$session_name:0.3" "echo 'Path: $WORKTREE_PATH'" Enter
    tmux send-keys -t "$session_name:0.3" "echo ''" Enter
    tmux send-keys -t "$session_name:0.3" "echo 'Quick commands:'" Enter
    tmux send-keys -t "$session_name:0.3" "echo '  wtaf-worktree.sh status  # Show all worktrees'" Enter
    tmux send-keys -t "$session_name:0.3" "echo '  git status               # Git status'" Enter
    tmux send-keys -t "$session_name:0.3" "echo '  npm run dev:reroute      # SMS dev console'" Enter
    tmux send-keys -t "$session_name:0.3" "echo ''" Enter
    
    # Select the main terminal pane
    tmux select-pane -t "$session_name:0.3"
    
    # Create additional windows for specific tasks
    
    # Window 1: Logs viewer
    tmux new-window -t "$session_name" -n "logs" -c "$WORKTREE_PATH"
    
    # Split logs window into 4 panes for different log files
    tmux split-window -t "$session_name:logs" -v -c "$WORKTREE_PATH"
    tmux split-window -t "$session_name:logs.0" -h -c "$WORKTREE_PATH"
    tmux split-window -t "$session_name:logs.2" -h -c "$WORKTREE_PATH"
    
    # Set up log tailing in each pane
    tmux send-keys -t "$session_name:logs.0" "echo 'SMS Bot Logs' && sleep 5 && tail -f logs/worktree-${worktree_id}-sms.log 2>/dev/null || echo 'SMS logs not available'" Enter
    tmux send-keys -t "$session_name:logs.1" "echo 'Web Server Logs' && sleep 5 && tail -f logs/worktree-${worktree_id}-web.log 2>/dev/null || echo 'Web logs not available'" Enter
    tmux send-keys -t "$session_name:logs.2" "echo 'Engine Logs' && sleep 5 && tail -f logs/worktree-${worktree_id}-engine.log 2>/dev/null || echo 'Engine logs not available'" Enter
    tmux send-keys -t "$session_name:logs.3" "echo 'Ngrok Logs' && sleep 5 && tail -f logs/worktree-${worktree_id}-ngrok.log 2>/dev/null || echo 'Ngrok logs not available'" Enter
    
    # Window 2: Git operations
    tmux new-window -t "$session_name" -n "git" -c "$WORKTREE_PATH"
    tmux send-keys -t "$session_name:git" "git status" Enter
    tmux send-keys -t "$session_name:git" "echo ''" Enter
    tmux send-keys -t "$session_name:git" "echo 'Git operations window for branch: $WORKTREE_BRANCH'" Enter
    tmux send-keys -t "$session_name:git" "echo 'Worktree: $WORKTREE_PATH'" Enter
    
    # Window 3: Database/API testing
    tmux new-window -t "$session_name" -n "testing" -c "$WORKTREE_PATH"
    tmux send-keys -t "$session_name:testing" "echo 'Testing and API Window'" Enter
    tmux send-keys -t "$session_name:testing" "echo 'SMS Bot: http://localhost:$SMS_PORT'" Enter
    tmux send-keys -t "$session_name:testing" "echo 'Web App: http://localhost:$WEB_PORT'" Enter
    tmux send-keys -t "$session_name:testing" "echo ''" Enter
    tmux send-keys -t "$session_name:testing" "echo 'Test commands:'" Enter
    tmux send-keys -t "$session_name:testing" "echo '  curl http://localhost:$SMS_PORT/health'" Enter
    tmux send-keys -t "$session_name:testing" "echo '  curl http://localhost:$WEB_PORT/api/health'" Enter
    
    # Go back to main window
    tmux select-window -t "$session_name:0"
    
    log_success "Created tmux session: $session_name"
    log_info "Windows: main, logs, git, testing"
    log_info "To attach: tmux attach-session -t $session_name"
}

# Function to kill a tmux session
kill_session() {
    local worktree_id="$1"
    local session_name=$(get_session_name "$worktree_id")
    
    if session_exists "$session_name"; then
        log_info "Killing tmux session: $session_name"
        tmux kill-session -t "$session_name"
        log_success "Killed tmux session: $session_name"
    else
        log_debug "Tmux session $session_name does not exist"
    fi
}

# Function to attach to a tmux session
attach_session() {
    local worktree_id="$1"
    local session_name=$(get_session_name "$worktree_id")
    
    if ! session_exists "$session_name"; then
        log_error "Tmux session $session_name does not exist"
        log_info "Create it first with: create $worktree_id"
        return 1
    fi
    
    log_info "Attaching to tmux session: $session_name"
    
    # Check if we're already in a tmux session
    if [[ -n "${TMUX:-}" ]]; then
        log_info "Already in tmux, switching session"
        tmux switch-client -t "$session_name"
    else
        tmux attach-session -t "$session_name"
    fi
}

# Function to list all WTAF tmux sessions
list_sessions() {
    log_info "WEBTOYS Tmux Sessions:"
    echo ""
    
    local found=false
    
    # Get all tmux sessions
    if tmux list-sessions 2>/dev/null | grep -q "^${TMUX_SESSION_PREFIX}-"; then
        found=true
        echo "Active sessions:"
        tmux list-sessions | grep "^${TMUX_SESSION_PREFIX}-" | while read line; do
            local session_name=$(echo "$line" | cut -d: -f1)
            local worktree_id=${session_name#${TMUX_SESSION_PREFIX}-}
            local status=$(echo "$line" | cut -d' ' -f2-)
            
            # Get branch info if available
            local branch="unknown"
            if [[ -f "$ACTIVE_WORKTREES_FILE" ]]; then
                branch=$(grep "^$worktree_id:" "$ACTIVE_WORKTREES_FILE" | cut -d: -f2 2>/dev/null || echo "unknown")
            fi
            
            echo "  $session_name (worktree $worktree_id, branch: $branch) - $status"
        done
    fi
    
    if [[ "$found" == "false" ]]; then
        echo "No active WEBTOYS tmux sessions"
    fi
    
    echo ""
    echo "Quick attach commands:"
    if [[ -f "$ACTIVE_WORKTREES_FILE" ]]; then
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            echo "  wtaf-$worktree_id  # Attach to $branch"
        done < "$ACTIVE_WORKTREES_FILE"
    fi
}

# Function to show detailed session info
show_session_info() {
    local worktree_id="$1"
    local session_name=$(get_session_name "$worktree_id")
    
    if ! session_exists "$session_name"; then
        log_error "Tmux session $session_name does not exist"
        return 1
    fi
    
    log_info "Session info for $session_name:"
    echo ""
    
    # Show session details
    tmux display-message -t "$session_name" -p "Session: #{session_name}"
    tmux display-message -t "$session_name" -p "Created: #{session_created}"
    tmux display-message -t "$session_name" -p "Windows: #{session_windows}"
    
    echo ""
    echo "Windows and panes:"
    tmux list-windows -t "$session_name" -F "  #{window_index}: #{window_name} (#{window_panes} panes)"
    
    echo ""
    echo "To attach: tmux attach-session -t $session_name"
}

# Function to send command to a specific pane in a session
send_command() {
    local worktree_id="$1"
    local pane="$2"
    local command="$3"
    local session_name=$(get_session_name "$worktree_id")
    
    if ! session_exists "$session_name"; then
        log_error "Tmux session $session_name does not exist"
        return 1
    fi
    
    log_info "Sending command to $session_name:$pane: $command"
    tmux send-keys -t "$session_name:$pane" "$command" Enter
}

# Main command processing
main() {
    local command="${1:-list}"
    local worktree_id="${2:-}"
    
    case "$command" in
        "create")
            if [[ -z "$worktree_id" ]]; then
                log_error "Worktree ID required"
                echo "Usage: $0 create <worktree-id>"
                exit 1
            fi
            create_session "$worktree_id"
            ;;
        "kill")
            if [[ -z "$worktree_id" ]]; then
                log_error "Worktree ID required"
                echo "Usage: $0 kill <worktree-id>"
                exit 1
            fi
            kill_session "$worktree_id"
            ;;
        "attach")
            if [[ -z "$worktree_id" ]]; then
                log_error "Worktree ID required"
                echo "Usage: $0 attach <worktree-id>"
                exit 1
            fi
            attach_session "$worktree_id"
            ;;
        "list")
            list_sessions
            ;;
        "info")
            if [[ -z "$worktree_id" ]]; then
                log_error "Worktree ID required"
                echo "Usage: $0 info <worktree-id>"
                exit 1
            fi
            show_session_info "$worktree_id"
            ;;
        "send")
            if [[ $# -lt 4 ]]; then
                log_error "Usage: $0 send <worktree-id> <pane> <command>"
                exit 1
            fi
            send_command "$worktree_id" "$3" "$4"
            ;;
        "help"|"-h"|"--help")
            cat << EOF
WEBTOYS Tmux Manager

Usage: $0 <command> [options]

Commands:
  create <worktree-id>           Create tmux session for worktree
  kill <worktree-id>             Kill tmux session for worktree
  attach <worktree-id>           Attach to tmux session
  list                           List all WEBTOYS tmux sessions
  info <worktree-id>             Show detailed session information
  send <worktree-id> <pane> <cmd> Send command to specific pane
  help                           Show this help

Session Layout:
  Window 0 (main):
    - Pane 0: SMS Bot monitoring
    - Pane 1: Web Server monitoring  
    - Pane 2: Engine logs
    - Pane 3: Development terminal

  Window 1 (logs):
    - Live log tailing for all services

  Window 2 (git):
    - Git operations and version control

  Window 3 (testing):
    - API testing and health checks

Examples:
  $0 create 1                    # Create session for worktree 1
  $0 attach 2                    # Attach to worktree 2
  $0 send 1 0.3 "git status"     # Send git status to main terminal
EOF
            ;;
        *)
            log_error "Unknown command: $command"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"