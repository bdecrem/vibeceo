# Claude Agent SDK OAuth Token Troubleshooting Guide

**For the other machine experiencing "OAuth token out of balance" errors**

## Our Working Setup on This Machine

### Environment Configuration

We have **TWO** locations where the OAuth token is configured:

#### 1. **`.env.local` file** (Primary for SMS bot)
```bash
CLAUDE_CODE_OAUTH_TOKEN=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
```
- Location: `/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/.env.local`
- **This is loaded by Node.js** when the SMS bot starts (via dotenv)
- This token gets passed to Python subprocesses via `process.env`

#### 2. **Shell environment** (For Claude Code CLI sessions)
```bash
# In ~/.zshrc:
export CLAUDE_AGENT_SDK_TOKEN=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
```
- **Note**: Different variable name to prevent Claude Code from billing API instead of using Max plan
- This is only for shell sessions, NOT used by the running SMS bot

#### 3. **Claude CLI OAuth token file** (Automatic)
```bash
~/.claude/oauth_token
# Contains: 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
```
- **Different token** - This is for interactive Claude Code CLI sessions
- Created automatically when you run `claude` and log in

### How Our Python Agents Get the OAuth Token

**Flow for TypeScript → Python agents:**

```
1. SMS bot starts → loads .env.local
   ↓
2. CLAUDE_CODE_OAUTH_TOKEN is now in process.env
   ↓
3. TypeScript spawns Python subprocess with:
   spawn(PYTHON_BIN, args, {
     env: process.env  // ← Passes ALL env vars including CLAUDE_CODE_OAUTH_TOKEN
   })
   ↓
4. Python agent imports claude_agent_sdk
   ↓
5. SDK automatically looks for CLAUDE_CODE_OAUTH_TOKEN in environment
   ↓
6. Agent runs successfully ✅
```

**Example from our code** (`agents/youtube-search/index.ts`):
```typescript
const subprocess = spawn(PYTHON_BIN, args, {
  cwd: process.cwd(),
  env: process.env,  // ← Simple - just pass everything through
  stdio: ['ignore', 'pipe', 'pipe'],
});
```

### Python Environment Setup

```bash
# Python version
python3.11 --version
# Output: Python 3.11.13

# Installed package
python3.11 -m pip list | grep claude
# Output: claude-agent-sdk 0.1.0

# Location
which python3.11
# Output: /opt/homebrew/bin/python3.11
```

---

## Troubleshooting Steps for Other Machine

### Step 1: Check Token File Exists

```bash
# Check if OAuth token file exists
ls -la ~/.claude/oauth_token

# Read the token
cat ~/.claude/oauth_token

# Expected: Should show a token starting with sk-ant-oat01-
```

**If missing:** Run `claude` and log in with your Anthropic account.

### Step 2: Verify Token in Environment

```bash
# Check .env.local file
cd /path/to/sms-bot
cat .env.local | grep CLAUDE

# Should show:
# CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...
```

**If missing:** Add it to `.env.local`:
```bash
echo "CLAUDE_CODE_OAUTH_TOKEN=$(cat ~/.claude/oauth_token)" >> .env.local
```

### Step 3: Verify Python Can Access Token

```bash
# Load .env.local and check
cd /path/to/sms-bot

# Test what Python subprocess will see
node -e "
require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');
const sub = spawn('python3.11', ['-c', 'import os; print(os.getenv(\"CLAUDE_CODE_OAUTH_TOKEN\", \"NOT SET\"))'], {
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe']
});
sub.stdout.on('data', d => console.log('Token available:', d.toString().trim()));
sub.stderr.on('data', d => console.error(d.toString()));
"
```

