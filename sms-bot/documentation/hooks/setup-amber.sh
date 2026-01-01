#!/bin/bash
# Setup Amber + Thinkhard on a new machine
#
# Run from project root:
#   ./sms-bot/documentation/hooks/setup-amber.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../" && pwd)"
cd "$PROJECT_ROOT"

echo "Setting up Amber + Thinkhard..."

# 1. Create .claude directories
mkdir -p .claude/commands
mkdir -p .claude/hooks

# 2. Copy slash command
cp sms-bot/documentation/subagents/amber.md ~/.claude/commands/amber.md
echo "  ✓ Installed /amber command (user-level)"

# 3. Copy hooks to project .claude
cp sms-bot/documentation/hooks/check-amber-loop.sh .claude/hooks/
cp sms-bot/documentation/hooks/check-amber-loop.ts .claude/hooks/
chmod +x .claude/hooks/check-amber-loop.sh
echo "  ✓ Installed thinkhard hooks"

# 4. Create settings.json with absolute path
cat > .claude/settings.json << EOF
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "${PROJECT_ROOT}/.claude/hooks/check-amber-loop.sh"
          }
        ]
      }
    ]
  }
}
EOF
echo "  ✓ Created settings.json with Stop hook"

# 5. Check for env vars
if [ -f sms-bot/.env.local ]; then
  if grep -q "SUPABASE_URL" sms-bot/.env.local && grep -q "SUPABASE_SERVICE_ROLE_KEY" sms-bot/.env.local; then
    echo "  ✓ Found Supabase credentials in sms-bot/.env.local"
  else
    echo "  ⚠ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in sms-bot/.env.local"
  fi
else
  echo "  ⚠ sms-bot/.env.local not found - thinkhard hooks won't work without Supabase credentials"
fi

echo ""
echo "Done! You can now:"
echo "  1. Run /amber to wake up Amber"
echo "  2. Say 'thinkhard: [task]' for multi-iteration work"
