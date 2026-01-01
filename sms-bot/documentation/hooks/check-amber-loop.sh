#!/bin/bash
# Amber Thinkhard Loop Hook Wrapper
# Loads env vars and runs the TypeScript checker

# Get the directory where this script lives, then go up to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Source env vars from sms-bot
if [ -f sms-bot/.env.local ]; then
  export $(grep -E '^(SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' sms-bot/.env.local | xargs)
fi

# Run the TypeScript hook
exec npx tsx .claude/hooks/check-amber-loop.ts
