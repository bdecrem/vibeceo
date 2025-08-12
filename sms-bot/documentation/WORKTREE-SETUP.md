# Git Worktree Development Setup

## Quick Start

### Create and Start a New Worktree
```bash
cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/scripts/worktree
./start-tmux-worktree.sh <worktree-id> <branch-name>

# Example:
./start-tmux-worktree.sh 2 my-feature
```

### Attach to Running Worktree
```bash
tmux attach -t wtaf-<worktree-id>

# Example for worktree 2:
tmux attach -t wtaf-2
```

### Stop and Clean Up a Worktree
```bash
cd /Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/scripts/worktree
./cleanup-worktree.sh <worktree-id>

# Example:
./cleanup-worktree.sh 2
```

## Available Worktree Slots

| Worktree ID | SMS Port | Web Port | Tmux Session |
|------------|----------|----------|--------------|
| 1          | 3030     | 3000     | wtaf-1       |
| 2          | 3031     | 3001     | wtaf-2       |
| 3          | 3032     | 3002     | wtaf-3       |

## What Gets Created

When you start a worktree, the system:
1. Creates a new git worktree at `/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8-worktrees/worktree-<id>-<branch>`
2. Copies environment variables from the main repo
3. Builds the SMS bot and web app
4. Starts a tmux session with 4 panes:
   - **Top-left:** SMS Bot
   - **Top-right:** Engine (file watcher)
   - **Bottom-left:** Web Server (Next.js)
   - **Bottom-right:** Dev Reroute (for testing)

## Tmux Navigation

Once attached to a session:
- **Move between panes:** Control-B + arrow keys
- **Cycle panes:** Control-B + o
- **Zoom pane:** Control-B + z (repeat to unzoom)
- **Detach:** Control-B + d
- **Reattach:** `tmux attach -t wtaf-<id>`

## Testing Your Worktree

### Test SMS Bot
```bash
curl -X POST http://localhost:<sms-port>/dev/webhook \
  -H 'Content-Type: application/json' \
  -d '{"Body": "wtaf make a test page", "From": "+14155551234"}'
```

### Test Web Server
Visit `http://localhost:<web-port>` in your browser

## Current Active Worktrees

To see what worktrees are currently running:
```bash
tmux list-sessions
git worktree list
```

## Important Notes

- Each worktree is completely isolated with its own ports
- All worktrees share the same Supabase database
- Changes in a worktree don't affect other worktrees or the main repo
- The worktree directory is separate from the main repo
- Always use `cleanup-worktree.sh` to properly remove a worktree (it securely removes .env files)
- **Dev-reroute automatically uses the correct port:** The dev-reroute script reads the `SMS_PORT` environment variable to send commands to the correct SMS bot instance

## Troubleshooting

If services fail to start:
1. Check that ports aren't already in use
2. Verify `.env.local` exists in the main repo's sms-bot directory
3. Run `./cleanup-worktree.sh <id>` and try starting fresh
4. Check tmux panes for specific error messages

## File Locations

- **Scripts:** `/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/scripts/worktree/`
- **Worktrees:** `/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8-worktrees/`
- **Main Repo:** `/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/`