#!/bin/bash

# Complete Worktree Setup Script
# Creates worktree and safely copies .env files
# Usage: ./setup-worktree.sh <branch-name> [worktree-id]

set -e

BRANCH="${1:-my-feature}"
WORKTREE_ID="${2:-2}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

echo -e "${BLUE}🚀 Setting up worktree for branch: $BRANCH${NC}"
echo "   Worktree ID: $WORKTREE_ID"
echo "   Ports: SMS=$SMS_PORT, Web=$WEB_PORT, Ngrok=$NGROK_PORT"
echo ""

# Step 1: Create worktree
mkdir -p "$WORKTREE_BASE"

if [[ ! -d "$WORKTREE_PATH" ]]; then
    echo -e "${YELLOW}📁 Creating git worktree...${NC}"
    cd "$PROJECT_ROOT"
    
    if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
        git worktree add "$WORKTREE_PATH" "$BRANCH"
    else
        git worktree add "$WORKTREE_PATH" -b "$BRANCH"
    fi
else
    echo -e "${GREEN}✅ Worktree already exists${NC}"
fi

# Step 2: Copy .env files (safely)
echo -e "${YELLOW}🔐 Copying environment files...${NC}"

# SMS Bot .env
if [ -f "$PROJECT_ROOT/sms-bot/.env.local" ]; then
    cp "$PROJECT_ROOT/sms-bot/.env.local" "$WORKTREE_PATH/sms-bot/.env"
    echo "   ✅ Copied sms-bot/.env"
elif [ -f "$PROJECT_ROOT/sms-bot/.env" ]; then
    cp "$PROJECT_ROOT/sms-bot/.env" "$WORKTREE_PATH/sms-bot/.env"
    echo "   ✅ Copied sms-bot/.env"
else
    echo "   ⚠️  No sms-bot .env file found"
fi

# Web .env
if [ -f "$PROJECT_ROOT/web/.env.local" ]; then
    cp "$PROJECT_ROOT/web/.env.local" "$WORKTREE_PATH/web/.env"
    echo "   ✅ Copied web/.env"
elif [ -f "$PROJECT_ROOT/web/.env" ]; then
    cp "$PROJECT_ROOT/web/.env" "$WORKTREE_PATH/web/.env"
    echo "   ✅ Copied web/.env"
else
    echo "   ⚠️  No web .env file found"
fi

# Step 3: Create port override file
echo -e "${YELLOW}📝 Creating port configuration...${NC}"

PORT_CONFIG="$WORKTREE_PATH/sms-bot/.env.ports"
cat > "$PORT_CONFIG" << EOF
# Worktree $WORKTREE_ID Port Configuration
# This file overrides default ports
PORT=$WEB_PORT
SMS_PORT=$SMS_PORT
NGROK_PORT=$NGROK_PORT
EOF

# Also append to .env files so ports are used
echo "" >> "$WORKTREE_PATH/sms-bot/.env"
echo "# Worktree Port Overrides" >> "$WORKTREE_PATH/sms-bot/.env"
echo "SMS_PORT=$SMS_PORT" >> "$WORKTREE_PATH/sms-bot/.env"

echo "" >> "$WORKTREE_PATH/web/.env"
echo "# Worktree Port Overrides" >> "$WORKTREE_PATH/web/.env"
echo "PORT=$WEB_PORT" >> "$WORKTREE_PATH/web/.env"

# Step 4: Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
cd "$WORKTREE_PATH/sms-bot"
npm install --silent

cd "$WORKTREE_PATH/web"
npm install --silent

# Step 5: Build projects
echo -e "${YELLOW}🔨 Building projects...${NC}"
cd "$WORKTREE_PATH/sms-bot"
npm run build

echo ""
echo -e "${GREEN}✅ Worktree setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Quick Start Commands:${NC}"
echo ""
echo "Start with tmux (all services in one window):"
echo -e "${GREEN}  cd $PROJECT_ROOT/sms-bot/scripts/worktree${NC}"
echo -e "${GREEN}  ./start-worktree-tmux.sh $WORKTREE_ID${NC}"
echo ""
echo "Or start services manually:"
echo -e "${GREEN}  cd $WORKTREE_PATH${NC}"
echo -e "${GREEN}  cd sms-bot && npm run dev${NC}  # SMS on port $SMS_PORT"
echo -e "${GREEN}  cd web && npm run dev${NC}      # Web on port $WEB_PORT"
echo ""
echo "When done, clean up securely:"
echo -e "${GREEN}  ./cleanup-worktree.sh $WORKTREE_ID${NC}"
echo ""
echo -e "${YELLOW}⚠️  Remember: .env files were copied - they will be securely deleted on cleanup${NC}"