# Claude CLI Subprocess Authentication Fix

## Problem: Claude CLI Fails in Node.js Subprocesses

**Date Fixed:** September 25, 2025
**Affected Component:** webtoys-edit-agent
**Symptom:** Claude CLI returns exit code 1 when called from Node.js subprocess

## The Issue

The webtoys-edit-agent was working perfectly until approximately September 24, 2025, when it suddenly started failing with:
```
Error executing Claude: Claude CLI exited with code 1
```

### Root Cause

The Claude CLI uses subscription-based authentication stored in `~/.claude/auth.json`. When spawned as a subprocess from Node.js, the authentication context was being lost due to:

1. **Environment variable conflicts** - If `ANTHROPIC_API_KEY` is set anywhere in the environment, Claude CLI prioritizes it over subscription auth
2. **Missing HOME variable** - Subprocess might not inherit HOME properly, preventing Claude from finding auth files
3. **Shell environment differences** - Direct CLI calls work, but subprocess calls fail due to environment inheritance issues

## The Solution

### Fix Applied to `process-edits.js`

```javascript
// Before spawning Claude CLI, clean the environment:

// CRITICAL: Pass clean environment to ensure Claude auth works
// Remove any ANTHROPIC_API_KEY that might conflict with subscription auth
const cleanEnv = { ...process.env };
delete cleanEnv.ANTHROPIC_API_KEY;

// Ensure HOME is set correctly for Claude to find auth files
cleanEnv.HOME = process.env.HOME || '/Users/bartdecrem';

// Spawn Claude process with clean environment
const claude = spawn(CLAUDE_PATH, ['--print'], {
  maxBuffer: 1024 * 1024 * 50, // 50MB
  env: cleanEnv,
  shell: false
});
```

### Also Apply to Exec Fallback

```javascript
// If using exec as fallback, also pass clean environment:
const { stdout, stderr } = await execAsync(
  `${CLAUDE_PATH} --print < "${promptFile}"`,
  {
    maxBuffer: 1024 * 1024 * 50,
    timeout: 300000,
    shell: '/bin/bash',
    env: cleanEnv  // Pass clean environment here too
  }
);
```

## Why This Works

1. **Removes API key conflicts** - By deleting `ANTHROPIC_API_KEY` from the subprocess environment, we force Claude to use subscription auth
2. **Ensures auth file access** - By explicitly setting HOME, Claude can find `~/.claude/auth.json`
3. **Clean environment** - No conflicting variables that might confuse Claude's auth system

## Testing the Fix

### Quick Test
```bash
# Create test data
echo '[{
  "id": "test",
  "edit_request": "change hello to goodbye",
  "wtaf_content": {"app_slug": "test-app", "html_content": "<html><body>hello</body></html>"},
  "content": {"html_content": "<html><body>hello</body></html>", "detectedType": "standard"}
}]' > /tmp/test-worker.json

# Run the edit processor
WORKER_INPUT=/tmp/test-worker.json node process-edits.js
```

Should output:
```
✅ Claude completed successfully
✅ Valid HTML detected
✅ Edit completed successfully
```

## Related Documentation

- **Anthropic's Authentication Priority**: When both `ANTHROPIC_API_KEY` and subscription auth exist, API key takes precedence
- **Claude CLI Auth Location**: `~/.claude/auth.json` (subscription) or `~/.claude.json` (legacy)
- **Environment Inheritance**: Node.js `spawn()` and `exec()` inherit parent environment by default unless explicitly overridden

## Prevention

### For Future Code Agents

1. **Never set ANTHROPIC_API_KEY** in subprocess environments when using Claude CLI with subscription auth
2. **Always ensure HOME is set** when spawning Claude CLI from scripts
3. **Test subprocess calls** separately from direct CLI calls - they have different environment contexts
4. **Use clean environment** when auth issues occur - explicitly pass only needed variables

### Common Pitfalls

- ❌ Assuming subprocess inherits exact same environment as parent
- ❌ Setting ANTHROPIC_API_KEY "just in case" - it overrides subscription auth
- ❌ Not checking HOME variable in subprocess context
- ✅ Explicitly manage environment variables for subprocess calls
- ✅ Test auth in same context as production (subprocess, not direct CLI)

## Keywords for Search

- Claude CLI exit code 1
- Claude subprocess authentication failed
- ANTHROPIC_API_KEY conflict
- Node.js spawn Claude error
- webtoys-edit-agent broken
- Claude invalid API key subprocess
- Claude CLI works in terminal but not in script

## Summary

The webtoys-edit-agent broke because Claude CLI's authentication wasn't properly passed to subprocesses. The fix ensures a clean environment with no conflicting API keys and proper HOME variable setting, allowing Claude to use its subscription authentication from `~/.claude/auth.json`.

**Status:** ✅ FIXED and TESTED - Edit agent successfully processing edits again