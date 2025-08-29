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

