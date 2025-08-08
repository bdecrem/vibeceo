#!/bin/bash

# Polished TMUX Worktree Starter - FIXED VERSION
# Based on lessons learned from manual setup
# Usage: ./start-tmux-worktree.sh [worktree-id] [branch-name]

set -e

WORKTREE_ID="${1:-2}"
BRANCH="${2:-my-feature}"

# Port configuration based on worktree ID
case "$WORKTREE_ID" in
    1) SMS_PORT=3030; WEB_PORT=3000; NGROK_PORT=8000; COLOR="blue" ;;
    2) SMS_PORT=3031; WEB_PORT=3001; NGROK_PORT=8001; COLOR="green" ;;
    3) SMS_PORT=3032; WEB_PORT=3002; NGROK_PORT=8002; COLOR="yellow" ;;
    *) echo "Invalid worktree ID (use 1-3)"; exit 1 ;;
esac

PROJECT_ROOT="/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8"
WORKTREE_BASE="$PROJECT_ROOT/../vibeceo8-worktrees"
WORKTREE_NAME="worktree-${WORKTREE_ID}-${BRANCH}"
WORKTREE_PATH="$WORKTREE_BASE/$WORKTREE_NAME"
SESSION_NAME="wtaf-${WORKTREE_ID}"

echo "🚀 Starting worktree $WORKTREE_ID ($BRANCH)"
echo "   Ports: SMS=$SMS_PORT, Web=$WEB_PORT"

# Step 1: Kill any processes using our ports
echo "🧹 Cleaning up ports..."
lsof -ti :$SMS_PORT | xargs kill -9 2>/dev/null || true
lsof -ti :$WEB_PORT | xargs kill -9 2>/dev/null || true

# Step 2: Ensure worktree exists
if [[ ! -d "$WORKTREE_PATH" ]]; then
    echo "📁 Creating worktree..."
    mkdir -p "$WORKTREE_BASE"
    cd "$PROJECT_ROOT"
    git worktree add "$WORKTREE_PATH" -b "$BRANCH" 2>/dev/null || git worktree add "$WORKTREE_PATH" "$BRANCH"
fi

# Step 3: SAFELY copy .env.local files (NEVER modify originals!)
echo "📋 Copying environment files..."

# Remove any existing symlinks first
rm -f "$WORKTREE_PATH/sms-bot/.env" 2>/dev/null || true
rm -f "$WORKTREE_PATH/web/.env" 2>/dev/null || true

# Copy SMS bot env - ALWAYS from original, NEVER modify original
if [ -f "$PROJECT_ROOT/sms-bot/.env.local" ]; then
    cp "$PROJECT_ROOT/sms-bot/.env.local" "$WORKTREE_PATH/sms-bot/.env"
    # Replace WEB_APP_URL to use local port
    sed -i '' "s|WEB_APP_URL=.*|WEB_APP_URL=http://localhost:$WEB_PORT|" "$WORKTREE_PATH/sms-bot/.env"
    # Append port overrides to the COPY
    echo "" >> "$WORKTREE_PATH/sms-bot/.env"
    echo "# WORKTREE $WORKTREE_ID PORT OVERRIDES" >> "$WORKTREE_PATH/sms-bot/.env"
    echo "SMS_PORT=$SMS_PORT" >> "$WORKTREE_PATH/sms-bot/.env"
    echo "PORT=$SMS_PORT" >> "$WORKTREE_PATH/sms-bot/.env"
else
    echo "⚠️  Warning: No sms-bot/.env.local found"
fi

# Copy web env
if [ -f "$PROJECT_ROOT/web/.env.local" ]; then
    cp "$PROJECT_ROOT/web/.env.local" "$WORKTREE_PATH/web/.env"
    echo "" >> "$WORKTREE_PATH/web/.env"
    echo "# WORKTREE $WORKTREE_ID PORT OVERRIDE" >> "$WORKTREE_PATH/web/.env"
    echo "PORT=$WEB_PORT" >> "$WORKTREE_PATH/web/.env"
fi

