#!/bin/bash

# Simple Worktree Starter - Direct and functional
# Usage: ./simple-start.sh <branch-name> [worktree-id]

set -e

BRANCH="${1:-my-feature}"
WORKTREE_ID="${2:-2}"  # Default to worktree 2

# Configuration
PROJECT_ROOT="/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8"
WORKTREE_BASE="$PROJECT_ROOT/../vibeceo8-worktrees"
WORKTREE_NAME="worktree-${WORKTREE_ID}-${BRANCH}"
WORKTREE_PATH="$WORKTREE_BASE/$WORKTREE_NAME"

# Port assignments
case "$WORKTREE_ID" in
    1) SMS_PORT=3030; WEB_PORT=3000; NGROK_PORT=8000 ;;
    2) SMS_PORT=3031; WEB_PORT=3001; NGROK_PORT=8001 ;;
    3) SMS_PORT=3032; WEB_PORT=3002; NGROK_PORT=8002 ;;
    *) echo "Invalid worktree ID (use 1-3)"; exit 1 ;;
esac

echo "🚀 Starting worktree setup for branch: $BRANCH"
echo "   Worktree ID: $WORKTREE_ID"
echo "   Ports: SMS=$SMS_PORT, Web=$WEB_PORT, Ngrok=$NGROK_PORT"
echo ""

# Create worktree if it doesn't exist
mkdir -p "$WORKTREE_BASE"

if [[ ! -d "$WORKTREE_PATH" ]]; then
    echo "📁 Creating git worktree at: $WORKTREE_PATH"
    cd "$PROJECT_ROOT"
    
    # Try to create worktree
    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
        echo "   Using existing branch: $BRANCH"
        git worktree add "$WORKTREE_PATH" "$BRANCH"
    else
        echo "   Creating new branch: $BRANCH"
        git worktree add "$WORKTREE_PATH" -b "$BRANCH"
    fi
else
    echo "✅ Worktree already exists at: $WORKTREE_PATH"
fi

# Create .env.local file for this worktree
ENV_FILE="$WORKTREE_PATH/sms-bot/.env.local"
echo "📝 Creating environment file: $ENV_FILE"

cat > "$ENV_FILE" << EOF
# Worktree $WORKTREE_ID Environment Variables
# Generated: $(date)

# Port Configuration
PORT=$WEB_PORT
SMS_PORT=$SMS_PORT
NGROK_PORT=$NGROK_PORT

# Worktree Info
WORKTREE_ID=$WORKTREE_ID
WORKTREE_BRANCH=$BRANCH
WORKTREE_PATH=$WORKTREE_PATH

# Service URLs
SMS_WEBHOOK_URL=http://localhost:$SMS_PORT/webhook
DEV_REROUTE_URL=http://localhost:$SMS_PORT/dev/webhook
WEB_SERVER_URL=http://localhost:$WEB_PORT
NGROK_URL=http://localhost:$NGROK_PORT
EOF

echo ""
echo "✅ Worktree setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. cd $WORKTREE_PATH"
echo "   2. Start services:"
echo "      - SMS Bot: cd sms-bot && npm run dev (will use port $SMS_PORT)"
echo "      - Web Server: cd web && npm run dev (will use port $WEB_PORT)"
echo "      - Engine: cd sms-bot && npm run dev:engine"
echo "      - Dev Reroute: cd sms-bot && npm run dev:reroute"
echo ""
echo "🔗 Ngrok command for this worktree:"
echo "   ngrok http $WEB_PORT"
echo ""
echo "💡 TIP: Open multiple terminal tabs for each service"