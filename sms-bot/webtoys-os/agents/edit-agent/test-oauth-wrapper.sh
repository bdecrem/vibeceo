#!/bin/bash

# Set OAuth token and clean environment
export CLAUDE_CODE_OAUTH_TOKEN="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"
export HOME=/Users/bartdecrem
export USER=bartdecrem
export SHELL=/bin/bash
export PATH=$PATH

# Remove conflicting variables
unset ANTHROPIC_API_KEY
unset CLAUDE_API_KEY

# Create test prompt
cat > /tmp/test-prompt.txt << 'PROMPT'
Create a simple HTML file with this content and save it as /tmp/oauth-test-success.html:

<!DOCTYPE html>
<html>
<head><title>OAuth Test</title></head>
<body>
  <h1>OAuth Authentication Working!</h1>
  <p>The edit agent can now use Claude CLI successfully.</p>
</body>
</html>
PROMPT

echo "Testing Claude with OAuth token using wrapper method..."

# Use the claude-wrapper.sh script that already exists
./claude-wrapper.sh /tmp/test-prompt.txt

# Check if file was created
if [ -f "/tmp/oauth-test-success.html" ]; then
    echo ""
    echo "✅ SUCCESS! OAuth token works with wrapper method!"
    echo "File created at /tmp/oauth-test-success.html"
    echo "Contents:"
    cat /tmp/oauth-test-success.html
else
    echo ""
    echo "⚠️  File not created, but check the output above."
    echo "If Claude responded positively, the auth is working."
fi