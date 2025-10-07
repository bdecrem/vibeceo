# Claude Agent SDK Setup ON Bart's iMAC
=====

**Date**: October 7, 2025
**Machine**: vibeceo8

## Final Solution

Using **ANTHROPIC_API_KEY** instead of OAuth tokens for claude-agent-sdk authentication.

## Installation Summary

### 1. Installed claude-agent-sdk in project venv
```bash
cd ~/Documents/Dropbox/coding2025/vibeceo8
source .venv/bin/activate
pip install claude-agent-sdk
```

**Note**: Uses the project-level venv at `vibeceo8/.venv`, NOT a separate `sms-bot/.venv`

### 2. Updated Configuration Files

**sms-bot/.env.local:**
```bash
# Fresh API key from console.anthropic.com (account with credits)
ANTHROPIC_API_KEY=sk-ant-api03-YOUR_KEY_HERE

# Same API key used for agent SDK
CLAUDE_AGENT_SDK_TOKEN=sk-ant-api03-YOUR_KEY_HERE

# Python from project venv
PYTHON_BIN=/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/.venv/bin/python3
```

**sms-bot/agents/crypto-research/index.ts:**
```typescript
const agentEnv = {
  ...process.env,
  ANTHROPIC_API_KEY: process.env.CLAUDE_AGENT_SDK_TOKEN || process.env.ANTHROPIC_API_KEY,
  // Remove any OAuth tokens to force API key usage
  CLAUDE_CODE_OAUTH_TOKEN: undefined,
};
```

## Why API Key Instead of OAuth Token?

**Problem**: OAuth tokens (`sk-ant-oat01-...`) from `claude setup-token` were linked to different accounts with no credits.

**Solution**: Use ANTHROPIC_API_KEY directly from Console account (the one with credits).

**How it works**:
- Claude CLI checks for: `CLAUDE_CODE_OAUTH_TOKEN` → `ANTHROPIC_API_KEY` → `~/.claude/oauth_token`
- By removing OAuth token and providing API key, agent uses the correct account

## Authentication Flow

```
Console Account ($75 credits)
    ↓
Generate API key at console.anthropic.com/settings/keys
    ↓
Store in .env.local as both ANTHROPIC_API_KEY and CLAUDE_AGENT_SDK_TOKEN
    ↓
TypeScript passes ANTHROPIC_API_KEY to Python subprocess only
    ↓
Python subprocess uses API key for claude-agent-sdk
    ↓
Your shell has NO tokens → Claude Code uses Max plan
```

## Critical: Keeping Claude Code on Max Plan

**DO NOT** set these in your shell environment:
- `CLAUDE_CODE_OAUTH_TOKEN`
- `ANTHROPIC_API_KEY` (in shell startup files like ~/.zshrc)

**ONLY** in `.env.local` - Node.js reads it, passes to Python subprocess only.

## Verification

```bash
# 1. Check shell is clean (should be empty)
echo $CLAUDE_CODE_OAUTH_TOKEN
echo $ANTHROPIC_API_KEY

# 2. Check SDK installed in project venv
source ~/Documents/Dropbox/coding2025/vibeceo8/.venv/bin/activate
python -c "import claude_agent_sdk; print('✅ Installed')"

# 3. Test with API key
source sms-bot/.env.local
export ANTHROPIC_API_KEY
python -c "import anthropic; print('✅ Can import')"
```

## Files Modified

1. `sms-bot/.env.local` - Fresh API key from Console
2. `sms-bot/agents/crypto-research/index.ts` - Uses ANTHROPIC_API_KEY
3. Project venv: `vibeceo8/.venv/` - Has claude-agent-sdk installed

## Why This Works

- **API key**: Directly from your Console account ($75 credits)
- **No OAuth confusion**: Avoids token being linked to wrong account
- **Claude Code unaffected**: No tokens in shell = Max plan works
- **Simpler**: API keys are easier to manage than OAuth tokens

## Testing

```bash
cd sms-bot
npm run build
# Restart SMS listener
# Send "crypto run" via SMS
```

## What We Tried (and Why It Failed)

1. ❌ **Old OAuth token in .env.local** - Linked to different account with no credits
2. ❌ **Running `claude setup-token`** - Generated token for wrong account
3. ❌ **Old API key** - Also from old account with no credits
4. ✅ **Fresh API key from Console** - From the correct account with credits

## Key Takeaway

**OAuth tokens from `claude setup-token` may link to different accounts than your Console account.**

Using ANTHROPIC_API_KEY directly from Console ensures you're using the right account.
