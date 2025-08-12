#!/bin/bash

# WEBTOYS Worktree Service Manager
# ===============================
# Manages all services (SMS bot, web server, engine, ngrok) for a specific worktree

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Service management functions

# Function to get worktree information
get_worktree_data() {
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
}

# Function to check if service is running on a port
is_service_running() {
    local port="$1"
    lsof -ti:$port >/dev/null 2>&1
}

# Function to kill process on port
kill_process_on_port() {
    local port="$1"
    local service_name="$2"
    
    if is_service_running "$port"; then
        log_info "Stopping $service_name on port $port"
        local pids=$(lsof -ti:$port)
        for pid in $pids; do
            log_debug "Killing process $pid"
            kill -TERM "$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
        done
        
        # Wait a moment for graceful shutdown
        sleep 2
        
        # Force kill if still running
        if is_service_running "$port"; then
            log_warning "Force killing processes on port $port"
            lsof -ti:$port | xargs kill -KILL 2>/dev/null || true
        fi
        
        log_success "Stopped $service_name on port $port"
    else
        log_debug "$service_name on port $port was not running"
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local port="$1"
    local service_name="$2"
    local max_wait=30
    local wait_time=0
    
    log_info "Waiting for $service_name to start on port $port..."
    
    while ! is_service_running "$port" && [ $wait_time -lt $max_wait ]; do
        sleep 1
        ((wait_time++))
        if [ $((wait_time % 5)) -eq 0 ]; then
            log_debug "Still waiting for $service_name ($wait_time/${max_wait}s)"
        fi
    done
    
    if is_service_running "$port"; then
        log_success "$service_name is ready on port $port"
        return 0
    else
        log_error "$service_name failed to start on port $port after ${max_wait}s"
        return 1
    fi
}

# Function to start SMS bot service
start_sms_service() {
    local worktree_id="$1"
    
    log_info "Starting SMS bot service for worktree $worktree_id"
    
    cd "$WORKTREE_PATH"
    
    # Build the SMS bot
    log_debug "Building SMS bot..."
    cd sms-bot && npm run build
    
    # Start SMS bot in background
    log_debug "Starting SMS bot on port $SMS_PORT"
    SMS_BOT_PORT=$SMS_PORT npm run start > "$LOG_DIR/worktree-${worktree_id}-sms.log" 2>&1 &
    local sms_pid=$!
    
    # Store PID for later management
    echo "$sms_pid" > "$WORKTREE_DATA_DIR/worktree-${worktree_id}-sms.pid"
    
    # Wait for service to be ready
    wait_for_service "$SMS_PORT" "SMS bot"
}

# Function to start web service
start_web_service() {
    local worktree_id="$1"
    
    log_info "Starting web service for worktree $worktree_id"
    
    cd "$WORKTREE_PATH/web"
    
    # Build if necessary
    log_debug "Building web application..."
    npm run build
    
    # Start web server
    log_debug "Starting web server on port $WEB_PORT"
    PORT=$WEB_PORT npm run start > "$LOG_DIR/worktree-${worktree_id}-web.log" 2>&1 &
    local web_pid=$!
    
    # Store PID
    echo "$web_pid" > "$WORKTREE_DATA_DIR/worktree-${worktree_id}-web.pid"
    
    # Wait for service to be ready
    wait_for_service "$WEB_PORT" "web server"
}

# Function to start engine service
start_engine_service() {
    local worktree_id="$1"
    
    log_info "Starting WTAF engine for worktree $worktree_id"
    
    cd "$WORKTREE_PATH/sms-bot"
    
    # Start the engine
    log_debug "Starting WTAF engine"
    npm run start:engine > "$LOG_DIR/worktree-${worktree_id}-engine.log" 2>&1 &
    local engine_pid=$!
    
    # Store PID
    echo "$engine_pid" > "$WORKTREE_DATA_DIR/worktree-${worktree_id}-engine.pid"
    
    log_success "Started WTAF engine (PID: $engine_pid)"
}

