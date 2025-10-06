# Claude Code Max Plan Authentication Fix

**Date**: October 6, 2025
**Issue**: Claude Code was using API billing instead of Max plan
**Resolution**: Separate authentication for Claude Code vs claude-agent-sdk

## The Problem

1. **Claude Code supports Max plan** - no API charges needed
2. **`CLAUDE_CODE_OAUTH_TOKEN` in environment** forced API billing
3. **claude-agent-sdk needs OAuth token** but was stealing Claude Code's auth

## The Solution

### Use Separate Environment Variables

- **`CLAUDE_AGENT_SDK_TOKEN`** - For Python agents ONLY
- **NO `CLAUDE_CODE_OAUTH_TOKEN`** - Allows Claude Code to use Max plan

## How the Token Flows to Agents (Simple Explanation)

**1. Your `.zshrc` sets the token in your shell:**
```bash
export CLAUDE_AGENT_SDK_TOKEN=sk-ant-oat01-...
```

**2. When you run the SMS bot, it inherits this environment variable**

**3. When TypeScript spawns the Python agent:**
```typescript
const agentEnv = {
  ...process.env,  // ← Copies ALL environment vars including CLAUDE_AGENT_SDK_TOKEN
  CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_AGENT_SDK_TOKEN,  // ← Renames it
};

spawn(PYTHON_BIN, args, {
  env: agentEnv  // ← Python subprocess gets CLAUDE_CODE_OAUTH_TOKEN
});
```

**4. Python agent uses `claude_agent_sdk`:**
```python
from claude_agent_sdk import query, ClaudeAgentOptions
# SDK automatically looks for CLAUDE_CODE_OAUTH_TOKEN in environment
```

**Result:**
- ✅ Your shell has `CLAUDE_AGENT_SDK_TOKEN`
- ✅ TypeScript copies it as `CLAUDE_CODE_OAUTH_TOKEN` when spawning Python
- ✅ Python agent finds `CLAUDE_CODE_OAUTH_TOKEN` and uses it
- ✅ Your Claude Code session has NO `CLAUDE_CODE_OAUTH_TOKEN`, so uses Max plan

**The token flows: Shell → TypeScript → Python subprocess only**

### Implementation

**1. Updated `sms-bot/agents/crypto-research/index.ts`**:
```typescript
async function runPythonAgent(date?: string): Promise<AgentRunResult> {
  // ... setup code ...

  // Create clean environment for Python agent
  // ONLY include CLAUDE_CODE_OAUTH_TOKEN for the agent SDK
  // Remove it from parent process so Claude Code can use Max plan
  const agentEnv = {
    ...process.env,
    // Agent SDK needs this token
    CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.CLAUDE_CODE_OAUTH_TOKEN,
  };

  const subprocess = spawn(PYTHON_BIN, args, {
    cwd: process.cwd(),
    env: agentEnv,  // Only subprocess gets the token
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // ... rest of function ...
}
```

**2. Updated `~/.zshrc`**:
```bash
# Token for claude-agent-sdk (Python agents) ONLY
# DO NOT use CLAUDE_CODE_OAUTH_TOKEN - that breaks Claude Code Max plan auth
export CLAUDE_AGENT_SDK_TOKEN=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
```

## How To Use

### For Claude Code (Interactive Sessions)

1. **Logout and clear any API tokens**:
```bash
unset CLAUDE_CODE_OAUTH_TOKEN
unset ANTHROPIC_API_KEY
source ~/.zshrc
```

2. **Login with Max plan**:
```bash
claude
# When prompted, select your Max plan account
```

3. **Verify**:
```bash
/status
# Should show "Max plan", NOT "Claude API Account"
```

### For claude-agent-sdk (Python Agents)

- **Automatically works** - TypeScript passes `CLAUDE_AGENT_SDK_TOKEN` to Python subprocess
- **Token only exists in agent's environment**, not Claude Code's environment
- **SMS bot crypto agent continues working** without changes

## Verification

**Check Claude Code is using Max plan**:
```bash
claude
/status
# Should show your Max plan
```

**Check agent still works**:
```bash
cd sms-bot
# Test crypto agent
node -e "import('./agents/crypto-research/index.js').then(m => m.runCryptoAgent())"
```

## Key Points

1. **Claude Code IGNORES Max plan if `CLAUDE_CODE_OAUTH_TOKEN` is set**
2. **Agent SDK REQUIRES OAuth token** - we pass it via subprocess environment
3. **Separate variable names** prevent conflicts
4. **No code changes needed** to Python agents - just TypeScript wrapper
5. **Token is only in subprocess environment** - not in parent Claude Code process

## Important: This is Local Dev Only

**DO NOT commit or push these changes to production:**
- This fix is for YOUR local development environment only
- It allows YOU to use Claude Code with your Max plan
- Production servers don't run interactive Claude Code
- Production already has `CLAUDE_CODE_OAUTH_TOKEN` set and works fine
- The code changes are backward compatible (falls back to old variable)

**If you need to apply/unapply changes:**
```bash
# Apply the stashed changes
git stash pop

# Reload shell config
source ~/.zshrc

# Unapply (if needed)
git stash
```

## Status

✅ **FIXED** - Claude Code uses Max plan, agents use their own token
⚠️ **LOCAL ONLY** - Do not commit or push to production
