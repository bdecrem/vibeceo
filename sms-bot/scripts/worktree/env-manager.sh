#!/bin/bash

# WEBTOYS Environment Manager
# ===========================
# Manages environment variables and configuration for worktrees

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Function to validate main environment file
validate_main_env() {
    local main_env="$PROJECT_ROOT/.env.local"
    
    if [[ ! -f "$main_env" ]]; then
        log_error "Main .env.local not found at: $main_env"
        log_info "Create it from .env.local.example first"
        return 1
    fi
    
    # Check for required variables
    local required_vars=(
        "SUPABASE_URL"
        "SUPABASE_SERVICE_KEY"
        "SUPABASE_ANON_KEY"
        "OPENAI_API_KEY"
        "ANTHROPIC_API_KEY"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^$var=" "$main_env"; then
            missing_vars+=("$var")
        fi
    done
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_error "Missing required environment variables in $main_env:"
        for var in "${missing_vars[@]}"; do
            log_error "  - $var"
        done
        return 1
    fi
    
    log_success "Main environment file validation passed"
    return 0
}

# Function to create worktree environment file
create_worktree_env() {
    local worktree_id="$1"
    local branch="$2"
    local worktree_path="$3"
    
    log_info "Creating environment configuration for worktree $worktree_id"
    
    # Validate main environment first
    if ! validate_main_env; then
        return 1
    fi
    
    local main_env="$PROJECT_ROOT/.env.local"
    local worktree_env="$worktree_path/.env.local"
    local template_file="$SCRIPT_DIR/.env.worktree.template"
    
    # Get port configuration
    local ports="$(get_worktree_ports "$worktree_id")"
    IFS=':' read -r sms_port web_port ngrok_port <<< "$ports"
    
    # Generate ngrok subdomain
    local ngrok_subdomain="wtaf-${branch//[^a-zA-Z0-9]/-}-${worktree_id}"
    ngrok_subdomain=$(echo "$ngrok_subdomain" | tr '[:upper:]' '[:lower:]' | sed 's/--*/-/g' | sed 's/^-\|-$//g')
    
    # Copy template
    cp "$template_file" "$worktree_env"
    
    log_debug "Populating environment variables from main config"
    
    # Read main environment and substitute values
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ $key =~ ^[[:space:]]*# ]] && continue
        [[ -z "$key" ]] && continue
        
        # Remove quotes from value if present
        value=$(echo "$value" | sed 's/^"//;s/"$//')
        
        # Escape special characters for sed
        escaped_value=$(echo "$value" | sed 's/[\/&]/\\&/g')
        
        # Replace in template
        sed -i.bak "s/{{$key}}/$escaped_value/g" "$worktree_env"
    done < "$main_env"
    
    # Set worktree-specific values
    sed -i.bak "s/{{WORKTREE_ID}}/$worktree_id/g" "$worktree_env"
    sed -i.bak "s/{{WORKTREE_BRANCH}}/$branch/g" "$worktree_env"
    sed -i.bak "s/{{SMS_PORT}}/$sms_port/g" "$worktree_env"
    sed -i.bak "s/{{WEB_PORT}}/$web_port/g" "$worktree_env"
    sed -i.bak "s/{{NGROK_PORT}}/$ngrok_port/g" "$worktree_env"
    sed -i.bak "s/{{NGROK_SUBDOMAIN}}/$ngrok_subdomain/g" "$worktree_env"
    
    # Clean up backup file
    rm -f "$worktree_env.bak"
    
    # Create environment files in subdirectories
    create_sms_env "$worktree_path" "$worktree_env"
    create_web_env "$worktree_path" "$worktree_env"
    
    log_success "Environment configuration created: $worktree_env"
    log_info "Ports: SMS=$sms_port, Web=$web_port, Ngrok=$ngrok_port"
    log_info "Ngrok subdomain: $ngrok_subdomain"
}

# Function to create SMS bot specific environment
create_sms_env() {
    local worktree_path="$1"
    local main_env="$2"
    local sms_env="$worktree_path/sms-bot/.env.local"
    
    log_debug "Creating SMS bot environment: $sms_env"
    
    # Copy main environment to SMS bot directory
    cp "$main_env" "$sms_env"
    
    # Add SMS-specific variables if needed
    cat >> "$sms_env" << EOF

# SMS Bot Specific Configuration
SMS_BOT_MODE=worktree
WORKER_PROCESSES=1
ENABLE_FILE_WATCHER=true
EOF
    
    log_debug "SMS bot environment created"
}

# Function to create web app specific environment
create_web_env() {
    local worktree_path="$1"
    local main_env="$2"
    local web_env="$worktree_path/web/.env.local"
    
    log_debug "Creating web app environment: $web_env"
    
    # Copy main environment to web directory
    cp "$main_env" "$web_env"
    
    # Add web-specific variables
    cat >> "$web_env" << EOF

# Web App Specific Configuration
NEXT_TELEMETRY_DISABLED=1
ANALYZE_BUNDLE=false
EOF
    
    log_debug "Web app environment created"
}

# Function to update environment variable across all worktrees
update_env_var() {
    local var_name="$1"
    local var_value="$2"
    local update_main="${3:-false}"
    
    log_info "Updating environment variable: $var_name"
    
    # Update main environment if requested
    if [[ "$update_main" == "true" ]]; then
        local main_env="$PROJECT_ROOT/.env.local"
        if [[ -f "$main_env" ]]; then
            if grep -q "^$var_name=" "$main_env"; then
                sed -i.bak "s/^$var_name=.*/$var_name=$var_value/" "$main_env"
                log_debug "Updated $var_name in main environment"
            else
                echo "$var_name=$var_value" >> "$main_env"
                log_debug "Added $var_name to main environment"
            fi
            rm -f "$main_env.bak"
        fi
    fi
    
    # Update all active worktrees
    local updated_count=0
    
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            local env_files=("$path/.env.local" "$path/sms-bot/.env.local" "$path/web/.env.local")
            
            for env_file in "${env_files[@]}"; do
                if [[ -f "$env_file" ]]; then
                    if grep -q "^$var_name=" "$env_file"; then
                        sed -i.bak "s/^$var_name=.*/$var_name=$var_value/" "$env_file"
                        rm -f "$env_file.bak"
                        ((updated_count++))
                    else
                        echo "$var_name=$var_value" >> "$env_file"
                        ((updated_count++))
                    fi
                fi
            done
        done < "$ACTIVE_WORKTREES_FILE"
    fi
    
    log_success "Updated $var_name in $updated_count environment files"
}

# Function to show environment summary
show_env_summary() {
    local worktree_id="${1:-}"
    
    if [[ -n "$worktree_id" ]]; then
        show_worktree_env "$worktree_id"
        return 0
    fi
    
    echo "🔧 Environment Configuration Summary"
    echo "===================================="
    echo ""
    
    # Main environment status
    local main_env="$PROJECT_ROOT/.env.local"
    echo "📁 Main Environment:"
    if [[ -f "$main_env" ]]; then
        local var_count=$(grep -c "^[A-Z]" "$main_env" 2>/dev/null || echo "0")
        local file_size=$(du -h "$main_env" 2>/dev/null | cut -f1 || echo "?")
        echo "  File: $main_env"
        echo "  Variables: $var_count"
        echo "  Size: $file_size"
        
        # Check for sensitive variables (masked)
        local sensitive_vars=("SUPABASE_SERVICE_KEY" "OPENAI_API_KEY" "ANTHROPIC_API_KEY" "TWILIO_AUTH_TOKEN")
        echo "  Key Variables:"
        for var in "${sensitive_vars[@]}"; do
            if grep -q "^$var=" "$main_env"; then
                local value=$(grep "^$var=" "$main_env" | cut -d'=' -f2- | head -c 10)
                echo "    $var: ${value}..."
            else
                echo "    $var: NOT SET"
            fi
        done
    else
        echo "  ❌ Missing: $main_env"
    fi
    echo ""
    
    # Worktree environments
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        echo "🔧 Worktree Environments:"
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            local env_file="$path/.env.local"
            printf "  Worktree %s (%s): " "$worktree_id" "$branch"
            
            if [[ -f "$env_file" ]]; then
                local var_count=$(grep -c "^[A-Z]" "$env_file" 2>/dev/null || echo "0")
                echo "✅ $var_count variables"
            else
                echo "❌ Missing"
            fi
        done < "$ACTIVE_WORKTREES_FILE"
    else
        echo "🔧 No active worktrees"
    fi
    echo ""
}

# Function to show detailed worktree environment
show_worktree_env() {
    local worktree_id="$1"
    
    local worktree_info
    worktree_info=$(get_worktree_info "$worktree_id")
    
    if [[ -z "$worktree_info" ]]; then
        log_error "Worktree $worktree_id not found"
        return 1
    fi
    
    IFS=':' read -r wt_id branch path ports timestamp <<< "$worktree_info"
    
    echo "🔧 Environment Details for Worktree $worktree_id"
    echo "=============================================="
    echo "Branch: $branch"
    echo "Path: $path"
    echo ""
    
    # Check environment files
    local env_files=(
        "$path/.env.local:Main"
        "$path/sms-bot/.env.local:SMS Bot"
        "$path/web/.env.local:Web App"
    )
    
    for env_info in "${env_files[@]}"; do
        IFS=':' read -r env_file env_type <<< "$env_info"
        
        echo "$env_type Environment:"
        if [[ -f "$env_file" ]]; then
            local var_count=$(grep -c "^[A-Z]" "$env_file" 2>/dev/null || echo "0")
            local file_size=$(du -h "$env_file" 2>/dev/null | cut -f1 || echo "?")
            
            echo "  File: $env_file"
            echo "  Variables: $var_count"
            echo "  Size: $file_size"
            
            # Show worktree-specific variables
            echo "  Worktree Variables:"
            local wt_vars=("WORKTREE_ID" "WORKTREE_BRANCH" "SMS_BOT_PORT" "WEB_PORT" "NGROK_PORT" "NGROK_SUBDOMAIN")
            for var in "${wt_vars[@]}"; do
                if grep -q "^$var=" "$env_file"; then
                    local value=$(grep "^$var=" "$env_file" | cut -d'=' -f2-)
                    echo "    $var: $value"
                fi
            done
        else
            echo "  ❌ Missing: $env_file"
        fi
        echo ""
    done
}

# Function to backup environment configurations
backup_environments() {
    local backup_dir="$WORKTREE_DATA_DIR/env-backups/$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    
    log_info "Creating environment backup: $backup_dir"
    
    # Backup main environment
    if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
        cp "$PROJECT_ROOT/.env.local" "$backup_dir/main.env.local"
        log_debug "Backed up main environment"
    fi
    
    # Backup worktree environments
    local backup_count=0
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            if [[ -f "$path/.env.local" ]]; then
                cp "$path/.env.local" "$backup_dir/worktree-${worktree_id}.env.local"
                ((backup_count++))
            fi
        done < "$ACTIVE_WORKTREES_FILE"
    fi
    
    log_success "Environment backup completed: $backup_count worktree environments backed up"
    echo "Backup location: $backup_dir"
}

# Function to restore environment from backup
restore_environments() {
    local backup_date="$1"
    local backup_dir="$WORKTREE_DATA_DIR/env-backups/$backup_date"
    
    if [[ ! -d "$backup_dir" ]]; then
        log_error "Backup directory not found: $backup_dir"
        return 1
    fi
    
    log_info "Restoring environments from backup: $backup_date"
    
    # Restore main environment
    if [[ -f "$backup_dir/main.env.local" ]]; then
        cp "$backup_dir/main.env.local" "$PROJECT_ROOT/.env.local"
        log_debug "Restored main environment"
    fi
    
    # Restore worktree environments
    local restore_count=0
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            local backup_file="$backup_dir/worktree-${worktree_id}.env.local"
            if [[ -f "$backup_file" ]]; then
                cp "$backup_file" "$path/.env.local"
                # Also update subdirectory environments
                create_sms_env "$path" "$path/.env.local"
                create_web_env "$path" "$path/.env.local"
                ((restore_count++))
            fi
        done < "$ACTIVE_WORKTREES_FILE"
    fi
    
    log_success "Environment restore completed: $restore_count worktree environments restored"
}

# Function to list available backups
list_backups() {
    local backup_base="$WORKTREE_DATA_DIR/env-backups"
    
    echo "📦 Environment Backups"
    echo "======================"
    echo ""
    
    if [[ ! -d "$backup_base" ]]; then
        echo "No backups found"
        return 0
    fi
    
    local backups=$(find "$backup_base" -maxdepth 1 -type d -name "20*" | sort -r)
    
    if [[ -z "$backups" ]]; then
        echo "No backups found"
        return 0
    fi
    
    printf "%-20s %-10s %-15s %s\n" "DATE" "SIZE" "FILES" "NOTES"
    printf "%s\n" "$(printf '─%.0s' {1..60})"
    
    while read -r backup_dir; do
        local backup_name=$(basename "$backup_dir")
        local backup_date=$(echo "$backup_name" | sed 's/\([0-9]\{8\}\)-\([0-9]\{6\}\)/\1 \2/')
        local backup_size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1 || echo "?")
        local file_count=$(find "$backup_dir" -name "*.env.local" | wc -l)
        local has_main=""
        [[ -f "$backup_dir/main.env.local" ]] && has_main="main+"
        
        printf "%-20s %-10s %-15s %s\n" "$backup_date" "$backup_size" "${file_count} files" "$has_main"
    done <<< "$backups"
    
    echo ""
    echo "To restore: $0 restore <backup-date>"
    echo "Example: $0 restore $(basename "$(echo "$backups" | head -1)" | tr '-' ' ')"
}

