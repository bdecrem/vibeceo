# Incubator Scripts

Automation scripts for Token Tank agent operations.

## Agent Loop (`agent-loop.sh`)

Automatically runs Token Tank agents in sequence with `/clear` between each agent. Perfect for daily check-ins or batch operations.

### Quick Start

```bash
# Run all agents
./incubator/scripts/agent-loop.sh --all

# Run specific agents
./incubator/scripts/agent-loop.sh forge nix drift

# Preview what would run (dry run)
./incubator/scripts/agent-loop.sh --dry-run --all
```

### Usage

```bash
./agent-loop.sh [OPTIONS] [agent1 agent2 ...]
```

**Options:**
- `-h, --help` - Show help message
- `-a, --all` - Run all default agents (forge, nix, drift, pulse, echo)
- `-l, --list` - List available agents
- `-n, --no-clear` - Skip `/clear` between agents (not recommended)
- `-d, --dry-run` - Preview commands without executing

### Examples

```bash
# Daily check-in with all agents
./agent-loop.sh --all

# Run only Forge and Nix
./agent-loop.sh forge nix

# Run without clearing context (risky - agents see each other's work)
./agent-loop.sh --no-clear --all

# See what would happen
./agent-loop.sh --dry-run drift pulse echo
```

### Features

- **Color-coded output** - Green for success, red for errors, yellow for warnings
- **Progress tracking** - Shows `[1/5]`, `[2/5]`, etc.
- **Logging** - All runs logged to `agent-loop.log` with timestamps
- **Error handling** - Prompts to continue if an agent fails
- **Timing** - Reports total execution time
- **Context clearing** - Automatically runs `/clear` between agents

### Logs

All executions are logged to:
```
/home/whitcodes/Work/Dev/kochito/incubator/scripts/agent-loop.log
```

View recent runs:
```bash
tail -n 50 incubator/scripts/agent-loop.log
```

### Scheduling (Optional)

Run daily at 9 AM via cron:

```bash
# Edit crontab
crontab -e

# Add this line
0 9 * * * cd /home/whitcodes/Work/Dev/kochito && ./incubator/scripts/agent-loop.sh --all >> /tmp/agent-loop-cron.log 2>&1
```

### Available Agents

- **forge** (i1) - CTO persona
- **nix** (i2) - Full-stack developer persona
- **drift** (i3-2) - Growth hacker persona
- **pulse** (i3-1) - Original i3 persona
- **echo** (i4) - Customer support persona

See `.claude/commands/` or `sms-bot/documentation/subagents/` for agent details.

## Auto-Tweet Scripts

See existing scripts in this directory:
- `auto-tweet.ts` - Automated Token Tank Twitter posting
- `setup-auto-tweet.sh` - Configure auto-tweet service
- `com.tokentank.*.plist` - LaunchAgents for automation

---

**Tip:** Run `agent-loop.sh --list` to see all available agents at any time.
