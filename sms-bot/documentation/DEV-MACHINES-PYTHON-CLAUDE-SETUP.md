# Python & Claude Agent SDK Setup Guide
**Complete cross-machine development environment configuration**

This guide ensures identical Python and Claude Agent SDK setup across all development machines (iMac, MacBook Air, and future machines).

---

## Table of Contents
1. [Quick Setup Summary](#quick-setup-summary)
2. [Detailed Version Information](#detailed-version-information)
3. [Critical Authentication Requirements](#critical-authentication-requirements)
4. [Step-by-Step Setup Instructions](#step-by-step-setup-instructions)
5. [Environment Variables](#environment-variables)
6. [Verification Steps](#verification-steps)
7. [Troubleshooting](#troubleshooting)
8. [Architecture Notes](#architecture-notes)

---

## Quick Setup Summary

**Target Configuration:**
- **Python:** 3.13.x via Homebrew (NOT pyenv)
- **Installation Method:** Global packages (NO virtualenv)
- **Primary Package:** `claude-agent-sdk==0.1.4`
- **Critical Requirement:** Regular API key (NOT OAuth token)

**Current Production Machines:**
- **iMac:** Python 3.13.7 (Homebrew) ✅
- **MacBook Air:** Python 3.13.9 (Homebrew) ✅

---

## Detailed Version Information

### Python Installation

**Homebrew Python 3.13:**
```bash
# Installation
brew install python@3.13

# Binary locations
/opt/homebrew/bin/python3.13              # Direct binary
/opt/homebrew/bin/python3                 # Symlink (may exist)
/opt/homebrew/opt/python@3.13/libexec/bin/python3  # Alternate path
```

**Version differences:**
- iMac: 3.13.7 (installed earlier)
- MacBook Air: 3.13.9 (latest Homebrew version)
- Both work fine - any 3.13.x version is compatible

**Package Installation Location:**
```
/opt/homebrew/lib/python3.13/site-packages/
```

### Core Python Packages

**Required for claude-agent-sdk:**
```
claude-agent-sdk==0.1.4
neo4j==6.0.2
openai==1.86.0
supabase==2.15.3
arxiv==2.2.0
requests==2.32.3
python-dotenv==1.1.0
```

**Full dependency tree (auto-installed):**
```
anyio==4.9.0
mcp==1.19.0
httpx==0.28.1
pydantic==2.11.5
starlette==0.48.0
uvicorn==0.38.0
# ... see section 8 for complete list
```

---

## Critical Authentication Requirements

### ⚠️ CRITICAL: OAuth Token vs API Key Issue

**THE PROBLEM WE DISCOVERED:**

The `claude-agent-sdk` Python package internally spawns the `claude` CLI binary to communicate with Claude Code. This CLI **DOES NOT** accept OAuth tokens - it requires a regular API key.

**Authentication Types:**
```bash
# ❌ WRONG - OAuth token (doesn't work with SDK)
sk-ant-oat01-...

# ✅ CORRECT - Regular API key (works with SDK)
sk-ant-api03-...
```

**Error Symptoms:**
- "Fatal error in message reader"
- "Invalid API key · Fix external API key"
- Process hangs indefinitely at SDK `query()` call
- Exit code 1 with no detailed error

**Solution:**

Must export a **regular API key** as `ANTHROPIC_API_KEY` in shell config:

```bash
# In ~/.zshrc or ~/.bashrc
export ANTHROPIC_API_KEY=sk-ant-api03-[YOUR_KEY_HERE]
```

**DO NOT use:**
```bash
# ❌ This doesn't work - OAuth tokens fail with claude CLI
export CLAUDE_AGENT_SDK_TOKEN=sk-ant-oat01-...
```

---

## Step-by-Step Setup Instructions

### Step 1: Install Homebrew Python

```bash
# Install Python 3.13
brew install python@3.13

# Verify installation
/opt/homebrew/bin/python3.13 --version
# Should show: Python 3.13.x
```

### Step 2: Configure Shell PATH

**Edit `~/.zshrc` (or `~/.bashrc` for bash):**

```bash
# Ensure Homebrew Python takes priority
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:$PATH"

# Add npm global packages (for claude CLI)
export PATH="$HOME/.npm-global/bin:$PATH"
```

**If you have pyenv installed, disable it:**
```bash
# Comment out pyenv in ~/.zshrc
# export PYENV_ROOT="$HOME/.pyenv"
# command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$PATH"
# eval "$(pyenv init -)"
```

**Reload shell config:**
```bash
source ~/.zshrc
```

### Step 3: Install Python Packages Globally

```bash
# Install core packages
pip3 install claude-agent-sdk==0.1.4
pip3 install neo4j==6.0.2
pip3 install openai
pip3 install supabase
pip3 install arxiv
pip3 install requests
pip3 install python-dotenv
pip3 install Pillow

# OR install from project requirements
cd /path/to/vibeceo/sms-bot
pip3 install -r requirements.txt
```

**Verify packages installed in Homebrew location:**
```bash
pip3 show claude-agent-sdk | grep Location
# Should show: /opt/homebrew/lib/python3.13/site-packages
```

### Step 4: Configure Environment Variables

**Add to `~/.zshrc` (or `~/.bashrc`):**

```bash
# API key for claude-agent-sdk (Python agents) ONLY
# Must be a regular API key (sk-ant-api03-...), NOT an OAuth token
# OAuth tokens (sk-ant-oat01-...) don't work with the claude CLI that the SDK spawns
export ANTHROPIC_API_KEY=sk-ant-api03-[YOUR_KEY_HERE]

# Neo4j credentials (required for KG agent)
export NEO4J_URI="neo4j+s://7d35811b.databases.neo4j.io"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="[YOUR_PASSWORD_HERE]"
export NEO4J_DATABASE="neo4j"

# Together AI API key (optional, for some agents)
export TOGETHER_API_KEY=[YOUR_KEY_HERE]
```

**Reload shell:**
```bash
source ~/.zshrc
```

### Step 5: Install Claude CLI

The SDK requires the `claude` CLI binary:

```bash
# Install via npm (global)
npm install -g claude-cli

# Verify installation
which claude
# Should show: /Users/[username]/.npm-global/bin/claude

claude --version
# Should show: 2.0.x (Claude Code)
```

### Step 6: Configure TypeScript Code

**In `sms-bot/agents/arxiv-research-graph/index.ts` (or similar agent files):**

```typescript
// Force Homebrew Python to ensure consistent version across machines
const PYTHON_BIN = process.env.PYTHON_BIN || '/opt/homebrew/bin/python3.13';

// Environment variables passed to Python subprocess
const env: Record<string, string | undefined> = {
  PATH: process.env.PATH,
  HOME: process.env.HOME,
  PYTHONPATH: `/opt/homebrew/lib/python3.13/site-packages:${process.env.HOME}/Library/Python/3.13/lib/python/site-packages`,
  // MUST be a regular API key, NOT an OAuth token
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
};

// Explicitly exclude Claude Code's OAuth token
env.CLAUDE_CODE_OAUTH_TOKEN = undefined;
```

---

## Environment Variables

### Shell Environment (~/.zshrc)

**Required:**
```bash
export ANTHROPIC_API_KEY=sk-ant-api03-...     # Regular API key (NOT OAuth)
export NEO4J_URI=neo4j+s://...                # Neo4j connection string
export NEO4J_USERNAME=neo4j                    # Neo4j username
export NEO4J_PASSWORD=...                      # Neo4j password
```

**Optional:**
```bash
export NEO4J_DATABASE=neo4j                    # Default database name
export TOGETHER_API_KEY=...                    # For Together AI models
export PYTHON_BIN=/opt/homebrew/bin/python3.13 # Override Python path
```

**Automatically Set by Claude Code:**
```bash
CLAUDE_CODE_ENTRYPOINT=cli
CLAUDECODE=1
```

**DO NOT set (these cause issues):**
```bash
# ❌ OAuth token - doesn't work with SDK
export CLAUDE_AGENT_SDK_TOKEN=sk-ant-oat01-...

# ❌ Breaks Claude Code Max plan auth
export CLAUDE_CODE_OAUTH_TOKEN=...
```

### Project Environment (.env.local)

**NOT used for Python agents** - agents use shell environment only.

Project `.env.local` files are for TypeScript/Node.js code, not Python subprocesses.

---

## Verification Steps

### 1. Verify Python Setup

```bash
# Check Python version
python3 --version
# Expected: Python 3.13.x

# Check Python location
which python3
# Expected: /opt/homebrew/... (NOT ~/.pyenv/...)

# Check pip location
which pip3
# Expected: /opt/homebrew/...
```

### 2. Verify Package Installation

```bash
# Check claude-agent-sdk
pip3 show claude-agent-sdk
# Expected: Version: 0.1.4, Location: /opt/homebrew/lib/python3.13/site-packages

# Check neo4j
pip3 show neo4j
# Expected: Version: 6.0.2

# Test imports
python3 -c "import claude_agent_sdk; print('✅ SDK imported')"
python3 -c "import neo4j; print('✅ Neo4j imported')"
```

### 3. Verify Environment Variables

```bash
# Check API key is set
echo ${ANTHROPIC_API_KEY:0:15}...
# Expected: sk-ant-api03-...

# Check Neo4j credentials
echo $NEO4J_URI
# Expected: neo4j+s://...

echo $NEO4J_USERNAME
# Expected: neo4j
```

### 4. Verify Claude CLI

```bash
# Check claude is installed
which claude
# Expected: /Users/[username]/.npm-global/bin/claude (or similar)

# Check version
claude --version
# Expected: 2.0.x (Claude Code)
```

### 5. Test SDK Communication

```bash
# Create test script
cat > /tmp/test-sdk.py << 'EOF'
import os
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def test():
    options = ClaudeAgentOptions(
        permission_mode="acceptEdits",
        allowed_tools=["Read"],
    )
    async for msg in query(prompt="Print 'Hello SDK'", options=options):
        print(f"Message: {msg}")
    print("✅ SUCCESS")

asyncio.run(test())
EOF

# Run test
python3 /tmp/test-sdk.py

# Expected output:
# - SystemMessage with session info
# - AssistantMessage with response
# - ResultMessage with success
# - ✅ SUCCESS
```

**If this hangs or fails with "Invalid API key":**
- Check that `ANTHROPIC_API_KEY` is a regular key (`sk-ant-api03-...`)
- Check that `claude` CLI is in PATH
- Verify the key works with `claude --print`

---

## Troubleshooting

### Issue: "Fatal error in message reader"

**Symptoms:**
- Python subprocess exits with code 1
- Error: "Fatal error in message reader"
- Process hangs at `query()` call

**Cause:**
Using OAuth token instead of regular API key.

**Solution:**
```bash
# Check what type of key you have
echo ${ANTHROPIC_API_KEY:0:15}

# If it shows sk-ant-oat01-..., you're using an OAuth token (wrong!)
# Replace with a regular API key (sk-ant-api03-...)

# Edit ~/.zshrc and replace with regular API key
export ANTHROPIC_API_KEY=sk-ant-api03-[YOUR_KEY_HERE]

# Reload shell
source ~/.zshrc

# Restart Claude Code
```

### Issue: "Invalid API key · Fix external API key"

**Symptoms:**
- SDK starts but immediately fails
- Message: "Invalid API key · Fix external API key"

**Causes:**
1. Using OAuth token (most common)
2. API key is invalid or expired
3. API key not exported to environment

**Solution:**
```bash
# 1. Verify you have a regular API key (not OAuth)
echo ${ANTHROPIC_API_KEY:0:15}
# Should show: sk-ant-api03-...

# 2. Test the key directly with claude CLI
claude --print
# Should show account info, not error

# 3. Ensure it's exported in shell config
grep ANTHROPIC_API_KEY ~/.zshrc
# Should show: export ANTHROPIC_API_KEY=sk-ant-api03-...
```

### Issue: "ModuleNotFoundError: No module named 'claude_agent_sdk'"

**Symptoms:**
- Python can't find claude-agent-sdk
- Import fails

**Cause:**
Package not installed, or installed in wrong Python version.

**Solution:**
```bash
# Check which Python is running
which python3
# Should be: /opt/homebrew/... (NOT ~/.pyenv/...)

# Check if package is installed
pip3 list | grep claude-agent-sdk
# Should show: claude-agent-sdk 0.1.4

# If not installed
pip3 install claude-agent-sdk==0.1.4

# If installed in wrong location (pyenv), reinstall
pip3 uninstall claude-agent-sdk
pip3 install claude-agent-sdk==0.1.4
```

### Issue: Python version mismatch between machines

**Symptoms:**
- Works on iMac (3.13.7) but not MacBook Air (3.13.9)
- Or vice versa

**Solution:**
Any Python 3.13.x version works. The TypeScript code forces Homebrew Python:

```typescript
// In index.ts
const PYTHON_BIN = '/opt/homebrew/bin/python3.13';
```

This ensures consistency regardless of shell PATH configuration.

### Issue: Process hangs with no error

**Symptoms:**
- Python subprocess hangs indefinitely
- No error message
- Must kill process manually

**Causes:**
1. `claude` CLI not in PATH
2. SDK waiting for user input (shouldn't happen with `permission_mode="acceptEdits"`)
3. Network issues

**Solution:**
```bash
# 1. Verify claude is accessible
which claude
# Should return a path

# 2. Test claude runs
claude --version
# Should show version

# 3. Check PATH is passed to subprocess
# Look in index.ts for:
PATH: process.env.PATH  # Should be present in env object
```

### Issue: "command not found: timeout"

**Symptoms:**
- macOS doesn't have `timeout` command (it's a GNU coreutils utility)

**Solution:**
```bash
# Install coreutils (includes timeout)
brew install coreutils

# Use gtimeout instead
gtimeout 30 python3 script.py

# Or use background jobs with manual kill
```

---

## Architecture Notes

### Why Global Installation?

The agents run as **subprocesses from TypeScript**:

```typescript
// TypeScript spawns Python like this:
spawn(PYTHON_BIN, ['-u', scriptPath, ...args], { env })
```

This subprocess:
- Uses whatever `python3` is in PATH (or `PYTHON_BIN`)
- Does NOT activate virtualenvs automatically
- Needs packages in global site-packages

**Virtual environments don't work** because:
- No activation happens in subprocess
- TypeScript doesn't know about venv
- Global installation ensures packages are always found

### Why Force Homebrew Python Path?

**Problem:** Shell PATH can vary:
- pyenv might intercept `python3`
- System Python might be used
- Different terminal sessions might differ

**Solution:**
```typescript
const PYTHON_BIN = '/opt/homebrew/bin/python3.13';
```

This **hardcodes** the Python binary, ensuring:
- Same Python on all machines
- No PATH-related issues
- Consistent package resolution

### How SDK Communicates with Claude Code

**The claude-agent-sdk architecture:**

1. Python script calls `query()`
2. SDK spawns `claude` CLI binary as subprocess
3. `claude` CLI connects back to Claude Code session
4. Communication happens via stdio (JSON messages)
5. SDK streams responses back to Python

**Critical requirement:** The `claude` binary must:
- Be in PATH (or subprocess can't find it)
- Have valid API key via `ANTHROPIC_API_KEY`
- Have access to network (for API calls)

**This is why:**
- OAuth tokens don't work (CLI doesn't accept them)
- PATH must include `~/.npm-global/bin` or wherever `claude` is installed
- `ANTHROPIC_API_KEY` must be set in subprocess environment

### Platform-Specific Notes

**macOS Apple Silicon (M-series):**
- Homebrew prefix: `/opt/homebrew/`
- Python path: `/opt/homebrew/bin/python3.13`
- Site-packages: `/opt/homebrew/lib/python3.13/site-packages`

**macOS Intel:**
- Homebrew prefix: `/usr/local/`
- Python path: `/usr/local/bin/python3.13`
- Site-packages: `/usr/local/lib/python3.13/site-packages`

**For cross-machine compatibility:**
You can detect the architecture and adjust:
```typescript
const HOMEBREW_PREFIX = process.arch === 'arm64'
  ? '/opt/homebrew'
  : '/usr/local';
const PYTHON_BIN = `${HOMEBREW_PREFIX}/bin/python3.13`;
```

**Railway (Production):**
- Uses containerized Python (different version)
- Installs from `requirements.txt` during build
- Environment variables set via Railway dashboard
- Same code, different execution environment

---

## Complete Package List

**As of January 2025, working installation:**

```
aiohappyeyeballs==2.6.1
aiohttp==3.12.12
aiosignal==1.3.2
annotated-types==0.7.0
anyio==4.9.0
arxiv==2.2.0
attrs==25.3.0
certifi==2025.4.26
charset-normalizer==3.4.2
claude-agent-sdk==0.1.4
click==8.1.8
deprecation==2.1.0
distro==1.9.0
feedparser==6.0.12
filelock==3.18.0
frozenlist==1.7.0
fsspec==2025.5.0
gotrue==2.12.0
h11==0.16.0
h2==4.2.0
hpack==4.1.0
httpcore==1.0.9
httpx==0.28.1
httpx-sse==0.4.3
huggingface-hub==0.31.4
hyperframe==6.1.0
idna==3.10
jiter==0.10.0
jsonschema==4.25.1
jsonschema-specifications==2025.9.1
mcp==1.19.0
neo4j==6.0.2
openai==1.86.0
pydantic==2.11.5
pydantic-settings==2.11.0
python-dotenv==1.1.0
python-multipart==0.0.20
pytz==2025.2
requests==2.32.3
sniffio==1.3.1
sse-starlette==3.0.2
starlette==0.48.0
supabase==2.15.3
typing_extensions==4.13.2
uvicorn==0.38.0
```

---

## Quick Reference Commands

**Setup new machine:**
```bash
# 1. Install Homebrew Python
brew install python@3.13

# 2. Install packages
pip3 install claude-agent-sdk==0.1.4 neo4j==6.0.2 openai supabase arxiv requests python-dotenv Pillow

# 3. Configure environment (edit ~/.zshrc)
export ANTHROPIC_API_KEY=sk-ant-api03-[KEY]
export NEO4J_URI=neo4j+s://[URI]
export NEO4J_USERNAME=neo4j
export NEO4J_PASSWORD=[PASSWORD]

# 4. Reload shell
source ~/.zshrc

# 5. Verify
python3 --version && which python3 && pip3 show claude-agent-sdk
```

**Test SDK:**
```bash
python3 -c "import asyncio; from claude_agent_sdk import query, ClaudeAgentOptions; asyncio.run((lambda: [msg async for msg in query(prompt='Test', options=ClaudeAgentOptions(permission_mode='acceptEdits'))])())"
```

**Common checks:**
```bash
# Which Python?
which python3

# Correct API key type?
echo ${ANTHROPIC_API_KEY:0:15}  # Should be sk-ant-api03-...

# Claude CLI available?
which claude && claude --version

# Packages installed?
pip3 list | grep -E "(claude-agent-sdk|neo4j)"
```

---

## Change Log

**2025-10-31:**
- Discovered OAuth token vs API key issue
- Updated environment configuration to use regular API key
- Hardcoded Python path to `/opt/homebrew/bin/python3.13`
- Documented complete setup process for cross-machine consistency

**2025-10-24:**
- Initial setup on iMac with Python 3.13.7
- Installed claude-agent-sdk 0.1.4

---

## Related Documentation

- See `sms-bot/documentation/AGENT-PIPELINE.md` for agent architecture
- See `sms-bot/documentation/CLAUDE.md` for project rules and architecture
- See `.env.example` for project-level environment variables
