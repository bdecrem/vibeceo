#!/usr/bin/env bash
set -e

# Start Builder Bot server with one command from anywhere.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export EDIT_AGENT_ENABLED=${EDIT_AGENT_ENABLED:-true}

echo "🤖 Starting Builder Bot server..."
echo "📁 Repo: $ROOT_DIR"
echo "🌐 Port: ${BUILDER_BOT_PORT:-3041}"
echo "(Tip: set webhook URL in the dock to http://localhost:${BUILDER_BOT_PORT:-3041})"

exec node "$ROOT_DIR/sms-bot/webtoys-os/agents/builder-bot-server/server.js"

