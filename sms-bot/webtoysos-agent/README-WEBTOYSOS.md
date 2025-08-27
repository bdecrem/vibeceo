# WebtoysOS Fixit Board Agent

**Separate automated issue tracking agent specifically for WebtoysOS Fixit Board**

## App Configuration

- **App ID**: `5b98f08a-60c7-48cd-bd1c-fb4bad3615ae`
- **URL**: https://webtoys.ai/public/webtoysos-issue-tracker
- **App Name**: WebtoysOS Fixit Board (previously WebtoysOS Issue Tracker)

## Differences from Main Issue Tracker

This is a **completely separate agent** from the main WEBTOYS Issue Tracker:

| Feature | Main Agent | WebtoysOS Agent |
|---------|------------|-----------------|
| **App ID** | `83218c2e-281e-4265-a95f-1d3f763870d4` | `5b98f08a-60c7-48cd-bd1c-fb4bad3615ae` |
| **URL** | `/bart/issue-tracker` | `/public/webtoysos-issue-tracker` |
| **Cron Schedule** | Every 2 minutes | Every 3 minutes (offset) |
| **Directory** | `agent-issue-tracker/` | `webtoysos-agent/` |
| **Focus** | General WEBTOYS issues | WebtoysOS-specific issues |

## Quick Start

1. **Test the agent**:
   ```bash
   cd webtoysos-agent
   ISSUE_TRACKER_APP_ID=5b98f08a-60c7-48cd-bd1c-fb4bad3615ae node monitor.js --help
   ```

2. **Run reformulation only** (safe test):
   ```bash
   ISSUE_TRACKER_APP_ID=5b98f08a-60c7-48cd-bd1c-fb4bad3615ae node monitor.js --reformulate
   ```

3. **Full pipeline** (with auto-fix):
   ```bash
   ENABLE_AUTO_FIX=true ISSUE_TRACKER_APP_ID=5b98f08a-60c7-48cd-bd1c-fb4bad3615ae node monitor.js --all
   ```

## Cron Setup

**Install the cron job**:
```bash
./setup-webtoysos-cron.sh
```

This will:
- Run every 3 minutes (offset from main agent)
- Set correct environment variables
- Use the WebtoysOS app ID automatically
- Log to `webtoysos-agent/monitor.log`

## Critical Compatibility Notes

⚠️ **This agent preserves all critical cron compatibility fixes from the original**:

1. **monitor.js** has `process.chdir(__dirname)` at start
2. **reformulate-issues.js** uses full Claude path: `/Users/bartdecrem/.local/bin/claude`
3. **All critical git branch handling** is preserved

## Environment Variables

The agent requires these environment variables (set automatically by cron):

```bash
ISSUE_TRACKER_APP_ID=5b98f08a-60c7-48cd-bd1c-fb4bad3615ae
ENABLE_AUTO_FIX=true
GH_TOKEN=<github-token>
GITHUB_TOKEN=<github-token>
```

## Architecture

```
webtoysos-agent/
├── monitor.js              # Main orchestrator
├── reformulate-issues.js   # Issue analysis (Ash.tag)
├── fix-issues.js          # Auto-fixing with Claude Code
├── create-prs.js          # GitHub PR creation
├── config.json            # App-specific settings
├── setup-webtoysos-cron.sh # Cron installation
└── monitor.log            # Execution logs
```

## Monitoring

**Check logs**:
```bash
tail -f webtoysos-agent/monitor.log
```

**View cron jobs**:
```bash
crontab -l | grep webtoysos
```

**Check app status**:
Visit: https://webtoys.ai/public/webtoysos-issue-tracker

## Key Features

- **Ash.tag Integration**: AI-powered issue reformulation
- **Auto-fixing**: Claude Code integration for code fixes  
- **GitHub PRs**: Automatic pull request creation
- **Support Detection**: Handles user support questions
- **Offset Scheduling**: Prevents conflicts with main agent
- **Branch Protection**: Safe git operations

## Important Notes

1. **Completely Independent**: This agent operates separately from the main WEBTOYS issue tracker
2. **Shared Codebase**: Uses the same core logic but different configuration
3. **Offset Timing**: 3-minute schedule prevents conflicts with main agent (2-minute)
4. **Same GitHub Tokens**: Uses same authentication but different app data
5. **Dedicated Logs**: Separate log file for easier monitoring

## Troubleshooting

If the agent stops working:

1. **Check cron**: `crontab -l`
2. **Check logs**: `tail -20 webtoysos-agent/monitor.log`
3. **Test manually**: Run the test commands above
4. **Verify app ID**: Ensure `5b98f08a-60c7-48cd-bd1c-fb4bad3615ae` is correct
5. **Check app URL**: Visit https://webtoys.ai/public/webtoysos-issue-tracker

## Security

- Uses same GitHub authentication as main agent
- Separate app ID prevents data cross-contamination  
- Offset scheduling reduces system load
- Same security practices as main agent