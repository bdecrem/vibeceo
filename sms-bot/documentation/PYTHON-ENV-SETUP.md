# Python Environment Setup Documentation
## For vibeceo8 Project - iMac Configuration

This document describes the complete Python and environment setup on the working iMac so it can be replicated on other development machines.

---

## System Overview

**Operating System:** macOS (Darwin 25.0.0)
**Project Root:** `/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/`

---

## 1. Python Installation

### Base Python (via Homebrew)
```bash
# Python is installed via Homebrew
brew install python@3.13

# Locations after installation:
which python3          # /opt/homebrew/bin/python3
python3 --version      # Python 3.13.7
which pip3             # /opt/homebrew/bin/pip3
```

**Important:** The system uses Python 3.13.7 installed via Homebrew at `/opt/homebrew/bin/python3`

---

## 2. Virtual Environment Setup

### Location and Structure
```bash
# Virtual environment is at project root
cd ~/Documents/Dropbox/coding2025/vibeceo8/
ls -la .venv/

# Structure:
.venv/
├── bin/              # Contains python, pip, activate scripts
├── include/          # C headers for compilation
├── lib/              # Python packages
├── .gitignore        # Prevents committing venv
└── pyvenv.cfg        # Virtual environment configuration
```

### Virtual Environment Configuration
The `.venv/pyvenv.cfg` file contains:
```ini
home = /opt/homebrew/opt/python@3.13/bin
include-system-site-packages = false
version = 3.13.3
executable = /opt/homebrew/Cellar/python@3.13/3.13.3_1/Frameworks/Python.framework/Versions/3.13/bin/python3.13
command = /opt/homebrew/opt/python@3.13/bin/python3.13 -m venv /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/.venv
```

### How to Recreate Virtual Environment

