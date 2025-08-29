# Agent Issue Tracker - Critical Rules for Claude Code

## 🚨 CRITICAL: WebtoysOS v3 Authentication System 🚨

**IMPORTANT**: When creating apps that need user authentication, see `AUTH-DOCUMENTATION.md` for complete details on how the desktop broadcasts auth to apps via postMessage.

Quick summary:
- Desktop handles all login/logout
- Apps receive auth via `TOYBOX_AUTH` postMessage
- User object contains `handle` and `participantId`
- Apps should NEVER create their own login forms

## 🚨 CRITICAL: CRON COMPATIBILITY FIXES 🚨

**STOP! READ THIS FIRST BEFORE MAKING ANY CHANGES!**

The agent-issue-tracker has specific requirements for cron compatibility that MUST be preserved:

### ⚠️ NEVER REMOVE THESE CRITICAL LINES ⚠️

1. **In monitor.js** - MUST have at the start of the `monitor()` function:
```javascript
// CRITICAL: Change to script directory - MUST be first line for cron compatibility
process.chdir(__dirname);
```

2. **In reformulate-issues.js and fix-issues.js** - MUST use full path to claude:
```javascript
// Use full path: /Users/bartdecrem/.local/bin/claude
// NOT just: claude
```

### 🔴 WHY THIS KEEPS BREAKING 🔴

**The auto-fix agent switches git branches**, which can discard uncommitted changes to these files! 
- When fix-issues.js runs `git checkout` to create branches, it loses uncommitted changes
- This causes the fixes to disappear every 2 minutes when cron runs
- **ALWAYS COMMIT THESE CRITICAL FIXES** before the cron runs again

### ✅ HOW TO FIX IF BROKEN AGAIN

```bash
# 1. Add process.chdir(__dirname) to monitor.js
# 2. Use full claude path in reformulate-issues.js and fix-issues.js  
# 3. IMMEDIATELY COMMIT:
git add monitor.js reformulate-issues.js fix-issues.js CLAUDE.md
git commit -m "fix: Restore critical cron compatibility fixes"
git push origin main  # Push to main so agent machine gets the fixes
```

## 🛑 CRITICAL: Branch Switching and Data Loss Prevention

### The Problem
The auto-fix agent (`fix-issues.js`) creates new Git branches for each issue it fixes:
- **Bug/Feature/Enhancement** issues → Creates `auto-fix/issue-XXX-*` branch
- This **DESTROYS UNCOMMITTED WORK** when it switches branches
- You lose all changes that weren't committed
- This happens automatically every 2 minutes if cron is running!

### Branch Protection for Safe Categories
These categories **DO NOT** switch branches (safe for uncommitted work):
- **plan** - Creates implementation plans
- **research** - Researches codebase questions  
- **question** - Answers technical questions

These stay on the current branch because they create documentation, not code changes.

### The STOP-AUTOFIX.txt Solution

**To protect your work while coding:**

1. **Create STOP-AUTOFIX.txt** in the agent-issue-tracker folder:
```bash
echo "AUTOFIX IS DISABLED" > STOP-AUTOFIX.txt
```

2. **When this file exists:**
- fix-issues.js checks for it at startup
- If found, exits immediately with "⛔ AUTOFIX IS DISABLED"
- NO branch switching occurs
- Your uncommitted work is safe

3. **To temporarily enable for testing:**
```bash
# Method 1: Rename (recommended)
mv STOP-AUTOFIX.txt STOP-AUTOFIX.txt.backup
node fix-issues.js
mv STOP-AUTOFIX.txt.backup STOP-AUTOFIX.txt

# Method 2: Delete and recreate
rm STOP-AUTOFIX.txt
node fix-issues.js
echo "AUTOFIX IS DISABLED" > STOP-AUTOFIX.txt
```

4. **Safe testing with commits:**
```bash
# This commits your work first, making it safe
git add -A && git commit -m "WIP: Save work before testing" && \
rm STOP-AUTOFIX.txt && \
node reformulate-issues.js && node fix-issues.js; \
git checkout WEDpm && \
echo "AUTOFIX IS DISABLED" > STOP-AUTOFIX.txt
```

