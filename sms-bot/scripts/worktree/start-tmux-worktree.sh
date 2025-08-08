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

# Verify worktree directory structure
if [[ ! -d "$WORKTREE_PATH/sms-bot" ]]; then
    echo "❌ ERROR: Worktree SMS bot directory missing: $WORKTREE_PATH/sms-bot"
    echo "   This suggests the git worktree creation failed."
    echo "   Please check if you have uncommitted changes or branch conflicts."
    git worktree list
    exit 1
fi

echo "✅ Worktree exists: $WORKTREE_PATH"
echo "   Contents: $(ls -1 "$WORKTREE_PATH" | tr '\n' ' ')"

# Step 3: SAFELY copy .env.local files (NEVER modify originals!)
echo "📋 Copying environment files..."

# Remove any existing symlinks first
rm -f "$WORKTREE_PATH/sms-bot/.env" 2>/dev/null || true
rm -f "$WORKTREE_PATH/web/.env" 2>/dev/null || true

# DEBUG: Show what files exist in source
echo "🔍 DEBUG: Checking source environment files:"
echo "   $PROJECT_ROOT/sms-bot/.env.local: $([ -f "$PROJECT_ROOT/sms-bot/.env.local" ] && echo "EXISTS ($(wc -l < "$PROJECT_ROOT/sms-bot/.env.local") lines)" || echo "NOT FOUND")"
echo "   $PROJECT_ROOT/sms-bot/.env: $([ -f "$PROJECT_ROOT/sms-bot/.env" ] && echo "EXISTS ($(wc -l < "$PROJECT_ROOT/sms-bot/.env") lines)" || echo "NOT FOUND")"

# Copy SMS bot env - ALWAYS from original, NEVER modify original
# Check both .env.local and .env in the main repo
SOURCE_ENV_FILE=""
if [ -f "$PROJECT_ROOT/sms-bot/.env.local" ]; then
    SOURCE_ENV_FILE="$PROJECT_ROOT/sms-bot/.env.local"
    echo "   📄 Using source: sms-bot/.env.local"
elif [ -f "$PROJECT_ROOT/sms-bot/.env" ]; then
    SOURCE_ENV_FILE="$PROJECT_ROOT/sms-bot/.env"
    echo "   📄 Using source: sms-bot/.env"
else
    echo "❌ ERROR: No .env.local or .env found in $PROJECT_ROOT/sms-bot/"
    echo "   Please ensure you have environment variables set up!"
    exit 1
fi

# FORCE COPY - Make absolutely sure this works
DEST_ENV="$WORKTREE_PATH/sms-bot/.env"
echo "   📋 Copying: $SOURCE_ENV_FILE"
echo "   📋 To: $DEST_ENV"

# Create directory if it doesn't exist
mkdir -p "$WORKTREE_PATH/sms-bot"

# DELETE any existing file first to avoid caching issues
rm -f "$DEST_ENV"

# Copy using cat to avoid any caching
cat "$SOURCE_ENV_FILE" > "$DEST_ENV"

# ALSO create .env.local because the code looks for it
cp "$DEST_ENV" "$WORKTREE_PATH/sms-bot/.env.local"
echo "   ✅ Created both .env and .env.local"

# Verify it has the NEW format keys
if ! grep -q "SUPABASE_SERVICE_KEY=sb_secret_" "$DEST_ENV"; then
    echo "❌ ERROR: Old format detected! Force refresh..."
    # Force copy again
    rm -f "$DEST_ENV"
    cp -f "$PROJECT_ROOT/sms-bot/.env.local" "$DEST_ENV"
    cp "$DEST_ENV" "$WORKTREE_PATH/sms-bot/.env.local"
fi

# Verify the file has content and proper permissions
if [ ! -f "$WORKTREE_PATH/sms-bot/.env" ]; then
    echo "❌ ERROR: Failed to create .env file!"
    exit 1
fi

if [ ! -s "$WORKTREE_PATH/sms-bot/.env" ]; then
    echo "❌ ERROR: Copied .env file is empty!"
    echo "   Source file size: $(wc -c < "$SOURCE_ENV_FILE") bytes"
    exit 1
fi

# Set proper file permissions
chmod 644 "$WORKTREE_PATH/sms-bot/.env"

# Check if critical variables exist
if ! grep -q "SUPABASE_URL" "$WORKTREE_PATH/sms-bot/.env"; then
    echo "❌ ERROR: SUPABASE_URL not found in .env file!"
    echo "   Source file content preview:"
    head -5 "$SOURCE_ENV_FILE" | sed 's/=.*/=***HIDDEN***/'
    echo "   Copied file content preview:"
    head -5 "$WORKTREE_PATH/sms-bot/.env" | sed 's/=.*/=***HIDDEN***/'
    exit 1
fi

if ! grep -q "SUPABASE_SERVICE_KEY" "$WORKTREE_PATH/sms-bot/.env"; then
    echo "❌ ERROR: SUPABASE_SERVICE_KEY not found in .env file!"
    echo "   This is required for the SMS bot to function."
    exit 1
