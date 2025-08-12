#!/bin/bash

# WEBTOYS Multi-Worktree Status Dashboard
# =======================================
# Comprehensive status dashboard showing all worktrees, services, and system info

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Function to show system overview
show_system_overview() {
    echo "🔧 WEBTOYS Multi-Worktree System Overview"
    echo "=========================================="
    echo ""
    
    # System info
    echo "📊 System Information:"
    echo "  Host: $(hostname)"
    echo "  OS: $(uname -s) $(uname -r)"
    echo "  Time: $(date)"
    echo "  Uptime: $(uptime | sed 's/.*up //' | sed 's/, [0-9]* user.*//')"
    echo ""
    
    # Project info
    echo "📁 Project Information:"
    echo "  Project Root: $PROJECT_ROOT"
    echo "  Worktree Base: $WORKTREE_BASE"
    echo "  Max Worktrees: $MAX_WORKTREES"
    echo "  Config: $SCRIPT_DIR/config.sh"
    echo ""
    
    # Git info
    if [[ -d "$PROJECT_ROOT/.git" ]]; then
        cd "$PROJECT_ROOT"
        echo "🔀 Git Information:"
        echo "  Current Branch: $(git branch --show-current)"
        echo "  Last Commit: $(git log -1 --pretty=format:'%h %s' --abbrev-commit)"
        echo "  Remote: $(git remote get-url origin 2>/dev/null || echo 'No remote')"
        echo ""
    fi
}

# Function to show port allocation summary
show_port_summary() {
    echo "🌐 Port Allocation:"
    echo "  Worktree 1: SMS=3030, Web=3000, Ngrok=8000"
    echo "  Worktree 2: SMS=3031, Web=3001, Ngrok=8001"
    echo "  Worktree 3: SMS=3032, Web=3002, Ngrok=8002"
    echo ""
    
    # Show actual port usage
    echo "📡 Current Port Usage:"
    for i in {1..3}; do
        local ports="$(get_worktree_ports "$i")"
        IFS=':' read -r sms_port web_port ngrok_port <<< "$ports"
        
        printf "  Worktree %d: " $i
        
        # Check each port
        for port in $sms_port $web_port $ngrok_port; do
            if lsof -ti:$port >/dev/null 2>&1; then
                echo -n -e "${GREEN}$port${NC} "
            else
                echo -n -e "${RED}$port${NC} "
            fi
        done
        echo ""
    done
    echo ""
}

# Function to show active worktrees summary
show_worktrees_summary() {
    echo "🔧 Active Worktrees:"
    
    if [[ ! -s "$ACTIVE_WORKTREES_FILE" ]]; then
        echo "  None active"
        echo ""
        return 0
    fi
    
    local total_worktrees=0
    local healthy_count=0
    
    while IFS=':' read -r worktree_id branch path ports timestamp; do
        ((total_worktrees++))
        
        local health=$("$SCRIPT_DIR/health-check.sh" "$worktree_id" 2>/dev/null || echo "UNKNOWN")
        local color=""
        
        case "$health" in
            "HEALTHY") color="$GREEN"; ((healthy_count++)) ;;
            "DEGRADED"|"PARTIAL") color="$YELLOW" ;;
            "STOPPED") color="$RED" ;;
            *) color="$NC" ;;
        esac
        
        local started_time=$(date -r "$timestamp" "+%m-%d %H:%M" 2>/dev/null || echo "unknown")
        
        printf "  %d. %-20s ${color}%-10s${NC} %s (started: %s)\n" \
            "$worktree_id" "$branch" "$health" "$ports" "$started_time"
        
    done < "$ACTIVE_WORKTREES_FILE"
    
    echo ""
    echo "  Summary: $healthy_count/$total_worktrees healthy"
    echo ""
}

