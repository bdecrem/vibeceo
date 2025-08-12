#!/bin/bash

# WEBTOYS Worktree Aliases Setup
# ==============================
# Creates convenient aliases for quick worktree access

set -euo pipefail

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config.sh"

# Function to create alias script
create_alias_script() {
    local worktree_id="$1"
    local alias_name="wtaf-${worktree_id}"
    local alias_file="/usr/local/bin/$alias_name"
    
    log_info "Creating alias script: $alias_name"
    
    # Create the alias script
    cat > "$alias_file" << EOF
#!/bin/bash
# WEBTOYS Worktree $worktree_id Quick Access
# Auto-generated alias script

exec "$SCRIPT_DIR/wtaf-worktree.sh" switch "$worktree_id"
EOF
    
    chmod +x "$alias_file"
    log_success "Created executable alias: $alias_name"
}

# Function to remove alias script
remove_alias_script() {
    local worktree_id="$1"
    local alias_name="wtaf-${worktree_id}"
    local alias_file="/usr/local/bin/$alias_name"
    
    if [[ -f "$alias_file" ]]; then
        rm -f "$alias_file"
        log_success "Removed alias: $alias_name"
    fi
}

# Function to create shell aliases (for .bashrc/.zshrc)
create_shell_aliases() {
    local shell_config="$HOME/.bashrc"
    
    # Detect shell
    if [[ "$SHELL" == *"zsh"* ]] || [[ -n "${ZSH_VERSION:-}" ]]; then
        shell_config="$HOME/.zshrc"
    fi
    
    log_info "Adding shell aliases to: $shell_config"
    
    # Create alias section
    local alias_section="# WEBTOYS Worktree Aliases - Auto-generated"
    local alias_end="# End WEBTOYS Aliases"
    
    # Remove existing alias section if present
    if grep -q "$alias_section" "$shell_config" 2>/dev/null; then
        log_debug "Removing existing alias section"
        sed -i.bak "/$alias_section/,/$alias_end/d" "$shell_config"
    fi
    
    # Add new alias section
    cat >> "$shell_config" << EOF

$alias_section
# Quick access to WEBTOYS worktrees
alias wtaf-status='$SCRIPT_DIR/status.sh compact'
alias wtaf-health='$SCRIPT_DIR/health-check.sh summary'
alias wtaf-dashboard='$SCRIPT_DIR/status.sh full'

EOF
    
    # Add aliases for active worktrees
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            echo "alias wtaf-${worktree_id}='$SCRIPT_DIR/wtaf-worktree.sh switch $worktree_id'  # $branch" >> "$shell_config"
        done < "$ACTIVE_WORKTREES_FILE"
    fi
    
    echo "$alias_end" >> "$shell_config"
    
    log_success "Shell aliases added to: $shell_config"
    log_info "Run 'source $shell_config' or restart your shell to use aliases"
}

# Function to create tmux shortcuts
create_tmux_shortcuts() {
    local tmux_config="$HOME/.tmux.conf"
    
    log_info "Adding tmux shortcuts to: $tmux_config"
    
    # Create tmux section
    local tmux_section="# WEBTOYS Worktree Shortcuts - Auto-generated"
    local tmux_end="# End WEBTOYS Shortcuts"
    
    # Remove existing section if present
    if [[ -f "$tmux_config" ]] && grep -q "$tmux_section" "$tmux_config"; then
        log_debug "Removing existing tmux shortcuts"
        sed -i.bak "/$tmux_section/,/$tmux_end/d" "$tmux_config"
    fi
    
    # Add new shortcuts
    cat >> "$tmux_config" << EOF

$tmux_section
# Quick access to WEBTOYS worktree sessions
bind-key W choose-tree -s -f '#{?#{m:wtaf-*,#{session_name}},1,0}'

EOF
    
    # Add keybindings for active worktrees (Ctrl-B + 1/2/3)
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            echo "bind-key $worktree_id switch-client -t wtaf-$worktree_id  # $branch" >> "$tmux_config"
        done < "$ACTIVE_WORKTREES_FILE"
    fi
    
    echo "$tmux_end" >> "$tmux_config"
    
    log_success "Tmux shortcuts added to: $tmux_config"
    log_info "Reload tmux config: tmux source-file ~/.tmux.conf"
}

