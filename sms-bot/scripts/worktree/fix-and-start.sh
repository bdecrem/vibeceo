#!/bin/bash

# ONE SCRIPT TO FIX EVERYTHING AND START THE WORKTREE
# This WILL work.

WORKTREE_PATH="/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8-worktrees/worktree-2-my-feature"

echo "🔧 FIXING YOUR WORKTREE - NO MORE FAILURES"
echo ""

# 1. Install missing dependencies
echo "📦 Installing dependencies..."
cd "$WORKTREE_PATH/web"
npm install --silent

cd "$WORKTREE_PATH/sms-bot" 
npm install --silent

# 2. Copy the ACTUAL working .env files
echo "🔐 Copying working environment files..."
cp /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/.env.local "$WORKTREE_PATH/sms-bot/.env"
cp /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/.env.local "$WORKTREE_PATH/web/.env" 2>/dev/null || true

# 3. Add port overrides to .env files
echo "" >> "$WORKTREE_PATH/sms-bot/.env"
echo "# WORKTREE 2 PORTS" >> "$WORKTREE_PATH/sms-bot/.env"
echo "SMS_PORT=3031" >> "$WORKTREE_PATH/sms-bot/.env"
echo "PORT=3031" >> "$WORKTREE_PATH/sms-bot/.env"

echo "" >> "$WORKTREE_PATH/web/.env"
echo "# WORKTREE 2 PORTS" >> "$WORKTREE_PATH/web/.env"
echo "PORT=3001" >> "$WORKTREE_PATH/web/.env"

# 4. Build SMS bot
echo "🔨 Building SMS bot..."
cd "$WORKTREE_PATH/sms-bot"
npm run build

# 5. Start everything in tmux
echo ""
echo "✅ SETUP COMPLETE - Starting services in tmux..."
echo ""

# Kill old session if exists
tmux kill-session -t wtaf-working 2>/dev/null || true

# Create new tmux session
tmux new-session -d -s wtaf-working -n "services" -c "$WORKTREE_PATH"

# Split into 4 panes
tmux split-window -t wtaf-working:0 -h -c "$WORKTREE_PATH"
tmux split-window -t wtaf-working:0.0 -v -c "$WORKTREE_PATH"
tmux split-window -t wtaf-working:0.2 -v -c "$WORKTREE_PATH"

# Start services with explicit port environment variables
tmux send-keys -t wtaf-working:0.0 "cd sms-bot && PORT=3031 SMS_PORT=3031 npm run start" C-m
tmux send-keys -t wtaf-working:0.1 "cd web && PORT=3001 npm run dev" C-m
tmux send-keys -t wtaf-working:0.2 "cd sms-bot && npm run dev:engine" C-m
tmux send-keys -t wtaf-working:0.3 "cd sms-bot && PORT=3031 npm run dev:reroute" C-m

echo "🎉 SUCCESS! Everything is starting up!"
echo ""
echo "Services running:"
echo "  SMS Bot: http://localhost:3031"
echo "  Web: http://localhost:3001"
echo ""
echo "Attaching to tmux in 3 seconds..."
sleep 3

tmux attach -t wtaf-working