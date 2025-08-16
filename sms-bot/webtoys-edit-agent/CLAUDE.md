# Webtoys-Edit-Agent - Critical Rules for Claude Code

## 🎯 Project Purpose
This agent enables users to edit their existing Webtoys via natural language requests using the `--revise` SMS command. The agent uses Claude CLI to intelligently modify HTML while preserving functionality.

## 🚨 CRITICAL SAFETY RULES 🚨

### Never Break Core Functionality
When editing any Webtoy, you MUST preserve:

1. **For ZAD Apps**:
   - ALL `/api/zad/save` and `/api/zad/load` endpoints
   - Authentication functions (`showNewUserScreen`, `generateNewUser`, etc.)
   - User ID management (`window.USER_ID`, `window.APP_ID`)
   - Data persistence logic

2. **For Games**:
   - Game loop (`requestAnimationFrame` cycles)
   - Control handlers (touch, keyboard)
   - Score/state management
   - Canvas rendering pipeline

3. **For Forms**:
   - Submission endpoints
   - Validation logic
   - Email/data collection fields
   - Success/error handling

4. **For All Apps**:
   - Meta tags and viewport settings
   - External API calls
   - Event listeners
   - Critical CSS for mobile responsiveness

### Edit Request Processing Rules

1. **Understand Before Editing**:
   - Identify app type (game/zad/form/standard)
   - Locate critical functions
   - Map user request to specific changes

2. **Make Minimal Changes**:
   - Change only what's requested
   - Preserve all existing functionality
   - Don't "improve" unrelated code

3. **Validate After Editing**:
   - Ensure HTML is well-formed
   - Check critical functions remain intact
   - Verify no syntax errors introduced

## 🔧 Technical Requirements

### Claude CLI Integration
```bash
# MUST use full path for cron compatibility
/Users/bartdecrem/.local/bin/claude

# NOT just:
claude
```

### Directory Structure
```
webtoys-edit-agent/
├── monitor.js              # Main orchestrator
├── collect-edit-requests.js   # Gather pending edits from DB
├── process-edits.js       # Claude CLI edit execution
├── validate-edits.js      # Safety validation
├── deploy-edits.js        # Save revisions to DB
└── prompts/
    ├── edit-instructions.md
    └── safety-rules.md
```

### Database Schema
```javascript
// Edit requests tracking
{
  id: 'uuid',
  content_id: 'uuid',        // Reference to wtaf_content
  app_slug: 'my-app',
  edit_request: 'make the background blue',
  user_phone: '+1234567890',
  status: 'pending|processing|completed|failed',
  created_at: 'timestamp',
  processed_at: 'timestamp',
  error_message: 'string',
  revision_id: 1
}

// Revisions stored in wtaf_content
{
  revisions: [
    {
      revision_id: 1,
      html_content: '...',
      edit_request: 'original request',
      created_at: 'timestamp',
      created_by: 'phone',
      ai_summary: 'What was changed'
    }
  ],
  current_revision: 1  // 0 = original
}
```

## 📋 Edit Request Pipeline

1. **Collection Phase**:
   - User sends: `--revise my-app make it faster`
   - Controller queues request with status 'pending'
   - Returns confirmation to user

2. **Processing Phase**:
   - Load original HTML from wtaf_content
   - Apply safety rules based on app type
   - Execute edit via Claude CLI
   - Capture edited HTML

3. **Validation Phase**:
   - Check HTML structure
   - Verify critical functions preserved
   - Run app-specific validations

4. **Deployment Phase**:
   - Save as new revision
   - Update current_revision pointer
   - Notify user of completion

## 🛡️ Safety Mechanisms

### Rate Limiting
- Max 3 revisions per day per app
- Max 500 characters per edit request
- 10-minute cooldown between edits

### Rollback Capability
```javascript
// User can revert via SMS
--revert my-app        // Go back to previous revision
--revert my-app 0      // Go back to original
```

### Validation Checks
```javascript
// Critical elements that must be preserved
const CRITICAL_PATTERNS = {
  zad: [
    '/api/zad/save',
    '/api/zad/load',
    'window.APP_ID',
    'window.USER_ID'
  ],
  game: [
    'requestAnimationFrame',
    'canvas',
    'gameLoop',
    'update()',
    'render()'
  ],
  form: [
    'form',
    'submit',
    'POST',
    'email'
  ]
};
```

## 🚦 Status Codes

- `pending` - Edit request received, waiting to process
- `processing` - Currently being edited by Claude
- `validating` - Checking edited HTML
- `completed` - Successfully applied
- `failed` - Edit failed (with error_message)
- `rolled_back` - User reverted this edit

## 🐛 Common Issues & Solutions

### Issue: Edit breaks app functionality
**Solution**: Automatic rollback to previous revision, notify user

### Issue: Claude produces invalid HTML
**Solution**: Validation catches this, request retry with stricter prompt

### Issue: Edit request too vague
**Solution**: Return clarification request to user

### Issue: Concurrent edit requests
**Solution**: Queue system processes one at a time

## 🧪 Testing Checklist

Before deploying any edit:
- [ ] HTML validates
- [ ] Critical functions present
- [ ] No JavaScript errors
- [ ] Mobile responsive maintained
- [ ] Original functionality preserved
- [ ] Edit request fulfilled

## 📝 Prompt Engineering Tips

### Good Edit Prompts
- "Change the background to blue"
- "Make the snake move faster"
- "Add a reset button"
- "Increase the font size"

### Bad Edit Prompts (will be rejected)
- "Make it better" (too vague)
- "Rewrite everything" (too broad)
- "Add user authentication" (too complex)
- "Connect to my database" (security risk)

## 🔒 Security Boundaries

NEVER allow edits that:
- Add external scripts
- Include eval() or Function()
- Make external API calls to unknown endpoints
- Add tracking/analytics without permission
- Modify authentication beyond styling
- Access local storage of other apps

## 🚀 Deployment

### Manual Testing
```bash
# Test single edit
node process-edits.js --test --app-slug my-app --request "make it blue"

# Dry run (no DB changes)
node monitor.js --dry-run
```

### Production
```bash
# Run once
node monitor.js

# Enable cron (later)
# */5 * * * * /usr/local/bin/node /path/to/monitor.js
```

## 📊 Monitoring

Check edit success rate:
```sql
SELECT 
  status, 
  COUNT(*) 
FROM wtaf_edit_requests 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

## 🎯 Success Metrics

- Edit success rate > 80%
- No data loss incidents
- User satisfaction (successful edits)
- Average processing time < 30 seconds

---

Remember: **Preservation over Innovation** - It's better to make small, safe edits than risk breaking a user's creation.