**Expected output:** Should print the token (or at least confirm it's set).

### Step 4: Check Python SDK Installation

```bash
# Verify Python version (must be 3.10+)
python3.11 --version

# Check if claude-agent-sdk is installed
python3.11 -m pip list | grep claude

# Expected output:
# claude-agent-sdk          0.1.0 (or similar)
```

**If not installed:**
```bash
python3.11 -m pip install claude-agent-sdk
```

### Step 5: Test Agent Directly

Create a test script to verify the agent SDK works:

```bash
cat > /tmp/test_agent.py << 'EOF'
#!/usr/bin/env python3.11
import os
import sys

# Check if token is available
token = os.getenv('CLAUDE_CODE_OAUTH_TOKEN')
if not token:
    print("ERROR: CLAUDE_CODE_OAUTH_TOKEN not set", file=sys.stderr)
    sys.exit(1)

print(f"✅ Token found: {token[:20]}...", file=sys.stderr)

# Try importing SDK
try:
    from claude_agent_sdk import query, ClaudeAgentOptions
    print("✅ claude_agent_sdk imported successfully", file=sys.stderr)
except ImportError as e:
    print(f"❌ Failed to import claude_agent_sdk: {e}", file=sys.stderr)
    sys.exit(1)

# Try a simple query
import asyncio

async def test_query():
    try:
        options = ClaudeAgentOptions(permission_mode='acceptEdits')
        async for msg in query(prompt="Say 'test successful'", options=options):
            if hasattr(msg, 'text'):
                print(f"Agent response: {msg.text}", file=sys.stderr)
        print("✅ Agent query succeeded", file=sys.stderr)
    except Exception as e:
        print(f"❌ Agent query failed: {e}", file=sys.stderr)
        sys.exit(1)

asyncio.run(test_query())
print("SUCCESS")
EOF

chmod +x /tmp/test_agent.py

# Run the test (must set token in environment)
CLAUDE_CODE_OAUTH_TOKEN=$(cat ~/.claude/oauth_token) python3.11 /tmp/test_agent.py
```

### Step 6: Common Issues and Fixes

#### Issue: "OAuth token out of balance"

This usually means:
1. **Token is expired** - Log in again with `claude` CLI
2. **Token format is wrong** - Should start with `sk-ant-oat01-`
3. **Token has extra whitespace** - Check for trailing newlines/spaces
4. **Wrong token type** - Must be OAuth token, not API key (which starts with `sk-ant-api03-`)

**Fix:**
```bash
# Get fresh token
claude logout
claude  # Log back in

# Verify token format
cat ~/.claude/oauth_token | head -c 50
# Should show: sk-ant-oat01-...

# Update .env.local with fresh token
cd /path/to/sms-bot
# Remove old token line
grep -v "CLAUDE_CODE_OAUTH_TOKEN" .env.local > .env.local.tmp
mv .env.local.tmp .env.local
# Add fresh token
echo "CLAUDE_CODE_OAUTH_TOKEN=$(cat ~/.claude/oauth_token)" >> .env.local
```

#### Issue: Token in .env.local is different from ~/.claude/oauth_token

**They can be different!** On our machine:
- `.env.local` has: `sk-ant-oat01-g1Wgrx...` (used by SMS bot agents)
- `~/.claude/oauth_token` has: `sk-ant-oat01-d3fXYb...` (used by Claude Code CLI)

Both are valid OAuth tokens. The important thing is that `.env.local` has a **valid** OAuth token.

#### Issue: Python can't find claude_agent_sdk

```bash
# Check which Python is being used
which python3.11

# Install in correct Python
/opt/homebrew/bin/python3.11 -m pip install claude-agent-sdk

# Or if using system Python
/usr/local/bin/python3.11 -m pip install claude-agent-sdk
```

**Update `.env.local` to specify Python binary:**
```bash
PYTHON_BIN=/opt/homebrew/bin/python3.11
```

#### Issue: TypeScript agent not passing environment

Check that the spawn call includes `env: process.env`:

```typescript
// CORRECT ✅
const subprocess = spawn(PYTHON_BIN, args, {
  cwd: process.cwd(),
  env: process.env,  // ← Must include this!
  stdio: ['ignore', 'pipe', 'pipe'],
});

// WRONG ❌
const subprocess = spawn(PYTHON_BIN, args, {
  cwd: process.cwd(),
  // Missing env means subprocess gets minimal environment
});
```

### Step 7: Verify End-to-End

Test the ticketmaster agent specifically:

```bash
cd /path/to/sms-bot

# Load environment and test
node -e "
require('dotenv').config({ path: '.env.local' });
console.log('CLAUDE_CODE_OAUTH_TOKEN:', process.env.CLAUDE_CODE_OAUTH_TOKEN ? 'SET' : 'NOT SET');
console.log('TICKETMASTER_API_KEY:', process.env.TICKETMASTER_API_KEY ? 'SET' : 'NOT SET');
"
```

Then rebuild and test:
```bash
npm run build

# Start the SMS bot and watch logs when someone texts "EVENTS Oakland"
npm start
```

---

## Summary of Our Working Configuration

**Key files on this machine:**

1. **`sms-bot/.env.local`**:
   ```bash
   CLAUDE_CODE_OAUTH_TOKEN=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
   TICKETMASTER_API_KEY=QmjFlJxt1PIrVCpyb8JKq9ZBSW5MaLgu
   ANTHROPIC_API_KEY=sk-ant-api03-...
   ```

2. **`~/.zshrc`** (shell config):
   ```bash
   export CLAUDE_AGENT_SDK_TOKEN=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
   ```

3. **Python**: 3.11.13 at `/opt/homebrew/bin/python3.11`

4. **Python packages**:
   ```
   claude-agent-sdk==0.1.0
   ```

5. **TypeScript packages** (`sms-bot/package.json`):
   ```json
   {
     "dependencies": {
       "@anthropic-ai/claude-agent-sdk": "^0.1.9"
     }
   }
   ```

**The token flow:**
```
.env.local (Node loads this)
    ↓
process.env.CLAUDE_CODE_OAUTH_TOKEN
    ↓
spawn(python, {env: process.env})
    ↓
Python subprocess inherits CLAUDE_CODE_OAUTH_TOKEN
    ↓
claude_agent_sdk automatically finds and uses it
    ↓
✅ Agent works
```

---

## Quick Diagnostic Script

Run this on the other machine to check everything:

```bash
#!/bin/bash
echo "🔍 Claude Agent SDK Diagnostic"
echo "================================"
echo ""

echo "1. Checking OAuth token file..."
if [ -f ~/.claude/oauth_token ]; then
  TOKEN=$(cat ~/.claude/oauth_token)
  echo "   ✅ Token file exists: ${TOKEN:0:20}..."
else
  echo "   ❌ Token file NOT found at ~/.claude/oauth_token"
  echo "   → Run 'claude' and log in"
fi
echo ""

echo "2. Checking .env.local..."
if [ -f .env.local ]; then
  if grep -q "CLAUDE_CODE_OAUTH_TOKEN" .env.local; then
    echo "   ✅ CLAUDE_CODE_OAUTH_TOKEN found in .env.local"
  else
    echo "   ❌ CLAUDE_CODE_OAUTH_TOKEN NOT in .env.local"
    echo "   → Add: CLAUDE_CODE_OAUTH_TOKEN=$(cat ~/.claude/oauth_token)"
  fi
else
  echo "   ❌ .env.local file NOT found"
  echo "   → Create .env.local with CLAUDE_CODE_OAUTH_TOKEN"
fi
echo ""

echo "3. Checking Python..."
PYTHON_BIN=${PYTHON_BIN:-python3.11}
if command -v $PYTHON_BIN &> /dev/null; then
  VERSION=$($PYTHON_BIN --version)
  echo "   ✅ $PYTHON_BIN found: $VERSION"
else
  echo "   ❌ $PYTHON_BIN NOT found"
  echo "   → Install Python 3.11+"
fi
echo ""

echo "4. Checking claude-agent-sdk..."
if $PYTHON_BIN -m pip list | grep -q claude-agent-sdk; then
  SDK_VERSION=$($PYTHON_BIN -m pip list | grep claude-agent-sdk)
  echo "   ✅ $SDK_VERSION"
else
  echo "   ❌ claude-agent-sdk NOT installed"
  echo "   → Run: $PYTHON_BIN -m pip install claude-agent-sdk"
fi
echo ""

echo "5. Testing Python subprocess environment..."
node -e "
require('dotenv').config({ path: '.env.local' });
const { spawn } = require('child_process');
const sub = spawn('$PYTHON_BIN', ['-c', 'import os; print(os.getenv(\"CLAUDE_CODE_OAUTH_TOKEN\", \"NOT_SET\"))'], {
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe']
});
sub.stdout.on('data', d => {
  const val = d.toString().trim();
  if (val === 'NOT_SET') {
    console.log('   ❌ Token NOT available to Python subprocess');
    console.log('   → Check .env.local has CLAUDE_CODE_OAUTH_TOKEN');
  } else {
    console.log('   ✅ Token available to subprocess:', val.substring(0, 20) + '...');
  }
});
sub.stderr.on('data', d => console.error('   Error:', d.toString()));
"
echo ""

echo "================================"
echo "Diagnostic complete!"
```

Save this as `diagnostic.sh` and run:
```bash
chmod +x diagnostic.sh
./diagnostic.sh
```