# Step 4: Build if needed
cd "$WORKTREE_PATH/sms-bot"
if [ ! -d "dist" ]; then
    echo "📦 Building SMS bot..."
    npm install --silent 2>/dev/null || npm install
    npm run build
fi

cd "$WORKTREE_PATH/web"
if [ ! -d "node_modules" ]; then
    echo "📦 Installing web dependencies..."
    npm install --silent 2>/dev/null || npm install
fi

# Step 5: Kill old tmux session if exists
tmux kill-session -t "$SESSION_NAME" 2>/dev/null || true

# Step 6: Create new tmux session with proper layout
echo "🖥️  Setting up tmux session..."

# Create session
tmux new-session -d -s "$SESSION_NAME" -c "$WORKTREE_PATH/sms-bot"

# Configure status bar
tmux set-option -t "$SESSION_NAME" status-style "bg=$COLOR,fg=white"
tmux set-option -t "$SESSION_NAME" status-left "#[bold]W$WORKTREE_ID "
tmux set-option -t "$SESSION_NAME" status-right " SMS:$SMS_PORT Web:$WEB_PORT "

# Create the 4-pane layout
# Split vertically first (creates left and right)
tmux split-window -t "$SESSION_NAME:0.0" -h -c "$WORKTREE_PATH/sms-bot"

# Split left pane horizontally (creates top-left and bottom-left)
tmux select-pane -t "$SESSION_NAME:0.0"
tmux split-window -t "$SESSION_NAME:0.0" -v -c "$WORKTREE_PATH/sms-bot"

# Split right pane horizontally (creates top-right and bottom-right)
tmux select-pane -t "$SESSION_NAME:0.2"
tmux split-window -t "$SESSION_NAME:0.2" -v -c "$WORKTREE_PATH/sms-bot"

# Give panes a moment to initialize
sleep 1

# Start services in correct panes
echo "🚀 Starting services..."

# Pane 0 (top-left): SMS Bot
tmux select-pane -t "$SESSION_NAME:0.0"
tmux send-keys -t "$SESSION_NAME:0.0" "cd $WORKTREE_PATH/sms-bot && PORT=$SMS_PORT npm run start" C-m

# Pane 1 (bottom-left): Web Server  
tmux select-pane -t "$SESSION_NAME:0.1"
tmux send-keys -t "$SESSION_NAME:0.1" "cd $WORKTREE_PATH/web && PORT=$WEB_PORT npm run dev" C-m

# Pane 2 (top-right): Engine
tmux select-pane -t "$SESSION_NAME:0.2"
tmux send-keys -t "$SESSION_NAME:0.2" "cd $WORKTREE_PATH/sms-bot && node dist/scripts/start-engine.js" C-m

# Pane 3 (bottom-right): Dev Reroute
tmux select-pane -t "$SESSION_NAME:0.3"
tmux send-keys -t "$SESSION_NAME:0.3" "cd $WORKTREE_PATH/sms-bot && SMS_PORT=$SMS_PORT PORT=$SMS_PORT npm run dev:reroute" C-m

# Focus on top-left pane
tmux select-pane -t "$SESSION_NAME:0.0"

echo ""
echo "✅ Worktree $WORKTREE_ID is ready!"
echo ""
echo "Layout:"
echo "  Top-left:     SMS Bot (port $SMS_PORT)"
echo "  Top-right:    Engine"
echo "  Bottom-left:  Web Server (port $WEB_PORT)"
echo "  Bottom-right: Dev Reroute"
echo ""
echo "Commands:"
echo "  Navigate:  Control-B + arrow keys"
echo "  Cycle:     Control-B + o"
echo "  Detach:    Control-B + d"
echo "  Reattach:  tmux attach -t $SESSION_NAME"
echo ""
echo "Test your SMS bot:"
echo "  curl -X POST http://localhost:$SMS_PORT/dev/webhook \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"Body\": \"wtaf make a test page\", \"From\": \"+14155551234\"}'"
echo ""
echo "Attaching in 3 seconds..."
sleep 3

tmux attach -t "$SESSION_NAME"