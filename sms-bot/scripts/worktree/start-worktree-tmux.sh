#!/bin/bash

# Single-command worktree launcher with tmux
# Usage: ./start-worktree-tmux.sh [worktree-id]

WORKTREE_ID="${1:-2}"
BRANCH="${2:-my-feature}"

# Configuration
case "$WORKTREE_ID" in
    1) SMS_PORT=3030; WEB_PORT=3000; NGROK_PORT=8000; COLOR="blue" ;;
    2) SMS_PORT=3031; WEB_PORT=3001; NGROK_PORT=8001; COLOR="green" ;;
    3) SMS_PORT=3032; WEB_PORT=3002; NGROK_PORT=8002; COLOR="yellow" ;;
    *) echo "Invalid worktree ID (use 1-3)"; exit 1 ;;
esac

WORKTREE_PATH="/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8-worktrees/worktree-${WORKTREE_ID}-${BRANCH}"
SESSION_NAME="wtaf-${WORKTREE_ID}"

# Kill existing session if it exists
tmux kill-session -t "$SESSION_NAME" 2>/dev/null

echo "🚀 Starting worktree $WORKTREE_ID in tmux session: $SESSION_NAME"
echo "   Path: $WORKTREE_PATH"
echo "   Ports: SMS=$SMS_PORT, Web=$WEB_PORT"

# Create new tmux session with 4 panes
tmux new-session -d -s "$SESSION_NAME" -n "main" -c "$WORKTREE_PATH"

# Configure tmux status bar
tmux set-option -t "$SESSION_NAME" status-style "bg=$COLOR,fg=white"
tmux set-option -t "$SESSION_NAME" status-left "#[bold]Worktree $WORKTREE_ID | "
tmux set-option -t "$SESSION_NAME" status-right " SMS:$SMS_PORT Web:$WEB_PORT "

# Split into 4 panes (2x2 grid)
tmux split-window -t "$SESSION_NAME:0" -h -c "$WORKTREE_PATH"
tmux split-window -t "$SESSION_NAME:0.0" -v -c "$WORKTREE_PATH"
tmux split-window -t "$SESSION_NAME:0.2" -v -c "$WORKTREE_PATH"

# Pane 0 (top-left): SMS Bot
tmux send-keys -t "$SESSION_NAME:0.0" "cd sms-bot && npm run dev" C-m

# Pane 1 (bottom-left): Web Server
tmux send-keys -t "$SESSION_NAME:0.1" "cd web && npm run dev" C-m

# Pane 2 (top-right): Engine
tmux send-keys -t "$SESSION_NAME:0.2" "cd sms-bot && npm run dev:engine" C-m

# Pane 3 (bottom-right): Dev Reroute
tmux send-keys -t "$SESSION_NAME:0.3" "cd sms-bot && npm run dev:reroute" C-m

# Create second window for testing/commands
tmux new-window -t "$SESSION_NAME:1" -n "terminal" -c "$WORKTREE_PATH"

# Attach to the session
echo ""
echo "✅ All services starting in tmux!"
echo ""
echo "📋 Quick commands:"
echo "   Attach now:     tmux attach -t $SESSION_NAME"
echo "   Detach:         Ctrl-B, then D"
echo "   Switch panes:   Ctrl-B, then arrow keys"
echo "   Switch windows: Ctrl-B, then 0 or 1"
echo "   Kill session:   tmux kill-session -t $SESSION_NAME"
echo ""
echo "Attaching to session in 2 seconds..."
sleep 2

tmux attach -t "$SESSION_NAME"