# Function to setup all aliases and shortcuts
setup_all() {
    log_info "Setting up all WEBTOYS worktree aliases and shortcuts"
    
    # Create executable aliases
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            create_alias_script "$worktree_id"
        done < "$ACTIVE_WORKTREES_FILE"
    fi
    
    # Create shell aliases
    create_shell_aliases
    
    # Create tmux shortcuts
    create_tmux_shortcuts
    
    # Create global convenience scripts
    create_convenience_scripts
    
    log_success "Alias setup completed!"
    log_info ""
    log_info "Available commands:"
    log_info "  wtaf-status       # Quick status overview"
    log_info "  wtaf-health       # Health check summary"
    log_info "  wtaf-dashboard    # Full dashboard"
    
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        log_info ""
        log_info "Worktree shortcuts:"
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            log_info "  wtaf-$worktree_id       # Switch to $branch"
        done < "$ACTIVE_WORKTREES_FILE"
    fi
    
    log_info ""
    log_info "Tmux shortcuts (after Ctrl-B):"
    log_info "  W                 # Choose WEBTOYS session"
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            log_info "  $worktree_id                 # Switch to worktree $worktree_id"
        done < "$ACTIVE_WORKTREES_FILE"
    fi
}

# Function to create global convenience scripts
create_convenience_scripts() {
    log_info "Creating global convenience scripts"
    
    # Create wtaf-status global command
    local status_script="/usr/local/bin/wtaf-status"
    cat > "$status_script" << EOF
#!/bin/bash
exec "$SCRIPT_DIR/status.sh" "\$@"
EOF
    chmod +x "$status_script"
    
    # Create wtaf-health global command
    local health_script="/usr/local/bin/wtaf-health"
    cat > "$health_script" << EOF
#!/bin/bash
exec "$SCRIPT_DIR/health-check.sh" "\$@"
EOF
    chmod +x "$health_script"
    
    # Create wtaf-dashboard global command
    local dashboard_script="/usr/local/bin/wtaf-dashboard"
    cat > "$dashboard_script" << EOF
#!/bin/bash
exec "$SCRIPT_DIR/status.sh" full
EOF
    chmod +x "$dashboard_script"
    
    # Create wtaf command (main interface)
    local main_script="/usr/local/bin/wtaf"
    cat > "$main_script" << EOF
#!/bin/bash
# WEBTOYS Main Command Interface

if [[ \$# -eq 0 ]]; then
    echo "🔧 WEBTOYS Multi-Worktree System"
    echo "==============================="
    echo ""
    echo "Quick Commands:"
    echo "  wtaf status       # Show status dashboard"
    echo "  wtaf health       # Show health check"
    echo "  wtaf start <branch>  # Start new worktree"
    echo "  wtaf stop <id>    # Stop worktree"
    echo "  wtaf switch <id>  # Switch to worktree"
    echo ""
    echo "Full command interface:"
    exec "$SCRIPT_DIR/wtaf-worktree.sh" help
else
    exec "$SCRIPT_DIR/wtaf-worktree.sh" "\$@"
fi
EOF
    chmod +x "$main_script"
    
    log_success "Created global commands: wtaf, wtaf-status, wtaf-health, wtaf-dashboard"
}

# Function to clean up aliases
cleanup_aliases() {
    log_info "Cleaning up WEBTOYS aliases and shortcuts"
    
    # Remove executable aliases
    for i in {1..3}; do
        remove_alias_script "$i"
    done
    
    # Remove shell aliases
    local shell_config="$HOME/.bashrc"
    if [[ "$SHELL" == *"zsh"* ]] || [[ -n "${ZSH_VERSION:-}" ]]; then
        shell_config="$HOME/.zshrc"
    fi
    
    if [[ -f "$shell_config" ]] && grep -q "# WEBTOYS Worktree Aliases" "$shell_config"; then
        log_debug "Removing shell aliases from: $shell_config"
        sed -i.bak '/# WEBTOYS Worktree Aliases/,/# End WEBTOYS Aliases/d' "$shell_config"
    fi
    
    # Remove tmux shortcuts
    local tmux_config="$HOME/.tmux.conf"
    if [[ -f "$tmux_config" ]] && grep -q "# WEBTOYS Worktree Shortcuts" "$tmux_config"; then
        log_debug "Removing tmux shortcuts from: $tmux_config"
        sed -i.bak '/# WEBTOYS Worktree Shortcuts/,/# End WEBTOYS Shortcuts/d' "$tmux_config"
    fi
    
    # Remove global scripts
    local global_scripts=("/usr/local/bin/wtaf-status" "/usr/local/bin/wtaf-health" "/usr/local/bin/wtaf-dashboard" "/usr/local/bin/wtaf")
    for script in "${global_scripts[@]}"; do
        if [[ -f "$script" ]]; then
            rm -f "$script"
            log_debug "Removed: $script"
        fi
    done
    
    log_success "Alias cleanup completed"
}

# Function to update aliases (called when worktrees change)
update_aliases() {
    log_info "Updating aliases for current worktrees"
    
    # Clean up old aliases
    cleanup_aliases
    
    # Set up new aliases
    setup_all
}

# Function to show current aliases
show_aliases() {
    echo "🔗 Current WEBTOYS Aliases and Shortcuts"
    echo "========================================"
    echo ""
    
    # Show global commands
    echo "Global Commands:"
    local global_commands=("wtaf" "wtaf-status" "wtaf-health" "wtaf-dashboard")
    for cmd in "${global_commands[@]}"; do
        if command -v "$cmd" >/dev/null 2>&1; then
            echo "  ✅ $cmd"
        else
            echo "  ❌ $cmd"
        fi
    done
    echo ""
    
    # Show worktree-specific aliases
    echo "Worktree Aliases:"
    if [[ -s "$ACTIVE_WORKTREES_FILE" ]]; then
        while IFS=':' read -r worktree_id branch path ports timestamp; do
            local alias_name="wtaf-$worktree_id"
            if command -v "$alias_name" >/dev/null 2>&1; then
                echo "  ✅ $alias_name -> $branch"
            else
                echo "  ❌ $alias_name -> $branch"
            fi
        done < "$ACTIVE_WORKTREES_FILE"
    else
        echo "  No active worktrees"
    fi
    echo ""
    
    # Show shell aliases
    local shell_config="$HOME/.bashrc"
    if [[ "$SHELL" == *"zsh"* ]] || [[ -n "${ZSH_VERSION:-}" ]]; then
        shell_config="$HOME/.zshrc"
    fi
    
    echo "Shell Configuration:"
    if [[ -f "$shell_config" ]] && grep -q "# WEBTOYS Worktree Aliases" "$shell_config"; then
        echo "  ✅ Aliases configured in: $shell_config"
    else
        echo "  ❌ No aliases in: $shell_config"
    fi
    
    # Show tmux configuration
    local tmux_config="$HOME/.tmux.conf"
    if [[ -f "$tmux_config" ]] && grep -q "# WEBTOYS Worktree Shortcuts" "$tmux_config"; then
        echo "  ✅ Tmux shortcuts configured in: $tmux_config"
    else
        echo "  ❌ No tmux shortcuts in: $tmux_config"
    fi
}

# Main command processing
main() {
    local command="${1:-setup}"
    
    case "$command" in
        "setup"|"install")
            setup_all
            ;;
        "cleanup"|"remove"|"uninstall")
            cleanup_aliases
            ;;
        "update"|"refresh")
            update_aliases
            ;;
        "show"|"list"|"status")
            show_aliases
            ;;
        "shell")
            create_shell_aliases
            ;;
        "tmux")
            create_tmux_shortcuts
            ;;
        "help"|"-h"|"--help")
            cat << EOF
WEBTOYS Alias Setup

Usage: $0 <command>

Commands:
  setup         Set up all aliases and shortcuts (default)
  cleanup       Remove all aliases and shortcuts
  update        Update aliases for current worktrees
  show          Show current alias status
  shell         Set up shell aliases only
  tmux          Set up tmux shortcuts only
  help          Show this help

The setup creates:
  • Global commands: wtaf, wtaf-status, wtaf-health, wtaf-dashboard
  • Worktree aliases: wtaf-1, wtaf-2, wtaf-3 (for active worktrees)
  • Shell aliases in ~/.bashrc or ~/.zshrc
  • Tmux shortcuts in ~/.tmux.conf

Examples:
  $0 setup      # Set up everything
  $0 show       # Check current status
  $0 cleanup    # Remove all aliases
  $0 update     # Refresh aliases after adding/removing worktrees
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