### Best Practices
- **While actively developing**: Keep STOP-AUTOFIX.txt present
- **Before testing**: Either commit your work OR ensure it's a plan/research/question
- **After testing**: Restore STOP-AUTOFIX.txt immediately
- **On agent machines**: Never use STOP-AUTOFIX.txt (let it run freely)

## Project Overview

This is an automated issue tracking and fixing system that:
1. **Reformulates** user-submitted issues using Claude AI
2. **Auto-fixes** high-confidence issues using Claude Code
3. **Creates PRs** automatically for fixed issues
4. Runs every 2 minutes via cron on a dedicated machine

## Recommended Workflow

### Two-Machine Setup (RECOMMENDED)
1. **Development Machine**: Where you write and test code
   - Work on any branch
   - Push changes to GitHub
   - Review and merge PRs
   
2. **Agent Machine**: Dedicated to running the agent
   - Runs from `main` branch only
   - Pulls latest changes automatically
   - No manual code editing
   - Cron runs every 2 minutes

### How Code Flows
```
Dev Machine → GitHub → Agent Machine → GitHub PRs → Dev Machine (review)
```

### Single Machine Setup (NOT RECOMMENDED)
If you must use one machine:
1. Clone to separate directories:
   - `/path/to/vibeceo-dev` - for development
   - `/path/to/vibeceo-agent` - for agent only
2. OR disable cron while developing:
   ```bash
   crontab -r  # Remove cron
   # ... do your work ...
   crontab ~/crontab-backup.txt  # Restore
   ```

## How The Agent Works

### 1. Issue Collection
- Users submit issues via the ZAD app at `webtoys.ai/webtoys-issue-tracker`
- Issues are stored in `wtaf_zero_admin_collaborative` table with status `new`

### 2. Reformulation Pipeline (reformulate-issues.js)
- Loads all `new` status issues
- Sends each to Claude with Ash.tag personality to:
  - Clarify vague requests into actionable tasks
  - Generate acceptance criteria
  - Identify affected components
  - Categorize (bug/feature/enhancement/docs)
  - Assess confidence level (low/medium/high)
  - Filter out test/joke/offensive submissions
- Updates issue status to `reformulated` (or `closed`/`wontfix` if inappropriate)

### 3. Auto-Fix Pipeline (fix-issues.js)
- Only processes `high` confidence reformulated issues
- For each issue:
  - Creates a new git branch `auto-fix/issue-{id}-{slug}`
  - Generates a detailed fix prompt with issue context
  - Calls Claude Code with `--dangerously-skip-permissions` to implement the fix
  - Runs tests to verify the fix works
  - Commits changes with descriptive message
  - Updates issue status to `fixed` with branch info

### 4. PR Creation Pipeline (create-prs.js)
- Finds all `fixed` status issues with branches
- For each fixed issue:
  - Pushes the branch to GitHub
  - Creates a PR with:
    - Title from reformulated issue
    - Body with acceptance criteria and test results
    - Label "auto-generated"
  - Updates issue status to `pr-created` with PR URL

### 5. Issue Statuses
- `new` → Just submitted by user
- `reformulated` → Clarified by AI, ready for fixing
- `admin_discussion` → Admin and agent are discussing the issue
- `needs_info` → Low confidence, needs human review
- `closed` → Test/joke submission
- `wontfix` → Offensive or inappropriate
- `fixing` → Currently being fixed
- `fixed` → Fix implemented and committed
- `fix-failed` → Auto-fix attempted but failed
- `pr-created` → PR has been created
- `merged` → PR has been merged (manual update)

## Architecture

- **monitor.js** - Main orchestrator, runs the pipeline
- **reformulate-issues.js** - Uses Claude to clarify and categorize issues
- **fix-issues.js** - Uses Claude Code to implement fixes
- **create-prs.js** - Creates GitHub PRs for fixes
- **deploy-issue-tracker.js** - Deploys the ZAD app for issue submission

## Environment Requirements

```bash
# Required environment variables (set in ../.env.local)
SUPABASE_URL=your_url
SUPABASE_SERVICE_KEY=your_key
ISSUE_TRACKER_APP_ID=webtoys-issue-tracker

# Required for cron (set in crontab)
HOME=/Users/bartdecrem
GH_TOKEN=your_github_token
GITHUB_TOKEN=your_github_token
ENABLE_AUTO_FIX=true
PROJECT_ROOT=/Users/bartdecrem/Documents/code/vibeceo8/sms-bot
```

