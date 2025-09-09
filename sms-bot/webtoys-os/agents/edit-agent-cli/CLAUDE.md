# WebtoysOS Edit Agent CLI - Development Notes

## Current Status (September 3, 2025)

This is an experimental edit agent that processes Issue Tracker requests using Claude CLI. It's designed to be a simpler, more controlled alternative to the main edit-agent that gives Claude full filesystem access.

### Key Features
- **Two-phase approach**: First classifies requests (CREATE_APP vs EDIT_APP), then executes
- **Webhook server**: Receives notifications from Issue Tracker on port 3032
- **Worker-based processing**: Spawns worker processes to handle requests
- **5-minute timeout**: Increased from 60 seconds to handle app creation

### What We Built Here

1. **webhook-server.js**: Receives Issue Tracker webhooks and queues requests
2. **worker-v3.js**: Two-phase Claude CLI processor
   - Phase 1: Asks Claude to classify the request
   - Phase 2: Either creates new app or edits existing one
3. **start-all.sh**: One-command startup (ngrok + webhook + worker)
4. **stop-all.sh**: Clean shutdown script

### Known Issues

**CREATE_APP times out**: Even with 5-minute timeout, Claude CLI struggles to generate complete HTML apps from scratch. The main edit-agent solves this by giving Claude filesystem access to create files directly rather than outputting HTML.

### Version History

**Commit 0944ed51** (September 3, 2025)
- Added 5-minute timeout for CREATE_APP operations
- Fixed missing `original_prompt` database field
- Implemented two-phase classification approach
- Added template-based CREATE_APP (experimental, may be removed)

To return to this version:
```bash
git checkout 0944ed51
```

### Comparison with Other Agents

1. **edit-agent-cli** (this one): Asks Claude for HTML, agent handles deployment
2. **edit-agent**: Gives Claude full filesystem access with `--dangerously-skip-permissions`
3. **webtoys-edit-agent**: Only edits existing apps (for `--revise` SMS command)

### Why This Approach Has Challenges

Claude CLI works best when it can output commands to execute, not when generating large HTML documents. The 60-second to 5-minute timeout increase helped but didn't fully solve the problem. The main edit-agent's approach of letting Claude act like a developer (creating files, running scripts) is more successful.

### Running This Agent

```bash
# Start everything
./start-all.sh

# Update Railway with the ngrok URL shown
# Submit issues to Issue Tracker
# Watch the worker process them

# Stop everything
./stop-all.sh
```

### Future Considerations

If revisiting this approach, consider:
- Breaking CREATE_APP into smaller steps
- Having Claude generate minimal HTML first, then enhance
- Or accepting that the edit-agent's `--dangerously-skip-permissions` approach is necessary for app creation