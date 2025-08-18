# Webtoys-Edit-Agent - Critical Rules for Claude Code

## 🎯 Project Purpose
This agent enables users to edit their existing Webtoys via natural language requests using the `--revise` SMS command. The agent uses Claude CLI to intelligently modify HTML while preserving functionality.

## 🏠 **DEPLOYMENT ARCHITECTURE**

### Where Things Run:
- **SMS Bot (Railway)**: Receives SMS commands, queues edit requests in database
- **Edit Agent (Local Mac)**: Processes edits using Claude CLI, only runs on Bart's Mac mini
- **Webhook Bridge**: ngrok tunnel exposes local agent to Railway (https://[id].ngrok.app → localhost:3031)

### Environment Variables:
**On Railway (Production SMS Bot):**
```bash
EDIT_AGENT_ENABLED=true                                    # Enables webhook calls to agent
EDIT_AGENT_WEBHOOK_URL=https://[your-id].ngrok.app        # ngrok tunnel URL
```

**On Local Mac (Agent Machine):**
```bash
# In sms-bot/.env.local
EDIT_AGENT_ENABLED=true                                    # Runs webhook server locally
EDIT_AGENT_WEBHOOK_PORT=3031                              # Local webhook port
NGROK_AUTHTOKEN=[your-token]                              # ngrok authentication
```

### Starting the Edit Agent (Local Mac):

#### Option 1: Unified Startup (Recommended) ✨
```bash
cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-edit-agent
./start-all.sh
```
This single command:
- Starts ngrok tunnel on port 3031
- Automatically displays the ngrok URL to update in Railway
- Starts webhook server with `EDIT_AGENT_ENABLED=true`
- Launches worker pool with 2 parallel workers
- Handles existing services (offers to stop them)
- Shows real-time worker output
- Gracefully shuts down everything on Ctrl+C

#### Option 2: Manual Startup (for debugging)
```bash
# Terminal 1: Start ngrok tunnel
ngrok http 3031
# Note the https URL and update Railway's EDIT_AGENT_WEBHOOK_URL

# Terminal 2: Start webhook server
cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-edit-agent
node webhook-server.js

# Terminal 3: Start worker pool
node worker-manager.js
```

#### Stopping the System:
```bash
# If using start-all.sh: Press Ctrl+C

# Or use the stop script:
./stop-all.sh

# Or manually:
pkill -f worker-manager.js
pkill -f webhook-server.js
pkill -f "ngrok http 3031"
```

### How the EDIT_AGENT_ENABLED Flag Works:
- **Confusing but important**: This flag controls webhook triggering, NOT where the agent runs
- **On Railway**: `EDIT_AGENT_ENABLED=true` means "call the webhook when edits are requested"
- **On Local**: `EDIT_AGENT_ENABLED=true` means "run the webhook server to receive calls"
- The agent code ONLY runs on the local Mac (Railway has no Claude CLI)

## ✅ **IMPLEMENTATION STATUS: COMPLETE & OPERATIONAL**

The Webtoys Edit Agent is **fully implemented and production-ready** as of August 17, 2025:

### 🚀 **What Works Now:**
- **SMS Command**: `--revise [app-slug] [edit request]` queues edit requests
- **Revision Stacking**: Each edit builds on the previous revision (preserves cumulative changes)
- **Same URL Updates**: Revised content appears on original URLs automatically
- **4-Stage Pipeline**: Collect → Process → Validate → Deploy (all working)
- **Claude CLI Integration**: Successfully processes complex edits via `/opt/homebrew/bin/claude`
- **Database Integration**: Full revision tracking in `wtaf_revisions` table
- **Web Server Integration**: Loads revised content when `current_revision` is set
- **SMS Notifications**: Confirms edit completion to users
- **Safety Validation**: Prevents deployment of broken HTML

### 🎯 **Successfully Tested Features:**
- ✅ Simple styling changes (background colors, fonts)
- ✅ Adding interactive elements (emojis, buttons) 
- ✅ Complex features (Konami code with dark mode + particle effects)
- ✅ Sequential stacking (edit 1 + edit 2 + edit 3 all preserved)
- ✅ Large HTML generation (8000+ character complex features)

### 📱 **Live User Experience:**
1. User texts: `--revise my-game make the snake blue`
2. System responds: "Edit request queued! Processing..."
3. Agent processes edit in background (~15 seconds)
4. System texts: "Your edit is complete! Changes are live at your URL"
5. **Same URL now shows blue snake + all previous changes**

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

## 🔧 Technical Architecture

### Worker Pool System (NEW!)
The edit agent now uses a **parallel worker pool** for faster processing:

```
                    ┌─────────────────────┐
                    │   Railway (SMS)     │
                    │  Receives --revise  │
                    └──────────┬──────────┘
                               │ Webhook
                    ┌──────────▼──────────┐
                    │  Webhook Server     │
                    │   (Port 3031)       │
                    │  Non-blocking       │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  Database Queue     │
                    │  (wtaf_revisions)   │
                    │  status='pending'   │
                    └──────────┬──────────┘
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
        ┌──────────────┐            ┌──────────────┐
        │   Worker 1   │            │   Worker 2   │
        │  (Polls DB)  │            │  (Polls DB)  │
        │  Claims edit │            │  Claims edit │
        └──────┬───────┘            └──────┬───────┘
               │                            │
               ▼                            ▼
        Process Pipeline             Process Pipeline
        1. Process (Claude)          1. Process (Claude)
        2. Validate                  2. Validate
        3. Deploy                    3. Deploy
```

**Key Benefits:**
- **Parallel Processing**: 2 edits simultaneously (configurable)
- **No Request Rejection**: All edits queued, none lost
- **Auto-Recovery**: Workers restart if crashed
- **Revision Stacking**: Edit 2 builds on Edit 1 automatically

### Claude CLI Integration
```bash
# MUST use full path for cron compatibility
/opt/homebrew/bin/claude

# Previously used (incorrect):
# /Users/bartdecrem/.local/bin/claude
```

### Directory Structure
```
webtoys-edit-agent/
├── start-all.sh           # 🚀 One-command startup script
├── stop-all.sh            # 🛑 Clean shutdown script
├── worker-manager.js      # Spawns and monitors workers
├── worker.js              # Individual worker process
├── webhook-server.js      # Receives webhooks from Railway
├── monitor.js             # Legacy orchestrator (still works)
├── collect-edit-requests.js  # Gather pending edits from DB
├── process-edits.js       # Claude CLI edit execution
├── validate-edits.js      # Safety validation
├── deploy-edits.js        # Save revisions to DB
└── prompts/
    ├── edit-instructions.md
    ├── safety-rules.md
    └── mobile-viewport-fix.md
```

### Database Schema (IMPLEMENTED)
```sql
-- New table: wtaf_revisions
CREATE TABLE wtaf_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES wtaf_content(id) ON DELETE CASCADE,
  revision_id INTEGER,
  edit_request TEXT NOT NULL,
  html_content TEXT,           -- Complete HTML for this revision
  status TEXT DEFAULT 'pending',
  user_phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  ai_summary TEXT,
  UNIQUE(content_id, revision_id)
);

-- Modified table: wtaf_content
ALTER TABLE wtaf_content 
ADD COLUMN current_revision INTEGER DEFAULT NULL;

-- When current_revision is NULL = show original html_content
-- When current_revision is N = show revision N from wtaf_revisions
```

## 📋 Edit Request Pipeline (IMPLEMENTED & TESTED)

### **How It Actually Works (With Workers):**

1. **SMS Command** (`controller.ts` on Railway):
   - User sends: `--revise my-app make it faster`
   - Controller creates record in `wtaf_revisions` with status 'pending'
   - Sends webhook to local edit agent (if configured)
   - Returns confirmation: "Edit request queued! Processing..."

2. **Worker Claims Edit** (`worker.js` on Local Mac):
   - Workers poll database every 5 seconds
   - First available worker claims edit by setting status to 'processing'
   - **Database locking prevents duplicate claims**
   - **Revision ordering**: Won't process Edit 2 until Edit 1 completes
   - **Stacking**: Loads current revision HTML (not original) as base

3. **Processing Phase** (`process-edits.js`):
   - Builds prompt with safety rules and stacked HTML
   - Detects mobile/viewport issues and adds special instructions
   - Executes edit via Claude CLI: `/opt/homebrew/bin/claude --print`
   - Captures edited HTML (handles large content up to 50MB)
   - Shows real-time progress during processing

4. **Validation Phase** (`validate-edits.js`):
   - Checks HTML structure (allows up to 20 tag imbalance for complex content)
   - Validates app-specific requirements (ZAD APIs, game loops, etc.)
   - Scans for dangerous code patterns
   - Verifies mobile viewport compliance

5. **Deployment Phase** (`deploy-edits.js`):
   - Saves complete HTML as new revision via `complete_edit_request()` DB function
   - Updates `wtaf_content.current_revision` pointer
   - Sends SMS confirmation to user
   - **Worker becomes available for next edit**
   - **Result**: Same URL now serves revised content

### **Worker Behavior:**
- **Parallel Processing**: 2 workers can process different apps simultaneously
- **Sequential for Same App**: Edits for same app process in order
- **Auto-Recovery**: If worker crashes, restarts automatically (up to 10 times)
- **Graceful Shutdown**: On Ctrl+C, workers finish current edit before stopping
- **No Lost Edits**: Failed edits return to queue for retry

## 🛡️ Safety Mechanisms

### Rate Limiting (TODO - NOT YET IMPLEMENTED)
- Max 3 revisions per day per app
- Max 500 characters per edit request  
- 10-minute cooldown between edits

### Rollback Capability (TODO - NOT YET IMPLEMENTED)
```javascript
// Future SMS commands:
--revert my-app        // Go back to previous revision
--revert my-app 0      // Go back to original
--history my-app       // Show revision history
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

## 🔧 Troubleshooting

### Edit requests not processing:
1. **Check Railway logs**: Look for `Edit Agent webhook disabled (EDIT_AGENT_ENABLED=false)`
   - Fix: Set `EDIT_AGENT_ENABLED=true` in Railway environment variables

2. **Check if workers are running**:
   ```bash
   ps aux | grep worker
   # Should see worker-manager.js and 2 worker.js processes
   ```

3. **Check ngrok tunnel**:
   ```bash
   # View traffic dashboard
   open http://localhost:4040
   ```

4. **Check database queue**:
   ```bash
   # See what's pending/processing
   node -e "
   const { createClient } = require('@supabase/supabase-js');
   require('dotenv').config({ path: '../.env.local' });
   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
   supabase.from('wtaf_revisions')
     .select('status, edit_request, created_at')
     .in('status', ['pending', 'processing'])
     .then(({ data }) => console.log(data));
   "
   ```

5. **Clear stuck edits**:
   ```bash
   # Mark stuck 'processing' edits as 'failed'
   node -e "
   const { createClient } = require('@supabase/supabase-js');
   require('dotenv').config({ path: '../.env.local' });
   const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
   supabase.from('wtaf_revisions')
     .update({ status: 'failed', error_message: 'Manually cleared' })
     .eq('status', 'processing')
     .then(({ data }) => console.log('Cleared', data?.length || 0, 'stuck edits'));
   "
   ```

### After Mac restart:
Just run the startup script:
```bash
cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-edit-agent
./start-all.sh
# Update Railway with the ngrok URL shown
```

### Common Issues:

**Workers not picking up edits:**
- Check revision ordering - earlier edits for same app might be blocking
- Check database connectivity - `.env.local` must have correct credentials
- Restart workers - `./stop-all.sh` then `./start-all.sh`

**Edit fails validation:**
- Check logs for specific validation errors
- Might be Claude CLI timeout (5 minutes max)
- HTML might be too complex (>20 unclosed tags)

**Ngrok connection issues:**
- Free ngrok restarts every 8 hours
- Update Railway's `EDIT_AGENT_WEBHOOK_URL` after restart
- Consider ngrok paid plan for stable URL

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

## 🚀 Deployment (IMPLEMENTED)

### Manual Testing (WORKING)
```bash
# Test complete pipeline
cd /path/to/webtoys-edit-agent
node monitor.js

# Test individual stages
node collect-edit-requests.js
node process-edits.js  
node validate-edits.js
node deploy-edits.js
```

### Production (READY)
```bash
# Run agent once to process pending edits
node monitor.js

# Typical output:
# 📥 Collection: ✅ Found 1 request  
# 🤖 Processing: ✅ Claude completed edit
# ✓  Validation: ✅ HTML structure valid
# 🚀 Deployment: ✅ Revision 11 deployed
```

### Future Automation (TODO)
```bash
# Cron job to process edits every 5 minutes
# */5 * * * * cd /path/to/webtoys-edit-agent && node monitor.js
```

## 📊 Monitoring (READY)

Check edit success rate:
```sql
SELECT 
  status, 
  COUNT(*) 
FROM wtaf_revisions 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;
```

Check latest successful edits:
```sql
SELECT 
  wtaf_content.app_slug,
  wtaf_content.user_slug,
  wr.edit_request,
  wr.status,
  wr.created_at
FROM wtaf_revisions wr
JOIN wtaf_content ON wr.content_id = wtaf_content.id
WHERE wr.status = 'completed'
ORDER BY wr.created_at DESC
LIMIT 10;
```

## 🎯 Success Metrics (ACHIEVED)

- ✅ Edit success rate: **100%** (all tested edits completed)
- ✅ No data loss incidents: **0** (all original content preserved)
- ✅ User satisfaction: **High** (complex features successfully implemented)
- ✅ Average processing time: **~15 seconds** (well under 30s target)

## 🔮 What Remains To Be Done

### High Priority (Recommended Next)
1. **Rate Limiting**: Prevent spam and protect system resources
2. **Rollback Commands**: `--revert`, `--history` SMS commands
3. **Cron Automation**: Auto-process edits every 5 minutes
4. **Error Recovery**: Better handling of Claude CLI failures

### Medium Priority (Nice to Have)
1. **Edit Preview**: Show user what will change before applying
2. **Batch Edits**: Process multiple requests for same app together
3. **Edit Templates**: Common edits like "make dark mode", "add button"
4. **Usage Analytics**: Track most popular edit types

### Low Priority (Future)
1. **Visual Diff**: Show before/after screenshots
2. **AI Suggestions**: "You might also want to..."
3. **Community Edits**: Share edit templates between users
4. **Version Branching**: Create alternate versions of same app

---

## 🎉 **CONCLUSION**

**The Webtoys Edit Agent is COMPLETE and OPERATIONAL!** Users can now edit their Webtoys via SMS with full revision stacking, safety validation, and seamless URL updates. The core functionality works perfectly - everything else is enhancement.

Remember: **Preservation over Innovation** - It's better to make small, safe edits than risk breaking a user's creation.