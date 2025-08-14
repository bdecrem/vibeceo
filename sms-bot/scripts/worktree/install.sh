#!/bin/bash

# WEBTOYS Multi-Worktree System Installer
# =======================================
# One-command installation and setup of the complete worktree system

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../../" && pwd)"

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

log_header() {
    echo ""
    echo -e "${PURPLE}$*${NC}"
    echo "$(printf '═%.0s' {1..60})"
}

# Function to check prerequisites
check_prerequisites() {
    log_header "Checking Prerequisites"
    
    local missing_deps=()
    local all_good=true
    
    # Check Git
    if command -v git >/dev/null 2>&1; then
        local git_version=$(git --version | grep -oE '[0-9]+\.[0-9]+' | head -1)
        log_success "Git: $(git --version)"
        
        # Check git worktree support (Git 2.5+)
        if ! git worktree --help >/dev/null 2>&1; then
            log_error "Git worktree support not available (requires Git 2.5+)"
            missing_deps+=("git-worktree")
            all_good=false
        fi
    else
        log_error "Git not found"
        missing_deps+=("git")
        all_good=false
    fi
    
    # Check tmux
    if command -v tmux >/dev/null 2>&1; then
        log_success "Tmux: $(tmux -V)"
    else
        log_error "Tmux not found"
        missing_deps+=("tmux")
        all_good=false
    fi
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        log_success "Node.js: $(node --version)"
    else
        log_error "Node.js not found"
        missing_deps+=("node")
        all_good=false
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        log_success "npm: $(npm --version)"
    else
        log_error "npm not found"
        missing_deps+=("npm")
        all_good=false
    fi
    
    # Check optional dependencies
    if command -v ngrok >/dev/null 2>&1; then
        log_success "ngrok: $(ngrok version | head -1)"
    else
        log_warning "ngrok not found (optional - for external webhook testing)"
    fi
    
    if command -v lsof >/dev/null 2>&1; then
        log_success "lsof: Available"
    else
        log_warning "lsof not found (used for port checking)"
    fi
    
    # Check shell
    log_info "Shell: $SHELL"
    
    if [[ ! "$all_good" ]]; then
        echo ""
        log_error "Missing required dependencies: ${missing_deps[*]}"
        echo ""
        echo "Please install the missing dependencies:"
        echo ""
        
        # Provide installation suggestions based on OS
        if [[ "$(uname)" == "Darwin" ]]; then
            echo "On macOS with Homebrew:"
            for dep in "${missing_deps[@]}"; do
                case "$dep" in
                    "git"|"git-worktree") echo "  brew install git" ;;
                    "tmux") echo "  brew install tmux" ;;
                    "node") echo "  brew install node" ;;
                esac
            done
        elif [[ "$(uname)" == "Linux" ]]; then
            echo "On Ubuntu/Debian:"
            for dep in "${missing_deps[@]}"; do
                case "$dep" in
                    "git"|"git-worktree") echo "  sudo apt install git" ;;
                    "tmux") echo "  sudo apt install tmux" ;;
                    "node") echo "  sudo apt install nodejs npm" ;;
                esac
            done
        fi
        
        echo ""
        exit 1
    fi
    
    log_success "All prerequisites satisfied!"
}