**Option 1: Create New (if .venv doesn't exist)**
```bash
cd ~/Documents/Dropbox/coding2025/vibeceo8/
python3 -m venv .venv
```

**Option 2: Use Existing (if .venv exists via Dropbox sync)**
```bash
cd ~/Documents/Dropbox/coding2025/vibeceo8/
source .venv/bin/activate

# Verify it's working
which python          # Should show: /path/to/vibeceo8/.venv/bin/python
python --version      # Should show: Python 3.13.7
```

---

## 3. Python Package Installation

### Critical Packages Installed in .venv
```bash
# After activating venv:
cd ~/Documents/Dropbox/coding2025/vibeceo8/
source .venv/bin/activate

# Key packages:
pip list | grep -E "(claude|anthropic|arxiv|neo4j)"
# anthropic                 0.68.1
# arxiv                     2.2.0
# claude-agent-sdk          0.1.1
# neo4j                     6.0.2
```

### Installation Process (How We Got Here)

**Install all requirements files:**
```bash
cd ~/Documents/Dropbox/coding2025/vibeceo8/
source .venv/bin/activate

# Install from all requirements.txt files:
pip install -r sms-bot/requirements.txt
pip install -r sms-bot/agents/arxiv-research/requirements.txt
pip install -r sms-bot/agents/arxiv-research-graph/requirements.txt
pip install -r sms-bot/agents/kg-query/requirements.txt
```

### Requirements Files Content

**sms-bot/agents/arxiv-research-graph/requirements.txt:**
```
# arXiv API client (official Python wrapper)
arxiv>=2.1.0

# Claude Agent SDK for autonomous paper curation
claude-agent-sdk>=0.1.0

# Neo4j Python driver for graph database connectivity
neo4j>=5.18.0
```

**sms-bot/agents/kg-query/requirements.txt:**
```
claude-agent-sdk>=0.1.0
neo4j>=5.14.0
```

---

## 4. Environment Variables Setup

### Critical Distinction: Shell vs .env Files

**Python scripts access environment variables from the SHELL, not from .env files.**

Python scripts use `os.getenv()` which reads from the shell's environment, NOT from .env files (those are for Node.js/TypeScript).

### Shell Configuration (~/.zshrc)

Environment variables are set in `~/.zshrc`:
```bash
# Neo4j Aura Database Connection
export NEO4J_URI="neo4j+s://7d35811b.databases.neo4j.io"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="3LBx6Y6rjJvqkH13SkgaLKaMalamMEM7j1DZ8BQYC_0"
export NEO4J_DATABASE="neo4j"  # Optional, defaults to "neo4j"

# Anthropic API (for Claude Agent SDK)
# Note: There are multiple ANTHROPIC_API_KEY entries in .zshrc
# The one that's currently active/working should be uncommented
export ANTHROPIC_API_KEY="sk-ant-api03-[YOUR_KEY_HERE]"

# Claude Code OAuth Token (for claude-agent-sdk)
export CLAUDE_CODE_OAUTH_TOKEN="[YOUR_TOKEN_HERE]"
```

**To apply changes:**
```bash
source ~/.zshrc

# Verify they're loaded:
echo $NEO4J_URI
echo $ANTHROPIC_API_KEY
```

### Verification Script
```bash
# Check that shell has environment variables:
cd ~/Documents/Dropbox/coding2025/vibeceo8/
source .venv/bin/activate

python3 -c "
import os
print('NEO4J_URI:', os.getenv('NEO4J_URI'))
print('NEO4J_USERNAME:', os.getenv('NEO4J_USERNAME'))
print('ANTHROPIC_API_KEY:', 'SET' if os.getenv('ANTHROPIC_API_KEY') else 'NOT SET')
"
```

### .env.local Files (For Node.js/TypeScript ONLY)

There are TWO .env.local files - these are for TypeScript/Node.js, NOT Python:

1. **Project root:** `~/Documents/Dropbox/coding2025/vibeceo8/.env.local`
2. **SMS bot:** `~/Documents/Dropbox/coding2025/vibeceo8/sms-bot/.env.local`

**Python scripts do NOT read these files.** They contain:
- Supabase credentials
- OpenAI API keys
- Twilio configuration
- Discord webhooks
- etc.

Only TypeScript code (via `dotenv` package) reads these files.

---

## 5. Running Python Scripts

### Standard Workflow

**Every time you run Python scripts, use this pattern:**
```bash
# 1. Navigate to project root
cd ~/Documents/Dropbox/coding2025/vibeceo8/

# 2. Activate virtual environment
source .venv/bin/activate

# 3. Run the script
python3 sms-bot/agents/arxiv-research-graph/load_recent_papers.py --days 7

# Or for fuzzy matching:
python3 sms-bot/agents/arxiv-research-graph/kochi_fuzzy_match_v2.py --date 2025-10-29
```

### User's Workflow Quote
From the user:
> "i run python like this:
> cd ~/Documents/Dropbox/coding2025/vibeceo8/
> source .venv/bin/activate
> python scripts/monitor.py"

### Background Process Example
```bash
# Running in background (as seen in system):
cd ~/Documents/Dropbox/coding2025/vibeceo8/ && \
source .venv/bin/activate && \
python3 sms-bot/agents/arxiv-research-graph/kochi_fuzzy_match_v2.py --date 2025-10-29
```

---

## 6. Node.js Setup (For Context)

While this is primarily about Python, the project also uses Node.js:

```bash
node --version   # v24.8.0
npm --version    # 11.6.0

# Installed via Homebrew:
brew list | grep node
# node
```

---

## 7. Troubleshooting Common Issues

### Issue 1: "ModuleNotFoundError: No module named 'neo4j'"
**Solution:**
```bash
cd ~/Documents/Dropbox/coding2025/vibeceo8/
source .venv/bin/activate
pip install -r sms-bot/agents/arxiv-research-graph/requirements.txt
```

### Issue 2: "Missing required environment variable: NEO4J_URI"
**Solution:**
```bash
# Check if variable is set:
echo $NEO4J_URI

# If empty, add to ~/.zshrc:
export NEO4J_URI="neo4j+s://7d35811b.databases.neo4j.io"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="[YOUR_PASSWORD]"

# Then reload:
source ~/.zshrc
```

### Issue 3: Virtual environment not activating
**Solution:**
```bash
# If .venv doesn't exist:
cd ~/Documents/Dropbox/coding2025/vibeceo8/
python3 -m venv .venv

# If it exists but activation fails:
source .venv/bin/activate

# Verify:
which python  # Should show path inside .venv
```

### Issue 4: Claude Agent SDK authentication issues
**Solution:**
```bash
# Check OAuth token is set:
echo $CLAUDE_CODE_OAUTH_TOKEN

# If not set, add to ~/.zshrc:
export CLAUDE_CODE_OAUTH_TOKEN="[YOUR_TOKEN]"

# Reload:
source ~/.zshrc
```

---

## 8. Complete Setup Checklist for New Machine

Use this checklist to set up a new development machine:

### Step 1: Install Homebrew (if not installed)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### Step 2: Install Python via Homebrew
```bash
brew install python@3.13
```

### Step 3: Clone/Sync Project
```bash
# If using Dropbox (as on iMac):
# Wait for Dropbox to sync ~/Documents/Dropbox/coding2025/vibeceo8/

# Or clone from git:
git clone [REPO_URL] ~/Documents/Dropbox/coding2025/vibeceo8/
```

### Step 4: Create Virtual Environment
```bash
cd ~/Documents/Dropbox/coding2025/vibeceo8/
python3 -m venv .venv
```

### Step 5: Activate and Install Packages
```bash
source .venv/bin/activate
pip install -r sms-bot/requirements.txt
pip install -r sms-bot/agents/arxiv-research/requirements.txt
pip install -r sms-bot/agents/arxiv-research-graph/requirements.txt
pip install -r sms-bot/agents/kg-query/requirements.txt
```

### Step 6: Configure Environment Variables
```bash
# Edit ~/.zshrc:
nano ~/.zshrc

# Add these lines (get actual values from secure storage):
export NEO4J_URI="neo4j+s://7d35811b.databases.neo4j.io"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="[GET_FROM_SECURE_STORAGE]"
export ANTHROPIC_API_KEY="sk-ant-api03-[GET_FROM_SECURE_STORAGE]"
export CLAUDE_CODE_OAUTH_TOKEN="[GET_FROM_SECURE_STORAGE]"

# Save and reload:
source ~/.zshrc
```

### Step 7: Verify Setup
```bash
cd ~/Documents/Dropbox/coding2025/vibeceo8/
source .venv/bin/activate

# Test Python packages:
python3 -c "import neo4j, anthropic, arxiv; print('All packages imported successfully')"

# Test environment variables:
python3 -c "import os; print('NEO4J_URI:', os.getenv('NEO4J_URI'))"
```

### Step 8: Test with Actual Script
```bash
# Try a dry run of paper loading:
python3 sms-bot/agents/arxiv-research-graph/load_recent_papers.py --days 1 --dry-run
```

---

## 9. Key Files Reference

**Python Virtual Environment:**
- `~/Documents/Dropbox/coding2025/vibeceo8/.venv/` - Virtual environment directory

**Requirements Files:**
- `sms-bot/requirements.txt` - Base Python requirements
- `sms-bot/agents/arxiv-research/requirements.txt` - arXiv research agent
- `sms-bot/agents/arxiv-research-graph/requirements.txt` - Graph-based arXiv agent
- `sms-bot/agents/kg-query/requirements.txt` - Knowledge graph query agent

**Environment Configuration:**
- `~/.zshrc` - Shell environment variables (Python scripts read from here)
- `.env.local` - Node.js/TypeScript environment (Python does NOT read this)
- `sms-bot/.env.local` - SMS bot TypeScript environment (Python does NOT read this)

**Python Scripts:**
- `sms-bot/agents/arxiv-research-graph/load_recent_papers.py` - Load papers into Neo4j
- `sms-bot/agents/arxiv-research-graph/kochi_fuzzy_match_v2.py` - Fuzzy match authors
- `sms-bot/agents/kg-query/` - Knowledge graph query agent

---

## 10. Important Notes

1. **Python scripts read from shell environment (`os.getenv()`), NOT from .env files**
2. **.env.local files are for TypeScript/Node.js code only**
3. **Always activate .venv before running Python scripts**
4. **Environment variables must be in ~/.zshrc (or ~/.bashrc)**
5. **Virtual environment is gitignored - create fresh on new machines**
6. **Dropbox syncs code but NOT the .venv directory properly - recreate it**

---

## Summary Command Cheat Sheet

```bash
# Activate environment and run script (standard workflow):
cd ~/Documents/Dropbox/coding2025/vibeceo8/ && \
source .venv/bin/activate && \
python3 [SCRIPT_PATH]

# Check Python version:
python3 --version

# Check installed packages:
pip list

# Install all requirements:
cd ~/Documents/Dropbox/coding2025/vibeceo8/
source .venv/bin/activate
pip install -r sms-bot/agents/arxiv-research-graph/requirements.txt

# Verify environment variables:
echo $NEO4J_URI
echo $ANTHROPIC_API_KEY

# Reload shell configuration:
source ~/.zshrc
```

---

**Created:** October 29, 2025
**Machine:** iMac (working setup)
**Purpose:** Replicate setup on other development machines
