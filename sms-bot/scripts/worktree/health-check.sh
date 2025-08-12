#!/bin/bash

# WEBTOYS Health Check System
# ===========================
# Performs health checks on all services in a worktree

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Health check functions

# Function to check if a port is responding
check_port() {
    local port="$1"
    local timeout="${2:-3}"
    
    if command -v nc >/dev/null 2>&1; then
        nc -z -w "$timeout" localhost "$port" >/dev/null 2>&1
    elif command -v telnet >/dev/null 2>&1; then
        timeout "$timeout" telnet localhost "$port" >/dev/null 2>&1
    else
        # Fallback to lsof
        lsof -ti:$port >/dev/null 2>&1
    fi
}

# Function to check HTTP endpoint
check_http_endpoint() {
    local url="$1"
    local timeout="${2:-5}"
    
    if command -v curl >/dev/null 2>&1; then
        curl -s --max-time "$timeout" --fail "$url" >/dev/null 2>&1
    elif command -v wget >/dev/null 2>&1; then
        wget -q --timeout="$timeout" --tries=1 -O /dev/null "$url" >/dev/null 2>&1
    else
        return 1
    fi
}

# Function to get process info for a port
get_process_info() {
    local port="$1"
    
    if command -v lsof >/dev/null 2>&1; then
        lsof -ti:$port 2>/dev/null | head -1 | xargs ps -p 2>/dev/null | tail -1 || echo "Unknown process"
    else
        echo "Process info unavailable"
    fi
}

# Function to check individual service health
check_service_health() {
    local service="$1"
    local port="$2"
    local worktree_id="$3"
    
    local status="UNKNOWN"
    local details=""
    
    # Check if process is running via PID file
    local pid_file="$WORKTREE_DATA_DIR/worktree-${worktree_id}-${service}.pid"
    local has_pid=false
    local pid=""
    
    if [[ -f "$pid_file" ]]; then
        pid=$(cat "$pid_file" 2>/dev/null || echo "")
        if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
            has_pid=true
        fi
    fi
    
    # Check port availability
    local port_active=false
    if [[ -n "$port" ]] && check_port "$port"; then
        port_active=true
    fi
    
    # Determine status based on checks
    case "$service" in
        "sms"|"web")
            # These services should have both PID and active port
            if [[ "$has_pid" == "true" && "$port_active" == "true" ]]; then
                status="HEALTHY"
                
                # Additional HTTP health check for SMS bot
                if [[ "$service" == "sms" ]]; then
                    if check_http_endpoint "http://localhost:$port/health" 2; then
                        details="HTTP OK"
                    else
                        status="DEGRADED"
                        details="Port open but HTTP unresponsive"
                    fi
                elif [[ "$service" == "web" ]]; then
                    if check_http_endpoint "http://localhost:$port" 2; then
                        details="HTTP OK"
                    else
                        status="DEGRADED" 
                        details="Port open but HTTP unresponsive"
                    fi
                fi
            elif [[ "$has_pid" == "true" && "$port_active" == "false" ]]; then
                status="STARTING"
                details="Process running, port not ready"
            elif [[ "$has_pid" == "false" && "$port_active" == "true" ]]; then
                status="ORPHANED"
                details="Port occupied by unknown process"
            else
                status="STOPPED"
                details="Not running"
            fi
            ;;
        "engine")
            # Engine doesn't use a fixed port, just check PID
            if [[ "$has_pid" == "true" ]]; then
                status="HEALTHY"
                details="Process running"
            else
                status="STOPPED"
                details="Not running"
            fi
            ;;
        "ngrok")
            # Ngrok should have PID and might have port
            if [[ "$has_pid" == "true" ]]; then
                # Try to check ngrok API (usually on port 4040)
                if check_http_endpoint "http://localhost:4040/api/tunnels" 1 2>/dev/null; then
                    status="HEALTHY"
                    details="Tunnel active"
                else
                    status="DEGRADED"
                    details="Process running, tunnel status unknown"
                fi
            else
                status="STOPPED"
                details="Not running"
            fi
            ;;
    esac
    
    echo "$status|$details|$pid"
}

