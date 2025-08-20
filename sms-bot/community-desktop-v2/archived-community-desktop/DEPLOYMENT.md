# WEBTOYS Issue Tracker Agent - Deployment Guide

## Overview
This system enables automated issue tracking, reformulation, fixing, and PR creation for the WEBTOYS platform.

## Architecture Components

1. **Public ZAD App** (`issue-tracker-zad-app.html`)
   - Public-facing issue submission form
   - Stores issues in `wtaf_zero_admin_collaborative` table
   - Available at: `webtoys.me/[user]/issue-tracker`

2. **Reformulation Agent** (`reformulate-issues.js`)
   - Reads raw user submissions
   - Uses Claude to reformulate into actionable tickets
   - Categorizes and assigns confidence levels

3. **Auto-Fix Agent** (`fix-issues.js`)
   - Processes high-confidence issues
   - Creates feature branches
   - Implements fixes using Claude Code
   - Runs tests to verify changes

4. **PR Creation Agent** (`create-prs.js`)
   - Creates GitHub pull requests
   - Adds appropriate labels
   - Links back to original issue

5. **Monitor** (`monitor.js`)
   - Orchestrates the entire pipeline
   - Can run individual agents or full pipeline

## Deployment Steps

### 1. Deploy the ZAD App

Option A: Create new app via SMS:
```
Text to WEBTOYS: "Create an issue tracker app using the HTML from agent-issue-tracker/issue-tracker-zad-app.html"
```

Option B: Update existing app (like turquoise-rabbit-exploring):
```
Text to WEBTOYS: "--remix turquoise-rabbit-exploring use the HTML from agent-issue-tracker/issue-tracker-zad-app.html"
```

### 2. Configure Environment

Add to your `.env.local` file:
```bash
ISSUE_TRACKER_APP_ID=turquoise-rabbit-exploring  # Or your app's ID
PROJECT_ROOT=/path/to/your/project
ENABLE_AUTO_FIX=false  # Set to true when ready
AUTO_STASH=true
STRICT_GIT=false
```

### 3. Run Setup Script

```bash
cd agent-issue-tracker
./setup.sh
```

This will:
- Verify environment variables
- Check GitHub CLI authentication
- Create test scripts
- Set up logging

### 4. Test the System

Test reformulation only (safe):
```bash
./test-run.sh
```

Test full pipeline (dry run):
```bash
ENABLE_AUTO_FIX=false node monitor.js
```

### 5. Set Up Cron Job (Production)

Add to crontab (`crontab -e`):
```bash
# Run full pipeline every 3 minutes (includes reformulation, fix, and PR creation)
*/3 * * * * HOME=/Users/bartdecrem GH_TOKEN=your_github_token GITHUB_TOKEN=your_github_token ENABLE_AUTO_FIX=true PROJECT_ROOT=/Users/bartdecrem/Documents/code/vibeceo8/sms-bot /usr/local/bin/node /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/agent-issue-tracker/monitor.js >> /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/agent-issue-tracker/monitor.log 2>&1
```

**Important Environment Variables for Cron:**
- `HOME`: Required for proper shell environment
- `GH_TOKEN` and `GITHUB_TOKEN`: Required for GitHub CLI authentication (get from `gh auth token`)
- `ENABLE_AUTO_FIX`: Set to `true` to enable automatic fixing
- `PROJECT_ROOT`: Path to the sms-bot directory

**Note:** Use full paths for all executables (`/usr/local/bin/node`) as cron has minimal PATH

### 6. Manual Operation

Run specific agents:
```bash
# Just reformulate new issues
node monitor.js --reformulate

# Just attempt fixes
node monitor.js --fix

# Just create PRs
node monitor.js --pr

# Run everything
ENABLE_AUTO_FIX=true node monitor.js --all
```

## Safety Features

1. **Confidence Levels**: Only high-confidence issues are auto-fixed
2. **Branch Isolation**: Each fix gets its own branch
3. **Test Verification**: Tests must pass before PR creation
4. **Human Review**: All PRs require manual review before merging
5. **Rollback**: Failed fixes don't affect main branch

## Monitoring

Check logs:
```bash
tail -f logs/monitor.log
tail -f logs/reformulate.log
```

View open PRs:
```bash
gh pr list --label "auto-generated"
```

Check issue status in database:
```sql
SELECT 
    content_data->>'status' as status,
    content_data->>'confidence' as confidence,
    COUNT(*) 
FROM wtaf_zero_admin_collaborative 
WHERE app_id = 'turquoise-rabbit-exploring' 
GROUP BY status, confidence;
```

## Customization

### Adjust Confidence Threshold
Edit `config.json`:
```json
{
  "settings": {
    "confidence_threshold": "medium"  // or "high", "low"
  }
}
```

### Change Processing Frequency
Edit cron schedule or adjust in `config.json`:
```json
{
  "schedule": {
    "reformulate": "0 */2 * * *",  // Every 2 hours
    "fix": "0 */6 * * *",          // Every 6 hours
    "pr": "0 */6 * * *"            // Every 6 hours
  }
}
```

### Add Custom Categories
Edit `config.json`:
```json
{
  "categories": [
    "bug",
    "feature",
    "enhancement",
    "performance",
    "security",
    "your-custom-category"
  ]
}
```

## Troubleshooting

### Issues not being processed
- Check that issues have `status: 'new'` in the database
- Verify `ISSUE_TRACKER_APP_ID` matches your app
- Check logs for errors

### Auto-fix failing
- Ensure Claude Code CLI is installed and working
- Check git is in clean state
- Verify tests are passing on main branch

### PRs not being created
- Ensure `gh` CLI is authenticated: `gh auth status`
- Check that branches are being pushed: `git branch -r`
- Verify GitHub permissions

## Security Notes

- Keep `SUPABASE_SERVICE_KEY` secure
- Review all PRs before merging
- Consider rate limiting public issue submission
- Monitor for spam/abuse in issue submissions

## Future Enhancements

- [ ] Add issue deduplication
- [ ] Implement voting system for prioritization
- [ ] Add email notifications for issue status
- [ ] Create dashboard for issue statistics
- [ ] Add support for issue comments/discussion
- [ ] Implement automatic issue closing for merged PRs