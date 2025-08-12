# WEBTOYS Multi-Worktree System

A complete workflow system for managing multiple git worktrees with isolated development environments for the WEBTOYS project.

## 🎯 Overview

This system allows you to work on 2-3 different branches simultaneously, each with:
- **Isolated ports**: SMS bot, web server, and ngrok tunnel
- **Organized tmux sessions**: All services in clean, organized panes
- **Environment isolation**: Separate .env.local files per worktree
- **Health monitoring**: Real-time service status and health checks
- **Quick access**: Convenient aliases and shortcuts

## 🚀 Quick Start

### 1. Initial Setup

```bash
# Navigate to the worktree scripts directory
cd /path/to/vibeceo8/sms-bot/scripts/worktree

# Set up aliases and shortcuts (optional but recommended)
./setup-aliases.sh setup

# Start your first worktree
./wtaf-worktree.sh start feature-branch-name
```

### 2. Basic Usage

```bash
# Start a new worktree
wtaf start my-feature-branch

# Check status of all worktrees
wtaf status

# Switch to a worktree (attaches to tmux session)
wtaf switch 1
# or use the quick alias:
wtaf-1

# Stop a worktree
wtaf stop 1

# View health dashboard
wtaf-dashboard
```

## 📋 Port Allocation

Each worktree gets isolated ports:

| Worktree | SMS Bot | Web Server | Ngrok |
|----------|---------|------------|-------|
| 1        | 3030    | 3000       | 8000  |
| 2        | 3031    | 3001       | 8001  |
| 3        | 3032    | 3002       | 8002  |

## 🔧 Available Commands

### Main Commands

```bash
# Master control
./wtaf-worktree.sh <command> [options]

# Commands:
start <branch>      # Start or create worktree
stop <id>           # Stop worktree services  
status              # Show all worktrees status
switch <id>         # Switch to worktree tmux session
list                # List all worktrees
cleanup             # Remove inactive worktrees
logs <id>           # Show logs for worktree
restart <id>        # Restart worktree services
```

### Health Monitoring

```bash
# Health checks
./health-check.sh <command> [options]

# Commands:
summary             # Health summary for all worktrees
detailed <id>       # Detailed health report
monitor [interval]  # Continuous monitoring (default 10s)
heal <id>           # Auto-restart unhealthy services
```

### Status Dashboard

```bash
# Status dashboard
./status.sh [command]

# Commands:
full                # Complete dashboard (default)
compact             # Quick status summary
monitor [interval]  # Live monitoring dashboard
```

### Service Management

```bash
# Service control
./service-manager.sh <command> <worktree-id>

# Commands:
start <id>          # Start all services for worktree
stop <id>           # Stop all services for worktree
restart <id>        # Restart all services for worktree
status <id>         # Show service status for worktree
```

### Tmux Management

```bash
# Tmux session control
./tmux-manager.sh <command> [options]

# Commands:
create <id>         # Create tmux session for worktree
attach <id>         # Attach to tmux session
kill <id>           # Kill tmux session
list                # List all WEBTOYS tmux sessions
```

### Environment Management

```bash
# Environment configuration
./env-manager.sh <command> [options]

# Commands:
summary [id]        # Show environment summary
update <var> <val>  # Update environment variable
backup              # Backup all environment files
restore <date>      # Restore from backup
list-backups        # List available backups
```

## 💻 Tmux Session Layout

Each worktree gets a organized tmux session with multiple windows:

### Window 0: Main (4 panes)
```
┌─────────────────┬─────────────────┐
│   SMS Bot       │   Web Server    │
│   Port 303X     │   Port 300X     │
├─────────────────┼─────────────────┤
│  Engine Logs    │   Terminal      │
│  (tailing)      │  (development)  │
└─────────────────┴─────────────────┘
```

### Window 1: Logs
- 4 panes tailing different log files (SMS, Web, Engine, Ngrok)

### Window 2: Git
- Git operations and version control

### Window 3: Testing  
- API testing and health checks

## 🌐 Environment Configuration

Each worktree gets its own environment configuration:

- **Root**: `worktree-path/.env.local` - Main configuration
- **SMS Bot**: `worktree-path/sms-bot/.env.local` - SMS service config  
- **Web App**: `worktree-path/web/.env.local` - Web application config

Environment variables are automatically populated from the main `.env.local` with worktree-specific overrides for ports and identifiers.

## 📊 Monitoring & Health Checks

### Health Status Levels
- **HEALTHY**: All services operational
- **DEGRADED**: Services running but with issues
- **PARTIAL**: Mixed service states
- **STOPPED**: Most/all services down

### Monitoring Features
- Real-time health checks
- Service status monitoring
- Port conflict detection
- Log aggregation
- Auto-healing capabilities

## 🔗 Quick Access System

### Global Commands (after running setup-aliases.sh)
- `wtaf` - Main command interface
- `wtaf-status` - Quick status overview  
- `wtaf-health` - Health check summary
- `wtaf-dashboard` - Full dashboard

### Worktree Shortcuts
- `wtaf-1` - Switch to worktree 1
- `wtaf-2` - Switch to worktree 2  
- `wtaf-3` - Switch to worktree 3

### Tmux Shortcuts (Ctrl-B prefix)
- `W` - Choose WEBTOYS session menu
- `1/2/3` - Switch to worktree 1/2/3

## 🛠 Setup Instructions

### Prerequisites
- Git worktree support (Git 2.5+)
- tmux
- Node.js and npm
- ngrok (optional, for tunnels)