# Function to get overall worktree health
get_worktree_health() {
    local worktree_id="$1"
    
    # Get worktree data
    local worktree_info
    worktree_info=$(get_worktree_info "$worktree_id")
    
    if [[ -z "$worktree_info" ]]; then
        echo "NOT_FOUND"
        return 1
    fi
    
    # Parse the info
    IFS=':' read -r wt_id branch path ports timestamp <<< "$worktree_info"
    IFS=':' read -r sms_port web_port ngrok_port <<< "$ports"
    
    # Check each service
    local sms_health=$(check_service_health "sms" "$sms_port" "$worktree_id")
    local web_health=$(check_service_health "web" "$web_port" "$worktree_id")
    local engine_health=$(check_service_health "engine" "" "$worktree_id")
    local ngrok_health=$(check_service_health "ngrok" "$ngrok_port" "$worktree_id")
    
    # Extract statuses
    local sms_status=$(echo "$sms_health" | cut -d'|' -f1)
    local web_status=$(echo "$web_health" | cut -d'|' -f1)
    local engine_status=$(echo "$engine_health" | cut -d'|' -f1)
    local ngrok_status=$(echo "$ngrok_health" | cut -d'|' -f1)
    
    # Determine overall status
    local healthy_count=0
    local degraded_count=0
    local stopped_count=0
    
    for status in "$sms_status" "$web_status" "$engine_status" "$ngrok_status"; do
        case "$status" in
            "HEALTHY") ((healthy_count++)) ;;
            "DEGRADED"|"STARTING"|"ORPHANED") ((degraded_count++)) ;;
            "STOPPED") ((stopped_count++)) ;;
        esac
    done
    
    # Overall health logic
    if [[ $healthy_count -eq 4 ]]; then
        echo "HEALTHY"
    elif [[ $healthy_count -ge 2 && $degraded_count -gt 0 ]]; then
        echo "DEGRADED"
    elif [[ $stopped_count -ge 3 ]]; then
        echo "STOPPED"
    else
        echo "PARTIAL"
    fi
}

# Function to show detailed health report
show_detailed_health() {
    local worktree_id="$1"
    
    # Get worktree data
    local worktree_info
    worktree_info=$(get_worktree_info "$worktree_id")
    
    if [[ -z "$worktree_info" ]]; then
        log_error "Worktree $worktree_id not found"
        return 1
    fi
    
    # Parse the info
    IFS=':' read -r wt_id branch path ports timestamp <<< "$worktree_info"
    IFS=':' read -r sms_port web_port ngrok_port <<< "$ports"
    
    echo "Health Report for Worktree $worktree_id"
    echo "========================================"
    echo "Branch: $branch"
    echo "Path: $path"
    echo "Started: $(date -r "$timestamp" 2>/dev/null || echo "unknown")"
    echo ""
    
    printf "%-12s %-8s %-10s %-6s %-30s %s\n" "SERVICE" "STATUS" "PORT" "PID" "DETAILS" "URL"
    printf "%s\n" "$(printf '─%.0s' {1..80})"
    
    # Check each service
    local services=("sms:$sms_port" "web:$web_port" "engine:" "ngrok:$ngrok_port")
    
    for service_port in "${services[@]}"; do
        IFS=':' read -r service port <<< "$service_port"
        
        local health_info=$(check_service_health "$service" "$port" "$worktree_id")
        IFS='|' read -r status details pid <<< "$health_info"
        
        # Determine color
        local color=""
        case "$status" in
            "HEALTHY") color="$GREEN" ;;
            "DEGRADED"|"STARTING") color="$YELLOW" ;;
            "STOPPED"|"ORPHANED") color="$RED" ;;
            *) color="$NC" ;;
        esac
        
        # Generate URL
        local url=""
        case "$service" in
            "sms") url="http://localhost:$port/health" ;;
            "web") url="http://localhost:$port" ;;
            "ngrok") url="https://localhost:4040" ;;
        esac
        
        printf "%-12s ${color}%-8s${NC} %-10s %-6s %-30s %s\n" \
            "$service" "$status" "${port:-N/A}" "${pid:-N/A}" "$details" "$url"
    done
    
    echo ""
    
    # Overall status
    local overall_health=$(get_worktree_health "$worktree_id")
    echo -n "Overall Status: "
    case "$overall_health" in
        "HEALTHY") echo -e "${GREEN}HEALTHY${NC} - All services operational" ;;
        "DEGRADED") echo -e "${YELLOW}DEGRADED${NC} - Some services have issues" ;;
        "PARTIAL") echo -e "${YELLOW}PARTIAL${NC} - Mixed service states" ;;
        "STOPPED") echo -e "${RED}STOPPED${NC} - Most services are down" ;;
        *) echo -e "${RED}UNKNOWN${NC} - Unable to determine status" ;;
    esac
}

