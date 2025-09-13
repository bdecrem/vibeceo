#!/bin/bash

# Builder Bot Test - Step 2: Check Status
# This checks what happened after the webhook was called

echo "🔍 Checking Builder Bot Status..."
echo ""

# Check if builder bot server is running
echo "1. Checking if Builder Bot server is running:"
ps aux | grep "builder-bot-server" | grep -v grep
if [ $? -eq 0 ]; then
  echo "   ✅ Builder Bot server is running"
else
  echo "   ❌ Builder Bot server is NOT running"
  echo "   To start it: cd sms-bot/webtoys-os/agents/builder-bot-server && node server.js"
fi

echo ""

# Check if edit agent is running
echo "2. Checking if Edit Agent is running:"
ps aux | grep "execute-open-issue" | grep -v grep
if [ $? -eq 0 ]; then
  echo "   ⚠️  Edit Agent is currently processing something"
else
  echo "   ✅ Edit Agent is available"
fi

echo ""

# Check for lock files
echo "3. Checking for Edit Agent lock files:"
if [ -f "sms-bot/webtoys-os/agents/edit-agent/.agent.lock" ]; then
  echo "   ⚠️  Lock file exists - edit agent might be blocked"
  echo "   Lock file contents:"
  cat "sms-bot/webtoys-os/agents/edit-agent/.agent.lock"
else
  echo "   ✅ No lock file found"
fi

echo ""

# Check recent synthetic issues
echo "4. Checking recent synthetic issues (you'll need to run this manually in node):"
echo "   cd sms-bot/webtoys-os/agents/edit-agent"
echo "   node -e \"
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../../../.env.local' });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

supabase
  .from('webtoys_issue_tracker_data')
  .select('id, content_data, created_at')
  .eq('app_id', 'toybox-issue-tracker-v3')
  .eq('content_data->>source', 'builder-bot')
  .order('created_at', { ascending: false })
  .limit(5)
  .then(({ data, error }) => {
    if (error) {
      console.error('❌ Database error:', error);
    } else if (data && data.length > 0) {
      console.log('📋 Recent Builder Bot issues:');
      data.forEach(issue => {
        console.log(\`   #\${issue.id}: \\\"\${issue.content_data?.description?.substring(0, 50)}...\\\"\`);
        console.log(\`     Status: \${issue.content_data?.status}\`);
        console.log(\`     Created: \${new Date(issue.created_at).toLocaleString()}\`);
        console.log('');
      });
    } else {
      console.log('📭 No recent Builder Bot issues found');
    }
  });
\""

echo ""
echo "5. Next steps if webhook succeeded but edit agent didn't trigger:"
echo "   - Manually run: BUILDER_BOT_FORCE=true node sms-bot/webtoys-os/agents/edit-agent/execute-open-issue-v2.js"
echo "   - Check logs in: sms-bot/webtoys-os/agents/edit-agent/edit-agent-v3.log"