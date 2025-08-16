#!/bin/bash

# WEBTOYS Multi-Worktree Manager
# ==============================
# Master control script for managing multiple git worktrees with isolated development environments
# 
# Usage:
#   ./wtaf-worktree.sh start <branch-name>     - Start or create a worktree
#   ./wtaf-worktree.sh stop <worktree-id>      - Stop a worktree
#   ./wtaf-worktree.sh status                  - Show all worktrees status
#   ./wtaf-worktree.sh switch <worktree-id>    - Switch to a worktree tmux session
#   ./wtaf-worktree.sh list                    - List all worktrees
#   ./wtaf-worktree.sh cleanup                 - Remove stopped worktrees
#   ./wtaf-worktree.sh help                    - Show help

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Function to display help
show_help() {
    cat << EOF
🔧 WEBTOYS Multi-Worktree Manager

USAGE:
  $0 <command> [arguments]

COMMANDS:
  start <branch-name>     Start or create a worktree for the branch
                         Example: $0 start feature-auth
                         
  stop <worktree-id>      Stop all services in a worktree
                         Example: $0 stop 1
                         
  status                  Show status of all worktrees
  
  switch <worktree-id>    Switch to worktree tmux session
                         Example: $0 switch 2
                         
  list                    List all available worktrees
  
  cleanup                 Remove inactive worktrees and free resources
  
  logs <worktree-id>      Show logs for a worktree
  
  restart <worktree-id>   Restart all services in a worktree
  
  help                    Show this help message

EXAMPLES:
  # Start working on a feature branch
  $0 start feature-dark-mode
  
  # Check status of all worktrees  
  $0 status
  
  # Switch to worktree 1
  $0 switch 1
  
  # Stop worktree 2
  $0 stop 2
  
  # Clean up inactive worktrees
  $0 cleanup

WORKTREE PORTS:
  Worktree 1: SMS=3030, Web=3000, Ngrok=8000
  Worktree 2: SMS=3031, Web=3001, Ngrok=8001
  Worktree 3: SMS=3032, Web=3002, Ngrok=8002

FILES:
  Configuration: $SCRIPT_DIR/config.sh
  Active worktrees: $ACTIVE_WORKTREES_FILE
  Logs: $LOG_DIR/

NOTES:
  - Each worktree gets isolated ports and ngrok tunnel
  - All worktrees share the same database (Supabase)
  - Services run in organized tmux sessions
  - Use 'wtaf-1', 'wtaf-2', 'wtaf-3' aliases for quick access
EOF
}

# Function to get next available worktree slot
get_next_available_slot() {
    for i in {1..3}; do
        if ! is_worktree_active "$i"; then
            echo "$i"
            return 0
        fi
    done
    return 1
}

# Function to check if worktree is active
is_worktree_active() {
    local worktree_id="$1"
    grep -q "^$worktree_id:" "$ACTIVE_WORKTREES_FILE" 2>/dev/null
}

# Function to get worktree info from active file
get_worktree_info() {
    local worktree_id="$1"
    grep "^$worktree_id:" "$ACTIVE_WORKTREES_FILE" 2>/dev/null || echo ""
}

# Function to add worktree to active list
add_worktree_to_active() {
    local worktree_id="$1"
    local branch="$2"
    local path="$3"
    local ports="$(get_worktree_ports "$worktree_id")"
    
    # Format: worktree_id:branch:path:ports:timestamp
    echo "$worktree_id:$branch:$path:$ports:$(date +%s)" >> "$ACTIVE_WORKTREES_FILE"
    log_success "Added worktree $worktree_id to active list"
}

# Function to remove worktree from active list
remove_worktree_from_active() {
    local worktree_id="$1"
    local temp_file=$(mktemp)
    grep -v "^$worktree_id:" "$ACTIVE_WORKTREES_FILE" > "$temp_file" || true
    mv "$temp_file" "$ACTIVE_WORKTREES_FILE"
    log_success "Removed worktree $worktree_id from active list"
}

