#!/bin/bash
export CLAUDE_CODE_OAUTH_TOKEN="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"
export HOME=/Users/bartdecrem
unset ANTHROPIC_API_KEY
unset CLAUDE_API_KEY

echo "Create a simple HTML file that says 'OAuth test successful' and save it as test-oauth.html" > /tmp/test-prompt.txt

echo "Testing Claude in headless mode with OAuth token..."
cd /tmp
/Users/bartdecrem/.local/bin/claude < /tmp/test-prompt.txt

if [ -f "test-oauth.html" ]; then
    echo "✅ SUCCESS! File created. OAuth token works in headless mode."
    cat test-oauth.html
else
    echo "❌ FAILED. No file created."
fi