# Function to show health summary for all worktrees
show_all_health() {
    echo "WEBTOYS Multi-Worktree Health Dashboard"
    echo "======================================="
    echo ""
    
    if [[ ! -s "$ACTIVE_WORKTREES_FILE" ]]; then
        echo "No active worktrees"
        return 0
    fi
    
    printf "%-2s %-15s %-12s %-8s %-8s %-8s %-8s %-10s\n" \
        "ID" "BRANCH" "OVERALL" "SMS" "WEB" "ENGINE" "NGROK" "STARTED"
    printf "%s\n" "$(printf '─%.0s' {1..80})"
    
    while IFS=':' read -r worktree_id branch path ports timestamp; do
        # Get overall health
        local overall_health=$(get_worktree_health "$worktree_id")
        
        # Parse ports
        IFS=':' read -r sms_port web_port ngrok_port <<< "$ports"
        
        # Check individual services
        local sms_health=$(check_service_health "sms" "$sms_port" "$worktree_id" | cut -d'|' -f1)
        local web_health=$(check_service_health "web" "$web_port" "$worktree_id" | cut -d'|' -f1)
        local engine_health=$(check_service_health "engine" "" "$worktree_id" | cut -d'|' -f1)
        local ngrok_health=$(check_service_health "ngrok" "$ngrok_port" "$worktree_id" | cut -d'|' -f1)
        
        # Format timestamp
        local started_time=$(date -r "$timestamp" "+%m-%d %H:%M" 2>/dev/null || echo "unknown")
        
        # Truncate branch name if too long
        local short_branch="${branch:0:14}"
        [[ ${#branch} -gt 14 ]] && short_branch="${short_branch}+"
        
        printf "%-2s %-15s %-12s %-8s %-8s %-8s %-8s %-10s\n" \
            "$worktree_id" "$short_branch" "$overall_health" \
            "$sms_health" "$web_health" "$engine_health" "$ngrok_health" "$started_time"
            
    done < "$ACTIVE_WORKTREES_FILE"
    
    echo ""
    echo "Legend: HEALTHY=All OK, DEGRADED=Issues, PARTIAL=Mixed, STOPPED=Down"
    echo ""
    echo "For detailed health: $0 detailed <worktree-id>"
}

# Function to run continuous monitoring
monitor_health() {
    local refresh_interval="${1:-10}"
    
    echo "Starting health monitoring (refresh every ${refresh_interval}s)"
    echo "Press Ctrl+C to stop"
    echo ""
    
    while true; do
        clear
        show_all_health
        echo ""
        echo "Last updated: $(date)"
        echo "Refreshing in ${refresh_interval}s... (Ctrl+C to stop)"
        
        sleep "$refresh_interval"
    done
}

# Function to check and restart unhealthy services
auto_heal() {
    local worktree_id="$1"
    
    log_info "Running auto-heal for worktree $worktree_id"
    
    local overall_health=$(get_worktree_health "$worktree_id")
    
    if [[ "$overall_health" == "HEALTHY" ]]; then
        log_success "Worktree $worktree_id is healthy, no action needed"
        return 0
    fi
    
    log_warning "Worktree $worktree_id is $overall_health, attempting to heal"
    
    # Get worktree data
    local worktree_info
    worktree_info=$(get_worktree_info "$worktree_id")
    IFS=':' read -r wt_id branch path ports timestamp <<< "$worktree_info"
    IFS=':' read -r sms_port web_port ngrok_port <<< "$ports"
    
    # Check and restart services as needed
    local services=("sms:$sms_port" "web:$web_port" "engine:" "ngrok:$ngrok_port")
    local restarted=false
    
    for service_port in "${services[@]}"; do
        IFS=':' read -r service port <<< "$service_port"
        
        local health_info=$(check_service_health "$service" "$port" "$worktree_id")
        local status=$(echo "$health_info" | cut -d'|' -f1)
        
        if [[ "$status" != "HEALTHY" ]]; then
            log_warning "Service $service is $status, restarting..."
            "$SCRIPT_DIR/service-manager.sh" stop "$worktree_id" 2>/dev/null || true
            sleep 3
            "$SCRIPT_DIR/service-manager.sh" start "$worktree_id"
            restarted=true
            break  # Restart all services at once
        fi
    done
    
    if [[ "$restarted" == "true" ]]; then
        log_info "Services restarted, checking health again in 10 seconds..."
        sleep 10
        
        local new_health=$(get_worktree_health "$worktree_id")
        if [[ "$new_health" == "HEALTHY" ]]; then
            log_success "Auto-heal successful: worktree $worktree_id is now healthy"
        else
            log_warning "Auto-heal partially successful: worktree $worktree_id is now $new_health"
        fi
    else
        log_info "No services were restarted"
    fi
}

# Main command processing
main() {
    local command="${1:-summary}"
    local worktree_id="${2:-}"
    
    case "$command" in
        "check"|"status")
            if [[ -n "$worktree_id" ]]; then
                get_worktree_health "$worktree_id"
            else
                show_all_health
            fi
            ;;
        "detailed"|"detail")
            if [[ -z "$worktree_id" ]]; then
                log_error "Worktree ID required for detailed health check"
                echo "Usage: $0 detailed <worktree-id>"
                exit 1
            fi
            show_detailed_health "$worktree_id"
            ;;
        "summary"|"all")
            show_all_health
            ;;
        "monitor")
            local interval="${worktree_id:-10}"
            monitor_health "$interval"
            ;;
        "heal")
            if [[ -z "$worktree_id" ]]; then
                log_error "Worktree ID required for auto-heal"
                echo "Usage: $0 heal <worktree-id>"
                exit 1
            fi
            auto_heal "$worktree_id"
            ;;
        "help"|"-h"|"--help")
            cat << EOF
WEBTOYS Health Check System

Usage: $0 <command> [options]

Commands:
  check [worktree-id]      Quick health check (overall status only)
  detailed <worktree-id>   Detailed health report for worktree
  summary                  Health summary for all worktrees
  monitor [interval]       Continuous monitoring (default: 10s refresh)
  heal <worktree-id>       Auto-restart unhealthy services
  help                     Show this help

Examples:
  $0 summary               # Show all worktrees health
  $0 detailed 1            # Detailed report for worktree 1
  $0 monitor 5             # Monitor with 5s refresh
  $0 heal 2                # Auto-restart services in worktree 2

Health Status:
  HEALTHY     All services operational
  DEGRADED    Services running but some issues detected
  PARTIAL     Mixed service states (some up, some down)
  STOPPED     Most or all services are down
  NOT_FOUND   Worktree doesn't exist
EOF
            ;;
        *)
            # If first argument looks like a number, assume it's a worktree ID
            if [[ "$command" =~ ^[0-9]+$ ]]; then
                get_worktree_health "$command"
            else
                log_error "Unknown command: $command"
                exit 1
            fi
            ;;
    esac
}

# Run main function
main "$@"