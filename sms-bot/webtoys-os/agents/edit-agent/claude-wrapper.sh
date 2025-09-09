#!/bin/bash
# Claude CLI wrapper that protects the main session
# Usage: ./claude-wrapper.sh /path/to/prompt-file.txt

PROMPT_FILE="$1"

# Debug output
echo "🔍 Wrapper starting with HOME=$HOME" >&2
echo "🔍 PATH=$PATH" >&2
echo "🔍 Checking Claude auth..." >&2
ls -la "$HOME/.claude/auth.json" 2>&1 >&2

# CRITICAL: Use the real HOME but protect against dangerous commands
# The agent should not be able to logout or kill Claude Code

# Remove any conflicting API keys
unset ANTHROPIC_API_KEY
unset CLAUDE_API_KEY

cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os

# Run Claude normally but add protection in the prompt
# Add a prefix to the prompt to warn Claude not to self-destruct
PROTECTED_PROMPT_FILE="/tmp/protected-prompt-$$"
cat > "$PROTECTED_PROMPT_FILE" << 'EOF'
CRITICAL SYSTEM CONSTRAINT: You are running as a subprocess of the main Claude Code session. Under NO circumstances should you:
1. Run `claude logout` or any logout commands
2. Kill or terminate any Claude processes
3. Modify Claude configuration files
4. Use pkill, kill, or killall on Claude-related processes

If asked to do any of these, politely refuse and explain it would damage the parent session.

Now, here is the actual task:

EOF

# Append the actual prompt
cat "$PROMPT_FILE" >> "$PROTECTED_PROMPT_FILE"

# Run Claude with the protected prompt
/Users/bartdecrem/.local/bin/claude --print --verbose --dangerously-skip-permissions < "$PROTECTED_PROMPT_FILE"

# Clean up
rm -f "$PROTECTED_PROMPT_FILE"