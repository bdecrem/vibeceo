# Agent Loop Setup Guide - macOS

This guide helps set up the Token Tank agent loop on a Mac.

## Prerequisites

### 1. Install Claude Code

Make sure Claude Code CLI is installed and working:

```bash
# Check if installed
claude --version

# If not found, install from https://claude.ai/download
```

### 2. Check Python Setup

**First, check how you normally run Python on this machine:**

```bash
# Check Python version and location
python3 --version
which python3

# Check if you use a virtual environment
# (Look for .venv, venv, or virtual environment activation in your workflow)
```

**Check if required packages are already installed:**

```bash
python3 -c "import supabase, dotenv, anthropic; print('✓ All packages already installed')"
```

If you see the success message, **skip to step 3** - you're good to go!

**If you get import errors, install the missing packages:**

```bash
# If you normally use a virtual environment:
source .venv/bin/activate  # or whatever your activation command is
pip install supabase python-dotenv anthropic

# If you install packages globally:
pip3 install supabase python-dotenv anthropic

# Or if you use a specific pip location:
python3 -m pip install supabase python-dotenv anthropic
```

**Note:** Install packages the same way you normally install Python packages on this machine. If you already have a workflow (e.g., `cd ~/project && source .venv/bin/activate`), use that.

### 3. Environment Setup

The script needs to find `sms-bot/.env.local` with Supabase credentials.

Make sure these variables are in `sms-bot/.env.local`:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## Running Manually

```bash
# Run a single agent
./incubator/scripts/agent-loop-v2.sh -y boss

# Run multiple agents
./incubator/scripts/agent-loop-v2.sh -y boss echo

# Run all agents (with confirmation)
./incubator/scripts/agent-loop-v2.sh --all
```

## Troubleshooting

### "claude: command not found"

**Check installation:**
```bash
which claude
ls -la ~/.local/bin/claude
ls -la /usr/local/bin/claude
ls -la /opt/homebrew/bin/claude
```

If claude is in one of those locations but not found, add it to your PATH in `~/.zshrc` or `~/.bash_profile`.

### Python import errors

**First, verify which Python is being used:**

```bash
which python3
python3 --version

# Check what packages are already installed
python3 -m pip list | grep -E "supabase|dotenv|anthropic"
```

**Then install missing packages using your normal workflow:**

```bash
# Use the same method you normally use for this project
# Examples:
python3 -m pip install supabase python-dotenv anthropic
# or
source .venv/bin/activate && pip install supabase python-dotenv anthropic
```

### Supabase connection errors

**Verify credentials:**
```bash
cd ~/path/to/kochito
python3 incubator/lib/read_agent_messages.py
```

Should show agent messages, not an error.

## Common macOS-specific Issues

1. **Homebrew location**: Apple Silicon Macs use `/opt/homebrew`, Intel Macs use `/usr/local`
2. **zsh vs bash**: macOS defaults to zsh, but script uses `#!/bin/bash` explicitly
3. **Python location**: macOS may have `python3` but not `python` command
4. **XDG variables**: Not needed on Mac (Linux-specific)

## Quick Test

```bash
# Should work on both Linux and Mac
cd ~/path/to/kochito
./incubator/scripts/agent-loop-v2.sh -y boss

# Check it found claude
# Should print: "Using claude at: /path/to/claude"
```
