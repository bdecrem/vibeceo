# Cross-Machine Setup Guide

This document ensures both your MacBook Air and iMac run the SMS bot identically.

## ✅ What's Been Fixed

All hardcoded username paths have been removed from the codebase:
- `agents/arxiv-research-graph/index.ts` - Dynamic PYTHONPATH
- `webtoys-edit-agent/process-edits.js` - Dynamic HOME
- `webtoys-os/agents/edit-agent/execute-open-issue-v2.js` - Dynamic paths
- `agent-issue-tracker/execute-open-issue.js` - Dynamic paths

## 🔧 Setup Required on Each Machine

### 1. Python Environment (IDENTICAL on both machines)

**Required:**
- Python 3.13.x installed via Homebrew (NOT pyenv)
- Packages installed globally (NOT in venv)

**Installation:**
```bash
# Install Homebrew Python
brew install python@3.13

# Install required packages globally
pip3 install claude-agent-sdk==0.1.4
pip3 install neo4j==6.0.2
pip3 install openai
pip3 install supabase
pip3 install arxiv
pip3 install requests
pip3 install python-dotenv
```

**Verify:**
```bash
which python3  # Should show /opt/homebrew/opt/python@3.13/...
pip3 show claude-agent-sdk  # Should show 0.1.4
pip3 show neo4j  # Should show 6.0.2
```

### 2. Shell Environment (~/.zshrc)

**Required environment variables:**
```bash
# Neo4j credentials (required for KG agent)
export NEO4J_URI="neo4j+s://7d35811b.databases.neo4j.io"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="3LBx6Y6rjJvqkH13SkgaLKaMalamMEM7j1DZ8BQYC_0"

# Together AI API key
export TOGETHER_API_KEY=27e6f7f8d1d1638ec53464a5d39e884a0fa62d3630b93e33f9fe2f80207cd7c9

# Claude Agent SDK token
export CLAUDE_AGENT_SDK_TOKEN=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
```

**DO NOT set in shell:**
- ❌ `ANTHROPIC_API_KEY` - Goes in .env.local only
- ❌ `CLAUDE_CODE_OAUTH_TOKEN` - Breaks Claude Code auth
- ❌ `PYTHONPATH` - Set automatically by code

### 3. Local Configuration (sms-bot/.env.local)

**CRITICAL FIX - Edit this file on BOTH machines:**

Find line with `PYTHON_BIN` and change from:
```bash
PYTHON_BIN=/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/.venv/bin/python3
```

To:
```bash
# Use global Homebrew Python (works on any Mac with Homebrew Python 3.13)
PYTHON_BIN=python3
```

**Why:** The `.env.local` file is NOT in git, so each machine needs this change manually.

### 4. Pull Latest Code (iMac Only)

```bash
cd /path/to/sms-bot
git pull origin main
npm run build
```

## 🧪 Testing Cross-Machine Compatibility

Run these tests on BOTH machines - results should be identical:

### Test 1: Python Environment
```bash
python3 --version  # Should show 3.13.x
pip3 show claude-agent-sdk  # Should show 0.1.4
pip3 show neo4j  # Should show 6.0.2
echo $NEO4J_URI  # Should show Neo4j connection string
echo $CLAUDE_AGENT_SDK_TOKEN  # Should show token
```

### Test 2: Environment Variables Accessible from Python
```bash
python3 -c "import os; print('NEO4J_URI:', 'SET' if os.getenv('NEO4J_URI') else 'NOT SET')"
python3 -c "import os; print('CLAUDE_AGENT_SDK_TOKEN:', 'SET' if os.getenv('CLAUDE_AGENT_SDK_TOKEN') else 'NOT SET')"
```

### Test 3: SMS Bot Loads .env.local
```bash
cd sms-bot
node -e "require('dotenv').config({path: '.env.local'}); console.log('PYTHON_BIN:', process.env.PYTHON_BIN); console.log('Should be: python3')"
```

### Test 4: arXiv Graph Agent (Full Integration Test)
```
# Send SMS: "Arxiv-research-graph run 2025-10-31"
# Should complete without ENOENT errors
```

## 📋 Checklist for New Machine Setup

- [ ] Install Homebrew Python 3.13.x
- [ ] Install Python packages globally (no venv)
- [ ] Add environment variables to ~/.zshrc
- [ ] Edit .env.local: Change `PYTHON_BIN=python3`
- [ ] Pull latest code from GitHub
- [ ] Run `npm run build`
- [ ] Test: Run all 4 tests above
- [ ] Test: Send "Arxiv-research-graph run" SMS

## 🚨 Common Issues

### Issue: ENOENT error with /Users/bartdecrem/ path
**Cause:** `.env.local` has old hardcoded PYTHON_BIN path
**Fix:** Edit `.env.local` line 89-90, change to `PYTHON_BIN=python3`

### Issue: "claude-agent-sdk not found"
**Cause:** Packages installed in venv instead of globally
**Fix:** Install globally: `pip3 install claude-agent-sdk==0.1.4`

### Issue: "NEO4J_URI not set"
**Cause:** Shell environment variables not loaded
**Fix:** Add to ~/.zshrc and run `source ~/.zshrc`

### Issue: Different Python versions on machines
**Cause:** Using different Python installations (pyenv vs Homebrew)
**Fix:** Both machines must use Homebrew Python 3.13.x

## 📝 What Makes Machines Identical

1. **Same Python version** (Homebrew 3.13.x)
2. **Same packages** (installed globally, same versions)
3. **Same shell environment** (Neo4j, Together AI, Claude SDK token)
4. **Same .env.local settings** (PYTHON_BIN=python3, not hardcoded paths)
5. **Same code** (pulled from GitHub main branch)

## 🎯 Success Criteria

When both machines are set up correctly:
- `which python3` shows `/opt/homebrew/...` path
- Python imports work: `python3 -c "import claude_agent_sdk, neo4j"`
- Environment variables accessible from Python
- SMS bot builds without errors: `npm run build`
- arXiv command works via SMS on both machines

---

**Last Updated:** 2025-10-31
**Tested On:** MacBook Air (bart) and iMac (bartdecrem)