# Function to verify project structure
verify_project_structure() {
    log_header "Verifying Project Structure"
    
    # Check main directories
    local required_dirs=(
        "$PROJECT_ROOT"
        "$PROJECT_ROOT/.git"
        "$PROJECT_ROOT/sms-bot"
        "$PROJECT_ROOT/web"
        "$PROJECT_ROOT/sms-bot/package.json"
        "$PROJECT_ROOT/web/package.json"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [[ -e "$dir" ]]; then
            log_success "Found: ${dir#$PROJECT_ROOT/}"
        else
            log_error "Missing: ${dir#$PROJECT_ROOT/}"
            return 1
        fi
    done
    
    # Check git repository
    cd "$PROJECT_ROOT"
    if git status >/dev/null 2>&1; then
        log_success "Git repository is valid"
        log_info "Current branch: $(git branch --show-current)"
    else
        log_error "Invalid git repository"
        return 1
    fi
    
    log_success "Project structure verified!"
}

# Function to check environment configuration
check_environment() {
    log_header "Checking Environment Configuration"
    
    local main_env="$PROJECT_ROOT/.env.local"
    
    if [[ ! -f "$main_env" ]]; then
        log_warning "Main .env.local not found"
        
        if [[ -f "$PROJECT_ROOT/.env.local.example" ]]; then
            log_info "Found .env.local.example"
            
            read -p "Create .env.local from example? [y/N]: " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cp "$PROJECT_ROOT/.env.local.example" "$main_env"
                log_success "Created .env.local from example"
                log_warning "Please edit $main_env with your actual values before using worktrees"
            else
                log_warning "You'll need to create .env.local manually"
            fi
        else
            log_error "No .env.local.example found either"
            return 1
        fi
    else
        log_success "Main .env.local exists"
        
        # Validate key variables
        source "$SCRIPT_DIR/config.sh"
        if "$SCRIPT_DIR/env-manager.sh" validate 2>/dev/null; then
            log_success "Environment validation passed"
        else
            log_warning "Environment validation failed - some variables may be missing"
        fi
    fi
}

# Function to create directory structure
create_directories() {
    log_header "Creating Directory Structure"
    
    source "$SCRIPT_DIR/config.sh"
    
    # Create worktree base directory
    if [[ ! -d "$WORKTREE_BASE" ]]; then
        mkdir -p "$WORKTREE_BASE"
        log_success "Created worktree base: $WORKTREE_BASE"
    else
        log_info "Worktree base already exists: $WORKTREE_BASE"
    fi
    
    # Create data directories
    mkdir -p "$WORKTREE_DATA_DIR" "$LOG_DIR"
    log_success "Created data directories"
    
    # Initialize tracking files
    touch "$PORT_ALLOCATION_FILE" "$ACTIVE_WORKTREES_FILE"
    log_success "Initialized tracking files"
}

# Function to set permissions
set_permissions() {
    log_header "Setting Permissions"
    
    # Make all scripts executable
    local scripts=(
        "wtaf-worktree.sh"
        "service-manager.sh"
        "tmux-manager.sh"
        "health-check.sh"
        "status.sh"
        "env-manager.sh"
        "setup-aliases.sh"
    )
    
    for script in "${scripts[@]}"; do
        if [[ -f "$SCRIPT_DIR/$script" ]]; then
            chmod +x "$SCRIPT_DIR/$script"
            log_success "Made executable: $script"
        else
            log_warning "Script not found: $script"
        fi
    done
}

# Function to install aliases
install_aliases() {
    log_header "Installing Aliases and Shortcuts"
    
    read -p "Install global aliases and shortcuts? [Y/n]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        if "$SCRIPT_DIR/setup-aliases.sh" setup; then
            log_success "Aliases and shortcuts installed!"
        else
            log_warning "Alias installation had issues (but system will still work)"
        fi
    else
        log_info "Skipped alias installation"
        log_info "You can install them later with: ./setup-aliases.sh setup"
    fi
}

# Function to run system test
run_system_test() {
    log_header "Running System Test"
    
    read -p "Run a quick system test? [Y/n]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        log_info "Testing system components..."
        
        # Test configuration loading
        if source "$SCRIPT_DIR/config.sh" 2>/dev/null; then
            log_success "Configuration loading: OK"
        else
            log_error "Configuration loading: FAILED"
            return 1
        fi
        
        # Test script execution
        if "$SCRIPT_DIR/status.sh" compact >/dev/null 2>&1; then
            log_success "Status script: OK"
        else
            log_error "Status script: FAILED"
        fi
        
        if "$SCRIPT_DIR/health-check.sh" summary >/dev/null 2>&1; then
            log_success "Health check script: OK"  
        else
            log_error "Health check script: FAILED"
        fi
        
        # Test tmux availability
        if tmux new-session -d -s "webtoys-test" 2>/dev/null; then
            tmux kill-session -t "webtoys-test" 2>/dev/null || true
            log_success "Tmux functionality: OK"
        else
            log_error "Tmux functionality: FAILED"
        fi
        
        log_success "System test completed!"
    else
        log_info "Skipped system test"
    fi
}

# Function to show next steps
show_next_steps() {
    log_header "Installation Complete!"
    
    echo ""
    echo "🎉 WEBTOYS Multi-Worktree System is now installed!"
    echo ""
    echo "📋 Next Steps:"
    echo ""
    echo "1. **Configure Environment** (if not done already):"
    echo "   Edit $PROJECT_ROOT/.env.local with your API keys and configuration"
    echo ""
    echo "2. **Start Your First Worktree**:"
    echo "   cd $SCRIPT_DIR"
    echo "   ./wtaf-worktree.sh start my-feature-branch"
    echo ""
    echo "3. **Check Status**:"
    echo "   ./wtaf-worktree.sh status"
    echo ""
    echo "4. **Switch to Worktree** (tmux session):"
    echo "   ./wtaf-worktree.sh switch 1"
    echo ""
    echo "🔗 **Quick Commands** (if aliases installed):"
    echo "   wtaf start <branch>     # Start new worktree"
    echo "   wtaf status             # Show status"
    echo "   wtaf-1                  # Switch to worktree 1"
    echo "   wtaf-dashboard          # Full dashboard"
    echo ""
    echo "📖 **Documentation**:"
    echo "   Read: $SCRIPT_DIR/README.md"
    echo "   Help: ./wtaf-worktree.sh help"
    echo ""
    echo "🔧 **System Info**:"
    echo "   Project Root: $PROJECT_ROOT"
    echo "   Worktree Base: $WORKTREE_BASE"
    echo "   Scripts: $SCRIPT_DIR"
    echo ""
    echo "🎯 **Port Allocation**:"
    echo "   Worktree 1: SMS=3030, Web=3000, Ngrok=8000"
    echo "   Worktree 2: SMS=3031, Web=3001, Ngrok=8001" 
    echo "   Worktree 3: SMS=3032, Web=3002, Ngrok=8002"
    echo ""
    
    # Check if main env needs configuration
    if [[ -f "$PROJECT_ROOT/.env.local" ]]; then
        if ! "$SCRIPT_DIR/env-manager.sh" validate 2>/dev/null; then
            echo "⚠️  **Important**: Configure your environment variables in .env.local before starting worktrees!"
            echo ""
        fi
    fi
    
    echo "Happy coding with multiple worktrees! 🚀"
}

# Function to handle errors
handle_error() {
    log_error "Installation failed at step: $1"
    echo ""
    echo "To retry:"
    echo "  $0"
    echo ""
    echo "For help:"
    echo "  Check the README.md"
    echo "  Review the error messages above"
    exit 1
}

# Main installation function
main() {
    echo ""
    echo -e "${CYAN}🔧 WEBTOYS Multi-Worktree System Installer${NC}"
    echo "=========================================="
    echo ""
    echo "This will install and configure the complete multi-worktree system."
    echo ""
    
    # Confirm installation
    read -p "Continue with installation? [Y/n]: " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
    
    # Run installation steps
    check_prerequisites || handle_error "Prerequisites check"
    verify_project_structure || handle_error "Project structure verification"
    check_environment || handle_error "Environment check"
    create_directories || handle_error "Directory creation"
    set_permissions || handle_error "Permission setting"
    install_aliases || handle_error "Alias installation"
    run_system_test || handle_error "System test"
    show_next_steps
}

# Handle command line arguments
case "${1:-install}" in
    "install"|"setup")
        main
        ;;
    "test")
        check_prerequisites && verify_project_structure && run_system_test
        ;;
    "check")
        check_prerequisites && verify_project_structure && check_environment
        ;;
    "help"|"-h"|"--help")
        cat << EOF
WEBTOYS Multi-Worktree System Installer

Usage: $0 [command]

Commands:
  install    Full installation (default)
  test       Run system test only
  check      Check prerequisites and configuration
  help       Show this help

The installer will:
  ✓ Check prerequisites (git, tmux, node, npm)
  ✓ Verify project structure
  ✓ Check/create environment configuration
  ✓ Create necessary directories
  ✓ Set script permissions
  ✓ Install aliases and shortcuts (optional)
  ✓ Run system test (optional)
  ✓ Show next steps

Requirements:
  • Git 2.5+ (with worktree support)
  • tmux
  • Node.js and npm
  • Proper WEBTOYS project structure

Optional:
  • ngrok (for webhook tunneling)
  • lsof (for port monitoring)
EOF
        ;;
    *)
        log_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac