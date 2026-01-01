# Incubator Scripts

Automation scripts for Token Tank agent operations.

## Agent Loop (`agent-loop.sh`)

Automatically runs Token Tank agents in sequence. Fully autonomous - no user input required during execution. Each agent loads fresh context from their files (CLAUDE.md, LOG.md, database).

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
- `-a, --all` - Run all default agents (boss, forge, nix, drift, pulse, echo)
- `-l, --list` - List available agents
- `-d, --dry-run` - Preview commands without executing

### Examples

```bash
# Daily check-in with all agents
./agent-loop.sh --all

# Run only Forge and Nix
./agent-loop.sh forge nix

# See what would happen
./agent-loop.sh --dry-run drift pulse echo
```

### How It Works

1. **Pipes commands** to Claude Code with `--dangerously-skip-permissions` (no user prompts)
2. **Monitors output** for `AGENT_SESSION_COMPLETE` marker
3. **Moves to next agent** when marker is detected
4. **Context isolation** - Each agent loads fresh state from files, no conversation bleed

### Features

- **Fully autonomous** - No user input required during execution
- **Color-coded output** - Green for success, red for errors, yellow for warnings
- **Progress tracking** - Shows `[1/5]`, `[2/5]`, etc. with duration per agent
- **Logging** - All runs logged to `agent-loop.log` with timestamps
- **Completion detection** - Agents output marker when done
- **Context isolation** - Each agent loads their own CLAUDE.md, LOG.md, and database messages

### Logs

All executions are logged to:
```
/home/whitcodes/Work/Dev/kochito/incubator/scripts/agent-loop.log
```

View recent runs:
```bash
tail -n 50 incubator/scripts/agent-loop.log
```

### Completion Markers

Each agent command (boss.md, forge.md, etc.) **must** output this marker when done:

```
========================================
AGENT_SESSION_COMPLETE
========================================
```

The script monitors for this marker to know when to move to the next agent. See `.claude/commands/boss.md` for implementation example.

### Scheduling (Optional)

Since the script is fully autonomous, it's perfect for cron jobs. Run daily at 9 AM:

```bash
# Edit crontab
crontab -e

# Add this line (no user interaction needed!)
0 9 * * * cd /home/whitcodes/Work/Dev/kochito && echo "y" | ./incubator/scripts/agent-loop.sh --all >> /tmp/agent-loop-cron.log 2>&1
```

### Available Agents

- **boss** (i0) - Manager/Operational Overseer (runs FIRST)
- **forge** (i1) - Business Builder
- **nix** (i2) - Business Builder
- **drift** (i3-2) - Trader
- **pulse** (i3-1) - Trader
- **echo** (i4) - Researcher

**Important:** boss (i0) always runs first to review team state and provide operational oversight before other agents start their work.

See `.claude/commands/` or `incubator/i*/CLAUDE.md` for agent details.

## Auto-Tweet Scripts

See existing scripts in this directory:
- `auto-tweet.ts` - Automated Token Tank Twitter posting
- `setup-auto-tweet.sh` - Configure auto-tweet service
- `com.tokentank.*.plist` - LaunchAgents for automation

### Troubleshooting

**Agent doesn't complete (hangs forever)**
- **Cause:** Agent didn't output `AGENT_SESSION_COMPLETE` marker
- **Fix:** Check agent command file (`.claude/commands/{agent}.md`) includes completion marker section
- **Debug:** Check `agent-loop.log` to see where agent stopped

**Script exits immediately**
- **Cause:** Agent failed or exited without marker
- **Fix:** Run agent manually (`/{agent} autonomous`) to see what went wrong
- **Debug:** Check agent's LOG.md for errors

**"No such file or directory" for temp file**
- **Cause:** `/tmp` not writable or script doesn't have permissions
- **Fix:** Ensure script has execute permissions: `chmod +x agent-loop.sh`

**Context bleeding between agents**
- **Issue:** Should not happen - each agent loads their own files
- **Verify:** Check that agents are reading from `incubator/iN/CLAUDE.md` not conversation history

---

**Tip:** Run `agent-loop.sh --list` to see all available agents at any time.
