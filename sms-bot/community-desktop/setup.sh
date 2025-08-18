#!/bin/bash

# Setup script for WEBTOYS Issue Tracker Agent
echo "🚀 Setting up WEBTOYS Issue Tracker Agent..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env.local exists (or .env as fallback)
if [ -f "../.env.local" ]; then
    ENV_FILE="../.env.local"
elif [ -f "../.env" ]; then
    ENV_FILE="../.env"
else
    echo -e "${RED}❌ .env.local or .env file not found in parent directory${NC}"
    echo "Please create a .env.local file with:"
    echo "  SUPABASE_URL=your_supabase_url"
    echo "  SUPABASE_SERVICE_KEY=your_service_key"
    echo "  ISSUE_TRACKER_APP_ID=webtoys-issue-tracker"
    echo "  PROJECT_ROOT=$(pwd)/.."
    exit 1
fi

# Source the env file
export $(cat $ENV_FILE | grep -v '^#' | xargs)

# Check required environment variables
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables${NC}"
    exit 1
fi

# Add project root if not set
if [ -z "$PROJECT_ROOT" ]; then
    echo "PROJECT_ROOT=$(cd .. && pwd)" >> $ENV_FILE
    echo -e "${GREEN}✅ Added PROJECT_ROOT to $ENV_FILE${NC}"
fi

# Add issue tracker app ID if not set
if [ -z "$ISSUE_TRACKER_APP_ID" ]; then
    echo "ISSUE_TRACKER_APP_ID=webtoys-issue-tracker" >> $ENV_FILE
    echo -e "${GREEN}✅ Added ISSUE_TRACKER_APP_ID to $ENV_FILE${NC}"
fi

# Make scripts executable
chmod +x *.js
chmod +x setup.sh
echo -e "${GREEN}✅ Made scripts executable${NC}"

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI (gh) is not installed${NC}"
    echo "Install it with: brew install gh"
    echo "Then authenticate with: gh auth login"
else
    # Check if gh is authenticated
    if ! gh auth status &> /dev/null; then
        echo -e "${YELLOW}⚠️  GitHub CLI is not authenticated${NC}"
        echo "Run: gh auth login"
    else
        echo -e "${GREEN}✅ GitHub CLI is authenticated${NC}"
    fi
fi

# Check if Claude Code is available
if ! command -v claude &> /dev/null; then
    echo -e "${YELLOW}⚠️  Claude Code CLI is not installed${NC}"
    echo "This is required for the auto-fix functionality"
else
    echo -e "${GREEN}✅ Claude Code CLI is available${NC}"
fi

# Create a test run script
cat > test-run.sh << 'EOF'
#!/bin/bash
echo "🧪 Testing Issue Tracker Pipeline..."
echo ""
echo "This will run in dry-run mode without making actual changes"
echo ""

# Run reformulation only (safe)
ENABLE_AUTO_FIX=false node monitor.js --reformulate

echo ""
echo "✅ Test complete. To run the full pipeline:"
echo "  ENABLE_AUTO_FIX=true node monitor.js"
EOF

chmod +x test-run.sh
echo -e "${GREEN}✅ Created test-run.sh script${NC}"

# Set up cron job (optional)
echo ""
echo -e "${YELLOW}📅 Cron Setup (Optional)${NC}"
echo "To run automatically every 2 hours, add this to your crontab:"
echo ""
echo "0 */2 * * * cd $(pwd) && /usr/local/bin/node monitor.js >> logs/monitor.log 2>&1"
echo ""
echo "Run 'crontab -e' to edit your crontab"

# Create logs directory
mkdir -p logs
echo -e "${GREEN}✅ Created logs directory${NC}"

# Create README
cat > README.md << 'EOF'
# WEBTOYS Issue Tracker Agent

Automated issue tracking and fixing system using Claude Code.

## Quick Start

1. Test the reformulation agent:
   ```bash
   ./test-run.sh
   ```

2. Run the full pipeline:
   ```bash
   ENABLE_AUTO_FIX=true node monitor.js
   ```

3. Run specific agents:
   ```bash
   node monitor.js --reformulate  # Only reformulate issues
   node monitor.js --fix          # Only fix issues
   node monitor.js --pr           # Only create PRs
   ```

## Configuration

Edit `config.json` to customize:
- Issue categories
- Confidence thresholds
- GitHub labels
- Processing limits

## Environment Variables

- `ENABLE_AUTO_FIX`: Enable automatic fixing (default: false)
- `AUTO_STASH`: Auto-stash git changes (default: false)
- `STRICT_GIT`: Require clean git state (default: false)
- `ISSUE_TRACKER_APP_ID`: ZAD app ID for issue storage

## Monitoring

Check logs in the `logs/` directory for detailed output.

## Safety Features

- Only processes high-confidence issues
- Runs tests before creating PRs
- Creates separate branches for each fix
- Human review required before merging

EOF

echo -e "${GREEN}✅ Created README.md${NC}"

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Create the ZAD app for issue intake (or use existing turquoise-rabbit-exploring)"
echo "2. Test the reformulation agent: ./test-run.sh"
echo "3. Enable auto-fix when ready: ENABLE_AUTO_FIX=true node monitor.js"
echo ""
echo "For help: node monitor.js --help"