fi

# Replace WEB_APP_URL to use local port
sed -i '' "s|WEB_APP_URL=.*|WEB_APP_URL=http://localhost:$WEB_PORT|" "$WORKTREE_PATH/sms-bot/.env"

# Append port overrides to the COPY
echo "" >> "$WORKTREE_PATH/sms-bot/.env"
echo "# WORKTREE $WORKTREE_ID PORT OVERRIDES" >> "$WORKTREE_PATH/sms-bot/.env"
echo "SMS_PORT=$SMS_PORT" >> "$WORKTREE_PATH/sms-bot/.env"
echo "PORT=$SMS_PORT" >> "$WORKTREE_PATH/sms-bot/.env"

# Final verification and success message
ENV_VAR_COUNT=$(grep -c "=" "$WORKTREE_PATH/sms-bot/.env" 2>/dev/null || echo "0")
SUPABASE_URL_CHECK=$(grep -q "SUPABASE_URL=" "$WORKTREE_PATH/sms-bot/.env" && echo "✓" || echo "✗")
SUPABASE_KEY_CHECK=$(grep -q "SUPABASE_SERVICE_KEY=" "$WORKTREE_PATH/sms-bot/.env" && echo "✓" || echo "✗")

echo "   ✅ Environment file configured:"
echo "      • Total variables: $ENV_VAR_COUNT"
echo "      • SUPABASE_URL: $SUPABASE_URL_CHECK"
echo "      • SUPABASE_SERVICE_KEY: $SUPABASE_KEY_CHECK"
echo "      • File size: $(wc -c < "$WORKTREE_PATH/sms-bot/.env") bytes"
echo "      • File permissions: $(ls -la "$WORKTREE_PATH/sms-bot/.env" | cut -d' ' -f1)"

# Copy web env
if [ -f "$PROJECT_ROOT/web/.env.local" ]; then
    cp "$PROJECT_ROOT/web/.env.local" "$WORKTREE_PATH/web/.env"
    echo "" >> "$WORKTREE_PATH/web/.env"
    echo "# WORKTREE $WORKTREE_ID PORT OVERRIDE" >> "$WORKTREE_PATH/web/.env"
    echo "PORT=$WEB_PORT" >> "$WORKTREE_PATH/web/.env"
fi

# Step 4: Test environment loading and build if needed
cd "$WORKTREE_PATH/sms-bot"

# Quick Node.js environment test
echo "🧪 Testing environment variable loading..."
cat > .env-test.js << 'EOF'
require('dotenv').config({ path: './.env' });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
    console.log('❌ SUPABASE_URL not loaded');
    process.exit(1);
}

if (!supabaseKey) {
    console.log('❌ SUPABASE_SERVICE_KEY not loaded');
    process.exit(1);
}

console.log('✅ Environment variables loaded successfully');
console.log('   SUPABASE_URL:', supabaseUrl.substring(0, 30) + '...');
console.log('   SUPABASE_SERVICE_KEY: ***' + supabaseKey.slice(-8));
EOF

# Run the test (if npm exists and dotenv is available)
if command -v node >/dev/null 2>&1; then
    if node .env-test.js 2>/dev/null; then
        echo "   ✅ Environment variables are properly loadable by Node.js"
    else
        echo "   ⚠️  Warning: Environment test failed, but continuing anyway"
        echo "   (This might be due to missing dotenv package)"
    fi
    rm -f .env-test.js
fi

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
tmux send-keys -t "$SESSION_NAME:0.0" "cd $WORKTREE_PATH/sms-bot" C-m
# Add a quick env check before starting
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🔍 SMS Bot Environment Check:'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  SUPABASE_URL:' \$(grep SUPABASE_URL .env | head -1 | sed 's/=.*/=***FOUND***/')" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '  SUPABASE_SERVICE_KEY:' \$(grep SUPABASE_SERVICE_KEY .env | head -1 | sed 's/=.*/=***FOUND***/')" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "echo '🚀 Starting SMS Bot on port $SMS_PORT...'" C-m
tmux send-keys -t "$SESSION_NAME:0.0" "PORT=$SMS_PORT npm run start" C-m

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
echo "🔧 Final Configuration Check:"
echo "  SMS Bot Port: $SMS_PORT"
echo "  Web App Port: $WEB_PORT"
echo "  Environment File: $WORKTREE_PATH/sms-bot/.env ($(wc -c < "$WORKTREE_PATH/sms-bot/.env") bytes)"
echo ""
echo "Test your SMS bot:"
echo "  curl -X POST http://localhost:$SMS_PORT/dev/webhook \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"Body\": \"wtaf make a test page\", \"From\": \"+14155551234\"}'"
echo ""
echo "If you get 'Missing Supabase credentials' error:"
echo "  1. Check the SMS Bot pane for the environment check output"
echo "  2. Verify the .env file was copied correctly"
echo "  3. Make sure $PROJECT_ROOT/sms-bot/.env.local exists and has content"
echo ""
echo "Attaching in 3 seconds..."
sleep 3

tmux attach -t "$SESSION_NAME"