# Function to show tmux sessions
show_tmux_summary() {
    echo "💻 Tmux Sessions:"
    
    if ! command -v tmux >/dev/null 2>&1; then
        echo "  Tmux not available"
        echo ""
        return 0
    fi
    
    local tmux_sessions
    if tmux_sessions=$(tmux list-sessions 2>/dev/null | grep "^${TMUX_SESSION_PREFIX}-"); then
        while read -r session_line; do
            local session_name=$(echo "$session_line" | cut -d: -f1)
            local worktree_id=${session_name#${TMUX_SESSION_PREFIX}-}
            local windows=$(echo "$session_line" | grep -o '[0-9]* windows' || echo "? windows")
            local attached=$(echo "$session_line" | grep -o '(attached)' || echo "")
            
            printf "  %-12s %s %s\n" "$session_name" "$windows" "$attached"
        done <<< "$tmux_sessions"
    else
        echo "  No active WEBTOYS tmux sessions"
    fi
    echo ""
}

# Function to show resource usage
show_resource_usage() {
    echo "💾 Resource Usage:"
    
    # Memory usage
    if command -v free >/dev/null 2>&1; then
        local mem_info=$(free -h | grep '^Mem:')
        echo "  Memory: $(echo $mem_info | awk '{print $3 "/" $2 " (" $3/$2*100 "% used)"}')"
    elif [[ "$(uname)" == "Darwin" ]]; then
        # macOS memory info
        local total_mem=$(sysctl -n hw.memsize | awk '{print int($1/1024/1024/1024) "GB"}')
        echo "  Memory: Total $total_mem"
    fi
    
    # Disk usage for project directory
    local disk_usage=$(du -sh "$PROJECT_ROOT" 2>/dev/null | cut -f1 || echo "Unknown")
    echo "  Project Size: $disk_usage"
    
    # Active processes related to our services
    local process_count=0
    if pgrep -f "node.*sms-bot" >/dev/null 2>&1; then
        process_count=$((process_count + $(pgrep -f "node.*sms-bot" | wc -l)))
    fi
    if pgrep -f "next.*start" >/dev/null 2>&1; then
        process_count=$((process_count + $(pgrep -f "next.*start" | wc -l)))
    fi
    if pgrep -f "ngrok" >/dev/null 2>&1; then
        process_count=$((process_count + $(pgrep -f "ngrok" | wc -l)))
    fi
    
    echo "  Active Processes: $process_count"
    echo ""
}

# Function to show logs summary
show_logs_summary() {
    echo "📝 Recent Logs:"
    
    if [[ -d "$LOG_DIR" ]]; then
        # Show most recent log files
        local recent_logs=$(find "$LOG_DIR" -name "*.log" -type f -mtime -1 2>/dev/null | sort -t- -k3 -n | tail -5)
        
        if [[ -n "$recent_logs" ]]; then
            while read -r log_file; do
                local file_name=$(basename "$log_file")
                local file_size=$(du -h "$log_file" 2>/dev/null | cut -f1 || echo "?")
                local last_modified=$(stat -f "%Sm" -t "%m-%d %H:%M" "$log_file" 2>/dev/null || \
                                    stat -c "%y" "$log_file" 2>/dev/null | cut -d' ' -f1-2 || echo "unknown")
                
                printf "  %-25s %6s  %s\n" "$file_name" "$file_size" "$last_modified"
            done <<< "$recent_logs"
        else
            echo "  No recent log files"
        fi
    else
        echo "  Log directory not found: $LOG_DIR"
    fi
    echo ""
}

# Function to show quick actions
show_quick_actions() {
    echo "⚡ Quick Actions:"
    echo "  Start new worktree:     ./wtaf-worktree.sh start <branch-name>"
    echo "  Stop worktree:          ./wtaf-worktree.sh stop <worktree-id>"
    echo "  Switch to worktree:     ./wtaf-worktree.sh switch <worktree-id>"
    echo "  Health check:           ./health-check.sh detailed <worktree-id>"
    echo "  View logs:              ./wtaf-worktree.sh logs <worktree-id>"
    echo "  Cleanup inactive:       ./wtaf-worktree.sh cleanup"
    echo ""
    
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        echo "🚀 Quick Access Aliases:"
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            echo "  wtaf-$worktree_id     # Switch to $branch"
        done < "$ACTIVE_WORKTREES_FILE"
        echo ""
    fi
}

# Function to show warnings and recommendations
show_warnings_recommendations() {
    local warnings=()
    local recommendations=()
    
    # Check for common issues
    
    # Check if main .env.local exists
    if [[ ! -f "$PROJECT_ROOT/.env.local" ]]; then
        warnings+=("Missing main .env.local file")
        recommendations+=("Create .env.local from .env.local.example")
    fi
    
    # Check for port conflicts
    local port_conflicts=0
    for i in {1..3}; do
        local ports="$(get_worktree_ports "$i")"
        IFS=':' read -r sms_port web_port ngrok_port <<< "$ports"
        
        for port in $sms_port $web_port $ngrok_port; do
            if lsof -ti:$port >/dev/null 2>&1 && ! is_worktree_active "$i"; then
                ((port_conflicts++))
            fi
        done
    done
    
    if [[ $port_conflicts -gt 0 ]]; then
        warnings+=("$port_conflicts ports are occupied by non-worktree processes")
        recommendations+=("Run 'lsof -ti:PORT | xargs kill' to free ports")
    fi
    
    # Check disk space
    if command -v df >/dev/null 2>&1; then
        local disk_usage=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | sed 's/%//')
        if [[ $disk_usage -gt 90 ]]; then
            warnings+=("Disk usage is high: ${disk_usage}%")
            recommendations+=("Clean up old worktrees or log files")
        fi
    fi
    
    # Check for orphaned worktree directories
    if [[ -d "$WORKTREE_BASE" ]]; then
        local orphaned_dirs=$(find "$WORKTREE_BASE" -maxdepth 1 -type d -name "worktree-*" | wc -l)
        local active_count=$(wc -l < "$ACTIVE_WORKTREES_FILE" 2>/dev/null || echo 0)
        
        if [[ $orphaned_dirs -gt $active_count ]]; then
            warnings+=("$((orphaned_dirs - active_count)) orphaned worktree directories found")
            recommendations+=("Run './wtaf-worktree.sh cleanup' to clean up")
        fi
    fi
    
    # Show warnings
    if [[ ${#warnings[@]} -gt 0 ]]; then
        echo "⚠️  Warnings:"
        for warning in "${warnings[@]}"; do
            echo "  • $warning"
        done
        echo ""
    fi
    
    # Show recommendations
    if [[ ${#recommendations[@]} -gt 0 ]]; then
        echo "💡 Recommendations:"
        for rec in "${recommendations[@]}"; do
            echo "  • $rec"
        done
        echo ""
    fi
    
    # Show all clear if no issues
    if [[ ${#warnings[@]} -eq 0 ]]; then
        echo -e "✅ ${GREEN}System Status: All Clear${NC}"
        echo ""
    fi
}

# Function to show full dashboard
show_full_dashboard() {
    clear
    show_system_overview
    show_port_summary
    show_worktrees_summary
    show_tmux_summary
    show_resource_usage
    show_logs_summary
    show_quick_actions
    show_warnings_recommendations
}

# Function to show compact status
show_compact_status() {
    echo "🔧 WEBTOYS Status ($(date +%H:%M:%S))"
    echo "=================================="
    
    if [[ ! -s "$ACTIVE_WORKTREES_FILE" ]]; then
        echo "No active worktrees"
        return 0
    fi
    
    printf "%-2s %-15s %-10s %-12s %s\n" "ID" "BRANCH" "STATUS" "PORTS" "TMUX"
    printf "%s\n" "$(printf '─%.0s' {1..50})"
    
    while IFS=':' read -r worktree_id branch path ports timestamp; do
        local health=$("$SCRIPT_DIR/health-check.sh" "$worktree_id" 2>/dev/null || echo "UNKNOWN")
        local tmux_session=$(get_session_name "$worktree_id")
        local tmux_status="❌"
        
        if tmux has-session -t "$tmux_session" 2>/dev/null; then
            if tmux list-sessions | grep -q "$tmux_session.*attached"; then
                tmux_status="🔗"
            else
                tmux_status="✅"
            fi
        fi
        
        local short_branch="${branch:0:14}"
        [[ ${#branch} -gt 14 ]] && short_branch="${short_branch}+"
        
        printf "%-2s %-15s %-10s %-12s %s\n" \
            "$worktree_id" "$short_branch" "$health" "$ports" "$tmux_status"
            
    done < "$ACTIVE_WORKTREES_FILE"
    
    echo ""
    echo "Legend: ✅=tmux ready, 🔗=tmux attached, ❌=tmux missing"
}

# Function for live monitoring
monitor_dashboard() {
    local refresh_interval="${1:-30}"
    
    echo "Starting live dashboard monitoring (refresh every ${refresh_interval}s)"
    echo "Press Ctrl+C to stop"
    sleep 2
    
    while true; do
        show_compact_status
        echo ""
        echo "Last updated: $(date) | Refreshing in ${refresh_interval}s"
        echo "Press Ctrl+C to stop monitoring"
        
        sleep "$refresh_interval"
        clear
    done
}

# Main command processing
main() {
    local command="${1:-full}"
    
    case "$command" in
        "full"|"dashboard")
            show_full_dashboard
            ;;
        "compact"|"summary")
            show_compact_status
            ;;
        "overview"|"system")
            show_system_overview
            ;;
        "ports")
            show_port_summary
            ;;
        "worktrees")
            show_worktrees_summary
            ;;
        "tmux")
            show_tmux_summary
            ;;
        "resources")
            show_resource_usage
            ;;
        "logs")
            show_logs_summary
            ;;
        "warnings")
            show_warnings_recommendations
            ;;
        "monitor")
            local interval="${2:-30}"
            monitor_dashboard "$interval"
            ;;
        "help"|"-h"|"--help")
            cat << EOF
WEBTOYS Status Dashboard

Usage: $0 [command] [options]

Commands:
  full                     Show complete dashboard (default)
  compact                  Show compact status summary
  overview                 Show system overview only
  ports                    Show port allocation and usage
  worktrees               Show active worktrees summary
  tmux                    Show tmux sessions summary
  resources               Show resource usage
  logs                    Show recent logs summary
  warnings                Show warnings and recommendations
  monitor [interval]      Live monitoring (default: 30s refresh)
  help                    Show this help

Examples:
  $0                      # Show full dashboard
  $0 compact              # Quick status check
  $0 monitor 10           # Live monitoring with 10s refresh
  $0 ports                # Show port usage only

The full dashboard includes:
  • System information
  • Port allocation and usage
  • Active worktrees with health status
  • Tmux sessions
  • Resource usage
  • Recent logs
  • Quick actions and aliases
  • Warnings and recommendations
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