## Cron Setup

The system runs via cron every 2 minutes:
```bash
*/2 * * * * HOME=/Users/bartdecrem GH_TOKEN=xxx GITHUB_TOKEN=xxx ENABLE_AUTO_FIX=true PROJECT_ROOT=/Users/bartdecrem/Documents/code/vibeceo8/sms-bot /usr/local/bin/node /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/agent-issue-tracker/monitor.js >> /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/agent-issue-tracker/monitor.log 2>&1
```

## Common Issues

### Issue: Changes keep disappearing
**Cause**: The fix-issues.js switches git branches, losing uncommitted changes
**Solution**: Always commit changes before the next cron run

### Issue: "claude: command not found" 
**Cause**: Cron doesn't have PATH set
**Solution**: Use full path `/Users/bartdecrem/.local/bin/claude`

### Issue: "fatal: not a git repository"
**Cause**: Script running from wrong directory
**Solution**: Add `process.chdir(__dirname)` to monitor.js

### Issue: GitHub authentication fails
**Cause**: Cron can't access macOS keychain
**Solution**: Add GH_TOKEN and GITHUB_TOKEN to crontab

## Testing

```bash
# Test reformulation only
ENABLE_AUTO_FIX=true node monitor.js --reformulate

# Test full pipeline
ENABLE_AUTO_FIX=true node monitor.js --all

# Check logs
tail -f monitor.log
```

## Superpower Mode (Admin Features)

### Overview
The issue tracker has a **Superpower Mode** for admins to manage issues directly from the web interface. Access it by adding `?superpower=true` to the URL.

### Features
1. **Comment System** - Add admin comments visible to all users
2. **Hide/Unhide Issues** - Hide inappropriate issues from regular viewers
3. **Status Management** - Change issue status directly
4. **Priority Setting** - Set issue priority (low/medium/high/critical)
5. **Delete Issues** - Permanently remove issues

### Admin-Agent Conversation System
When admins reopen issues or add comments, the agent provides detailed responses:

1. **Triggering Conversations**:
   - Add a comment to a low-confidence issue
   - Change status to `admin_discussion` or `new` after agent processing
   - Agent responds within 2 minutes with detailed analysis

2. **Agent Responses Include**:
   - **Technical Blockers** - Specific reasons why confidence is low
   - **Clarifying Questions** - What information is needed
   - **Suggestions** - How to improve the issue description
   - **Next Steps** - Clear path forward

3. **Conversation Flow**:
   - Admin adds comment → Sets `trigger_conversation` flag
   - Agent detects flag → Generates detailed response
   - Response stored in `agent_response` field
   - Admin can continue conversation by adding more comments

### Implementation Details

**Frontend (issue-tracker-zad-app.html)**:
- Superpower controls only visible when authenticated
- Comments persist in `admin_comments` array
- Agent responses display with purple gradient styling
- Hidden issues filtered for regular viewers

**Backend (reformulate-issues.js)**:
- `isAdminReopenedIssue()` - Detects admin interventions
- `generateConversationalResponse()` - Creates detailed AI responses
- Processes admin-reopened issues with priority
- Clears `trigger_conversation` flag after processing

**API Endpoints**:
- `/api/wtaf/issue-tracker-admin` - Direct admin actions (no auth)
- `/api/wtaf/issue-tracker` - Authenticated superpower actions

### Testing Superpower Mode
```bash
# For local development, set auth in localStorage:
localStorage.setItem('webtoysAuthToken', 'Bearer your-token');
localStorage.setItem('webtoysApiUrl', 'https://webtoys.ai');

# Access superpower mode:
https://webtoys.ai/bart/issue-tracker?superpower=true
```

## NEVER FORGET

**This system runs every 2 minutes and switches git branches!**
- Commit your changes or they will be lost
- The cron fixes are critical - don't remove them
- Test locally before letting cron take over
- Push fixes to main branch so agent machines get them
- Admin comments trigger agent conversations automatically