### Environment Setup

1. **Create main environment file**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your actual values
   ```

2. **Install aliases** (recommended):
   ```bash
   ./setup-aliases.sh setup
   source ~/.bashrc  # or ~/.zshrc
   ```

3. **Test the system**:
   ```bash
   wtaf start test-branch
   wtaf status
   wtaf-1  # Should switch to the worktree
   ```

### Ngrok Configuration (Optional)

For external webhook testing:

1. Sign up for ngrok account and get auth token
2. Add `NGROK_AUTH_TOKEN` to your `.env.local`
3. Each worktree gets its own ngrok subdomain automatically

## 📁 Directory Structure

```
sms-bot/scripts/worktree/
├── wtaf-worktree.sh      # Master control script
├── service-manager.sh    # Service lifecycle management
├── tmux-manager.sh       # Tmux session management
├── health-check.sh       # Health monitoring system
├── status.sh             # Status dashboard
├── env-manager.sh        # Environment management
├── setup-aliases.sh      # Alias/shortcut setup
├── config.sh             # Configuration and utilities
├── .env.worktree.template # Environment template
├── README.md             # This file
└── data/                 # Runtime data
    ├── active_worktrees  # Active worktree tracking
    ├── port_allocation   # Port allocation tracking
    └── logs/             # System logs
```

## 🔍 Troubleshooting

### Common Issues

**Port already in use**:
```bash
# Find what's using the port
lsof -ti:3030
# Kill the process
lsof -ti:3030 | xargs kill

# Or use the cleanup command
wtaf cleanup
```

**Tmux session missing**:
```bash
# Recreate the tmux session
./tmux-manager.sh create 1
```

**Environment issues**:
```bash
# Validate main environment
./env-manager.sh validate

# Recreate worktree environment
./env-manager.sh create 1 branch-name /path/to/worktree
```

**Services won't start**:
```bash
# Check detailed health
./health-check.sh detailed 1

# Try auto-healing
./health-check.sh heal 1

# Manual restart
./service-manager.sh restart 1
```

### Health Check Commands

```bash
# Monitor system health
./health-check.sh monitor

# Auto-heal issues
./health-check.sh heal 1

# Detailed health report
./health-check.sh detailed 1
```

### Log Analysis

```bash
# View worktree logs
wtaf logs 1

# Or check specific service logs
tail -f data/logs/worktree-1-sms.log
tail -f data/logs/worktree-1-web.log
tail -f data/logs/worktree-1-engine.log
```

## 🧹 Maintenance

### Regular Cleanup

```bash
# Clean up inactive worktrees
wtaf cleanup

# Remove old log files
find data/logs -name "*.log" -mtime +7 -delete

# Backup environments
./env-manager.sh backup
```

### System Monitoring

```bash
# Live status monitoring
./status.sh monitor 30

# Live health monitoring  
./health-check.sh monitor 10

# Check system resources
./status.sh resources
```

## 🔧 Configuration

### Customizing Ports

Edit `config.sh` and modify the `WORKTREE_PORTS` array:

```bash
declare -A WORKTREE_PORTS=(
    [1]="3030:3000:8000"
    [2]="3031:3001:8001" 
    [3]="3032:3002:8002"
)
```

### Customizing Tmux Layout

Modify the `create_session` function in `tmux-manager.sh` to change:
- Window layout
- Pane arrangement
- Status bar format
- Colors

### Adding Services

To add new services:
1. Update `SERVICES` array in `config.sh`
2. Add service functions to `service-manager.sh`
3. Update health checks in `health-check.sh`
4. Add tmux panes in `tmux-manager.sh`

## 📝 Tips & Best Practices

### Workflow Tips
- Use descriptive branch names (they become ngrok subdomains)
- Keep worktrees short-lived (days, not weeks)
- Use `wtaf status` regularly to monitor system health
- Clean up inactive worktrees to free resources

### Development Tips
- Each worktree maintains its own git history
- Use `wtaf switch` instead of cd to change worktrees
- Tmux sessions persist across terminal sessions
- Health monitoring catches issues before they become problems

### Performance Tips
- Limit to 2-3 active worktrees maximum
- Use `wtaf cleanup` to remove unused worktrees
- Monitor system resources with `./status.sh resources`
- Backup environments before major changes

## 🆘 Support

### Getting Help
```bash
# Command help
wtaf help
./health-check.sh help
./status.sh help

# Show current configuration
./status.sh full

# System diagnostics
./health-check.sh summary
```

### Reporting Issues
When reporting issues, include:
1. Output of `wtaf status`
2. Output of `./health-check.sh summary` 
3. Relevant log files from `data/logs/`
4. Steps to reproduce the issue

## 🚀 Advanced Usage

### Automation
```bash
# Auto-start worktree with health monitoring
wtaf start feature-branch && sleep 30 && ./health-check.sh heal 1

# Backup before major changes
./env-manager.sh backup && wtaf start experimental-feature

# Batch operations
for id in 1 2 3; do
    if ./health-check.sh $id | grep -q "HEALTHY"; then
        echo "Worktree $id is healthy"
    fi
done
```

### Integration with CI/CD
```bash
# Pre-deployment health check
./health-check.sh summary || exit 1

# Environment validation
./env-manager.sh validate || exit 1
```

---

## 📄 License

This worktree management system is part of the WEBTOYS project and follows the same license terms.

---

**Happy coding with multiple worktrees! 🚀**

For more information about the WEBTOYS project, see the main project README.