# Main command processing
main() {
    local command="${1:-summary}"
    
    case "$command" in
        "create")
            if [[ $# -lt 4 ]]; then
                log_error "Usage: $0 create <worktree-id> <branch> <worktree-path>"
                exit 1
            fi
            create_worktree_env "$2" "$3" "$4"
            ;;
        "update")
            if [[ $# -lt 3 ]]; then
                log_error "Usage: $0 update <var-name> <var-value> [update-main]"
                exit 1
            fi
            update_env_var "$2" "$3" "${4:-false}"
            ;;
        "summary"|"status")
            show_env_summary "$2"
            ;;
        "validate")
            validate_main_env
            ;;
        "backup")
            backup_environments
            ;;
        "restore")
            if [[ $# -lt 2 ]]; then
                log_error "Usage: $0 restore <backup-date>"
                echo "Available backups:"
                list_backups
                exit 1
            fi
            restore_environments "$2"
            ;;
        "list-backups")
            list_backups
            ;;
        "help"|"-h"|"--help")
            cat << EOF
WEBTOYS Environment Manager

Usage: $0 <command> [options]

Commands:
  create <id> <branch> <path>  Create environment for new worktree
  update <var> <value> [main]  Update environment variable across worktrees
  summary [worktree-id]        Show environment summary (all or specific)
  validate                     Validate main environment file
  backup                       Create backup of all environment files
  restore <backup-date>        Restore environments from backup
  list-backups                 List available backups
  help                         Show this help

Examples:
  $0 summary                   # Show all environments
  $0 summary 1                 # Show worktree 1 environment
  $0 update DEBUG true         # Update DEBUG in all worktrees
  $0 update API_KEY xyz true   # Update API_KEY including main env
  $0 backup                    # Create backup
  $0 restore 20250108-143022   # Restore from specific backup

The environment manager:
  • Creates isolated .env.local files for each worktree
  • Manages worktree-specific ports and configuration
  • Provides backup and restore functionality
  • Validates required environment variables
  • Supports bulk updates across all worktrees

Each worktree gets:
  • Root .env.local with all configuration
  • sms-bot/.env.local for SMS bot service
  • web/.env.local for web application
  • Unique ports and ngrok subdomain
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