# Function to create environment file for worktree
create_worktree_env() {
    local worktree_id="$1"
    local branch="$2"
    local worktree_path="$3"
    
    local ports="$(get_worktree_ports "$worktree_id")"
    IFS=':' read -r sms_port web_port ngrok_port <<< "$ports"
    
    log_info "Creating environment file for worktree $worktree_id"
    
    # Read main environment file for base values
    local main_env="$PROJECT_ROOT/.env.local"
    if [[ ! -f "$main_env" ]]; then
        log_error "Main .env.local not found at $main_env"
        return 1
    fi
    
    # Generate ngrok subdomain based on branch name
    local ngrok_subdomain="wtaf-${branch//[^a-zA-Z0-9]/-}-${worktree_id}"
    ngrok_subdomain=$(echo "$ngrok_subdomain" | tr '[:upper:]' '[:lower:]' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
    
    # Create .env.local in worktree root
    local env_file="$worktree_path/.env.local"
    cp "$SCRIPT_DIR/.env.worktree.template" "$env_file"
    
    # Replace template variables with actual values from main env and worktree-specific values
    while IFS='=' read -r key value; do
        [[ $key =~ ^[[:space:]]*# ]] && continue
        [[ -z "$key" ]] && continue
        
        # Remove quotes from value if present
        value=$(echo "$value" | sed 's/^"//;s/"$//')
        
        # Replace in template
        sed -i.bak "s/{{$key}}/$value/g" "$env_file"
    done < "$main_env"
    
    # Set worktree-specific values
    sed -i.bak "s/{{WORKTREE_ID}}/$worktree_id/g" "$env_file"
    sed -i.bak "s/{{WORKTREE_BRANCH}}/$branch/g" "$env_file"
    sed -i.bak "s/{{SMS_PORT}}/$sms_port/g" "$env_file"
    sed -i.bak "s/{{WEB_PORT}}/$web_port/g" "$env_file"
    sed -i.bak "s/{{NGROK_PORT}}/$ngrok_port/g" "$env_file"
    sed -i.bak "s/{{NGROK_SUBDOMAIN}}/$ngrok_subdomain/g" "$env_file"
    
    # Clean up backup file
    rm -f "$env_file.bak"
    
    log_success "Created environment file: $env_file"
}

# Function to create or start a worktree
start_worktree() {
    local branch="$1"
    
    log_info "Starting worktree for branch: $branch"
    
    # Check if we have available slots
    local worktree_id
    if ! worktree_id=$(get_next_available_slot); then
        log_error "No available worktree slots (maximum $MAX_WORKTREES)"
        log_info "Stop an existing worktree first or run cleanup"
        return 1
    fi
    
    log_info "Assigned worktree ID: $worktree_id"
    
    # Create worktree directory name
    local worktree_name="worktree-${worktree_id}-${branch}"
    local worktree_path="$WORKTREE_BASE/$worktree_name"
    
    # Ensure worktree base directory exists
    mkdir -p "$WORKTREE_BASE"
    
    # Check if worktree already exists
    if [[ -d "$worktree_path" ]]; then
        log_info "Worktree directory already exists, reusing: $worktree_path"
    else
        log_info "Creating new git worktree: $worktree_path"
        
        # Create the worktree
        cd "$PROJECT_ROOT"
        
        # Check if branch exists locally or remotely
        if git show-ref --verify --quiet "refs/heads/$branch"; then
            log_info "Branch $branch exists locally"
            git worktree add "$worktree_path" "$branch"
        elif git show-ref --verify --quiet "refs/remotes/origin/$branch"; then
            log_info "Branch $branch exists on remote, checking out"
            git worktree add "$worktree_path" -b "$branch" "origin/$branch"
        else
            log_info "Creating new branch $branch from main"
            git worktree add "$worktree_path" -b "$branch"
        fi
        
        if [[ $? -ne 0 ]]; then
            log_error "Failed to create worktree"
            return 1
        fi
    fi
    
    # Create environment file
    create_worktree_env "$worktree_id" "$branch" "$worktree_path"
    
    # Add to active worktrees
    add_worktree_to_active "$worktree_id" "$branch" "$worktree_path"
    
    # Start services using the service manager
    log_info "Starting services for worktree $worktree_id"
    "$SCRIPT_DIR/service-manager.sh" start "$worktree_id"
    
    # Create tmux session
    "$SCRIPT_DIR/tmux-manager.sh" create "$worktree_id"
    
    log_success "Worktree $worktree_id started successfully!"
    log_info "Branch: $branch"
    log_info "Path: $worktree_path"
    log_info "Ports: $(get_worktree_ports "$worktree_id")"
    log_info ""
    log_info "To switch to this worktree:"
    log_info "  $0 switch $worktree_id"
    log_info "  # or use the alias:"
    log_info "  wtaf-$worktree_id"
}

# Function to stop a worktree
stop_worktree() {
    local worktree_id="$1"
    
    if ! is_worktree_active "$worktree_id"; then
        log_error "Worktree $worktree_id is not active"
        return 1
    fi
    
    log_info "Stopping worktree $worktree_id"
    
    # Stop services
    "$SCRIPT_DIR/service-manager.sh" stop "$worktree_id"
    
    # Kill tmux session
    "$SCRIPT_DIR/tmux-manager.sh" kill "$worktree_id"
    
    # Remove from active list
    remove_worktree_from_active "$worktree_id"
    
    log_success "Worktree $worktree_id stopped successfully"
}

# Function to show worktree status
show_status() {
    log_info "WEBTOYS Multi-Worktree Status"
    echo ""
    
    if [[ ! -s "$ACTIVE_WORKTREES_FILE" ]]; then
        echo "No active worktrees"
        return 0
    fi
    
    printf "%-2s %-20s %-30s %-15s %-10s %s\n" "ID" "BRANCH" "PATH" "PORTS" "STATUS" "STARTED"
    printf "%s\n" "$(printf '─%.0s' {1..100})"
    
    while IFS=':' read -r worktree_id branch path ports timestamp; do
        local status=$("$SCRIPT_DIR/health-check.sh" "$worktree_id")
        local started_time=$(date -r "$timestamp" "+%Y-%m-%d %H:%M" 2>/dev/null || echo "unknown")
        local short_path="${path#$WORKTREE_BASE/}"
        
        printf "%-2s %-20s %-30s %-15s %-10s %s\n" \
            "$worktree_id" "$branch" "$short_path" "$ports" "$status" "$started_time"
    done < "$ACTIVE_WORKTREES_FILE"
    
    echo ""
    
    # Show quick access commands
    echo "Quick access:"
    while IFS=':' read -r worktree_id branch path ports timestamp; do
        echo "  wtaf-$worktree_id  # Switch to $branch"
    done < "$ACTIVE_WORKTREES_FILE"
}

# Function to switch to a worktree
switch_worktree() {
    local worktree_id="$1"
    
    if ! is_worktree_active "$worktree_id"; then
        log_error "Worktree $worktree_id is not active"
        log_info "Available worktrees:"
        show_status
        return 1
    fi
    
    log_info "Switching to worktree $worktree_id"
    
    # Attach to tmux session
    "$SCRIPT_DIR/tmux-manager.sh" attach "$worktree_id"
}

# Function to list worktrees
list_worktrees() {
    log_info "All git worktrees:"
    
    cd "$PROJECT_ROOT"
    git worktree list
    
    echo ""
    show_status
}

# Function to clean up inactive worktrees
cleanup_worktrees() {
    log_info "Cleaning up inactive worktrees"
    
    # Stop any orphaned processes
    local cleanup_count=0
    
    # Check for stale tmux sessions
    while IFS=':' read -r worktree_id branch path ports timestamp 2>/dev/null; do
        if [[ ! -d "$path" ]]; then
            log_warning "Worktree directory missing: $path"
            log_info "Cleaning up stale entry for worktree $worktree_id"
            
            # Stop any remaining services
            "$SCRIPT_DIR/service-manager.sh" stop "$worktree_id" 2>/dev/null || true
            
            # Kill tmux session
            "$SCRIPT_DIR/tmux-manager.sh" kill "$worktree_id" 2>/dev/null || true
            
            # Remove from active list
            remove_worktree_from_active "$worktree_id"
            
            ((cleanup_count++))
        fi
    done < "$ACTIVE_WORKTREES_FILE" || true
    
    # Clean up git worktrees that are no longer valid
    cd "$PROJECT_ROOT"
    git worktree prune
    
    log_success "Cleanup completed. Removed $cleanup_count stale entries"
}

# Function to show logs for a worktree
show_logs() {
    local worktree_id="$1"
    
    if ! is_worktree_active "$worktree_id"; then
        log_error "Worktree $worktree_id is not active"
        return 1
    fi
    
    log_info "Showing logs for worktree $worktree_id"
    
    local worktree_log="$LOG_DIR/worktree-$worktree_id.log"
    if [[ -f "$worktree_log" ]]; then
        tail -f "$worktree_log"
    else
        log_warning "No log file found: $worktree_log"
    fi
}

# Function to restart a worktree
restart_worktree() {
    local worktree_id="$1"
    
    if ! is_worktree_active "$worktree_id"; then
        log_error "Worktree $worktree_id is not active"
        return 1
    fi
    
    log_info "Restarting worktree $worktree_id"
    
    # Restart services
    "$SCRIPT_DIR/service-manager.sh" restart "$worktree_id"
    
    log_success "Worktree $worktree_id restarted successfully"
}

# Main command processing
main() {
    local command="${1:-help}"
    
    case "$command" in
        "start")
            if [[ $# -lt 2 ]]; then
                log_error "Branch name required"
                echo "Usage: $0 start <branch-name>"
                exit 1
            fi
            start_worktree "$2"
            ;;
        "stop")
            if [[ $# -lt 2 ]]; then
                log_error "Worktree ID required"
                echo "Usage: $0 stop <worktree-id>"
                exit 1
            fi
            stop_worktree "$2"
            ;;
        "status")
            show_status
            ;;
        "switch")
            if [[ $# -lt 2 ]]; then
                log_error "Worktree ID required"
                echo "Usage: $0 switch <worktree-id>"
                exit 1
            fi
            switch_worktree "$2"
            ;;
        "list")
            list_worktrees
            ;;
        "cleanup")
            cleanup_worktrees
            ;;
        "logs")
            if [[ $# -lt 2 ]]; then
                log_error "Worktree ID required"
                echo "Usage: $0 logs <worktree-id>"
                exit 1
            fi
            show_logs "$2"
            ;;
        "restart")
            if [[ $# -lt 2 ]]; then
                log_error "Worktree ID required"
                echo "Usage: $0 restart <worktree-id>"
                exit 1
            fi
            restart_worktree "$2"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"