# Function to start ngrok tunnel
start_ngrok_service() {
    local worktree_id="$1"
    
    log_info "Starting ngrok tunnel for worktree $worktree_id"
    
    # Generate ngrok config for this worktree
    local ngrok_config="$WORKTREE_DATA_DIR/ngrok-${worktree_id}.yml"
    local ngrok_subdomain="wtaf-${WORKTREE_BRANCH//[^a-zA-Z0-9]/-}-${worktree_id}"
    ngrok_subdomain=$(echo "$ngrok_subdomain" | tr '[:upper:]' '[:lower:]' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
    
    cat > "$ngrok_config" << EOF
version: "2"
authtoken: \${NGROK_AUTH_TOKEN}
tunnels:
  worktree-${worktree_id}:
    proto: http
    addr: ${SMS_PORT}
    subdomain: ${ngrok_subdomain}
    inspect: false
EOF
    
    # Start ngrok
    log_debug "Starting ngrok tunnel: $ngrok_subdomain"
    NGROK_AUTH_TOKEN=${NGROK_AUTH_TOKEN:-} ngrok start --config="$ngrok_config" worktree-${worktree_id} > "$LOG_DIR/worktree-${worktree_id}-ngrok.log" 2>&1 &
    local ngrok_pid=$!
    
    # Store PID
    echo "$ngrok_pid" > "$WORKTREE_DATA_DIR/worktree-${worktree_id}-ngrok.pid"
    
    # Give ngrok time to establish tunnel
    sleep 5
    
    log_success "Started ngrok tunnel: https://${ngrok_subdomain}.ngrok.io -> localhost:${SMS_PORT}"
}

# Function to stop a specific service
stop_service() {
    local worktree_id="$1"
    local service="$2"
    
    local pid_file="$WORKTREE_DATA_DIR/worktree-${worktree_id}-${service}.pid"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Stopping $service (PID: $pid)"
            kill -TERM "$pid" 2>/dev/null || kill -KILL "$pid" 2>/dev/null || true
            
            # Wait for process to die
            local wait_count=0
            while kill -0 "$pid" 2>/dev/null && [ $wait_count -lt 10 ]; do
                sleep 1
                ((wait_count++))
            done
            
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "Force killing $service (PID: $pid)"
                kill -KILL "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$pid_file"
    fi
    
    # Also kill any processes on the expected ports
    case "$service" in
        "sms") kill_process_on_port "$SMS_PORT" "SMS bot" ;;
        "web") kill_process_on_port "$WEB_PORT" "web server" ;;
        "ngrok") kill_process_on_port "$NGROK_PORT" "ngrok" ;;
        "engine") log_debug "Engine doesn't use a fixed port" ;;
    esac
}

# Function to start all services for a worktree
start_services() {
    local worktree_id="$1"
    
    # Get worktree data
    get_worktree_data "$worktree_id"
    
    log_info "Starting all services for worktree $worktree_id (branch: $WORKTREE_BRANCH)"
    
    # Ensure we're in the right directory
    if [[ ! -d "$WORKTREE_PATH" ]]; then
        log_error "Worktree path does not exist: $WORKTREE_PATH"
        return 1
    fi
    
    # Start services in order
    start_sms_service "$worktree_id"
    start_web_service "$worktree_id"
    start_engine_service "$worktree_id"
    
    # Start ngrok if auth token is available
    if [[ -n "${NGROK_AUTH_TOKEN:-}" ]] || grep -q "NGROK_AUTH_TOKEN=" "$WORKTREE_PATH/.env.local" 2>/dev/null; then
        start_ngrok_service "$worktree_id"
    else
        log_warning "NGROK_AUTH_TOKEN not set, skipping ngrok tunnel"
    fi
    
    log_success "All services started for worktree $worktree_id"
    log_info "SMS Bot: http://localhost:$SMS_PORT"
    log_info "Web App: http://localhost:$WEB_PORT"
}

# Function to stop all services for a worktree
stop_services() {
    local worktree_id="$1"
    
    # Get worktree data (may fail if worktree was removed)
    get_worktree_data "$worktree_id" || true
    
    log_info "Stopping all services for worktree $worktree_id"
    
    # Stop all services
    for service in "sms" "web" "engine" "ngrok"; do
        stop_service "$worktree_id" "$service"
    done
    
    # Clean up any remaining processes on the ports
    if [[ -n "${SMS_PORT:-}" ]]; then
        kill_process_on_port "$SMS_PORT" "SMS bot"
    fi
    if [[ -n "${WEB_PORT:-}" ]]; then
        kill_process_on_port "$WEB_PORT" "web server"
    fi
    if [[ -n "${NGROK_PORT:-}" ]]; then
        kill_process_on_port "$NGROK_PORT" "ngrok"
    fi
    
    log_success "All services stopped for worktree $worktree_id"
}

# Function to restart all services
restart_services() {
    local worktree_id="$1"
    
    log_info "Restarting services for worktree $worktree_id"
    stop_services "$worktree_id"
    sleep 3
    start_services "$worktree_id"
}

# Function to show service status
show_service_status() {
    local worktree_id="$1"
    
    # Get worktree data
    if ! get_worktree_data "$worktree_id"; then
        return 1
    fi
    
    echo "Service status for worktree $worktree_id (branch: $WORKTREE_BRANCH):"
    echo ""
    
    # Check each service
    local services=("sms:$SMS_PORT" "web:$WEB_PORT" "ngrok:$NGROK_PORT")
    
    for service_port in "${services[@]}"; do
        IFS=':' read -r service port <<< "$service_port"
        local pid_file="$WORKTREE_DATA_DIR/worktree-${worktree_id}-${service}.pid"
        
        printf "  %-8s " "$service:"
        
        if [[ -f "$pid_file" ]] && kill -0 "$(cat $pid_file)" 2>/dev/null; then
            local pid=$(cat "$pid_file")
            if is_service_running "$port"; then
                echo -e "${GREEN}RUNNING${NC} (PID: $pid, Port: $port)"
            else
                echo -e "${YELLOW}STARTED${NC} (PID: $pid, Port: $port not responding)"
            fi
        else
            if is_service_running "$port"; then
                echo -e "${YELLOW}RUNNING${NC} (Port: $port, unknown PID)"
            else
                echo -e "${RED}STOPPED${NC} (Port: $port)"
            fi
        fi
    done
    
    # Check engine (no fixed port)
    local engine_pid_file="$WORKTREE_DATA_DIR/worktree-${worktree_id}-engine.pid"
    printf "  %-8s " "engine:"
    if [[ -f "$engine_pid_file" ]] && kill -0 "$(cat $engine_pid_file)" 2>/dev/null; then
        local pid=$(cat "$engine_pid_file")
        echo -e "${GREEN}RUNNING${NC} (PID: $pid)"
    else
        echo -e "${RED}STOPPED${NC}"
    fi
}

# Main command processing
main() {
    local command="${1:-status}"
    local worktree_id="${2:-}"
    
    if [[ -z "$worktree_id" && "$command" != "help" ]]; then
        log_error "Worktree ID required"
        echo "Usage: $0 <start|stop|restart|status> <worktree-id>"
        exit 1
    fi
    
    case "$command" in
        "start")
            start_services "$worktree_id"
            ;;
        "stop")
            stop_services "$worktree_id"
            ;;
        "restart")
            restart_services "$worktree_id"
            ;;
        "status")
            show_service_status "$worktree_id"
            ;;
        "help"|"-h"|"--help")
            echo "WEBTOYS Service Manager"
            echo ""
            echo "Usage: $0 <command> <worktree-id>"
            echo ""
            echo "Commands:"
            echo "  start <worktree-id>    Start all services for worktree"
            echo "  stop <worktree-id>     Stop all services for worktree"
            echo "  restart <worktree-id>  Restart all services for worktree"
            echo "  status <worktree-id>   Show service status for worktree"
            echo "  help                   Show this help"
            ;;
        *)
            log_error "Unknown command: $command"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"