# Jambot Development

AI-powered music creation CLI. "Claude Code for Music."

## Quick Start

```bash
npm install
npm start
```

Requires `ANTHROPIC_API_KEY` in `../sms-bot/.env.local`

## Daily Development

Just edit files here and commit/push to vibeceo as normal. No builds needed during development.

## Cutting a Release

1. Update version number in three places:
   - `package.json` → `"version": "x.x.x"`
   - `build.js` → `version: "x.x.x"`
   - `jambot.js` → splash screen and `/changelog` command

2. Build:
   ```bash
   npm run build
   ```

3. Copy to release folder:
   ```bash
   cp dist/* releases/v0.0.1/
   ```

4. Push release repo:
   ```bash
   cd releases/v0.0.1
   git add -A && git commit -m "v0.0.1 release notes here"
   git push
   ```

Release repo: https://github.com/bdecrem/jambot

## Architecture

```
jambot/
├── jambot.js      # Main app (agent loop + CLI + tools)
├── build.js       # esbuild bundler for distribution
├── package.json   # Dev dependencies
├── dist/          # Built output (gitignored)
└── releases/      # Release folders (separate git repos)
    └── v0.0.1/    # → github.com/bdecrem/jambot
```

## Tools Available to the Agent

| Tool | Description |
|------|-------------|
| `create_session` | Set BPM |
| `add_drums` | Add drum pattern (all 11 TR-909 voices) |
| `tweak_drums` | Adjust decay, tune, tone, level |
| `set_swing` | Add groove (0-100%) |
| `render` | Output to WAV file |

## Synth Source

Uses TR-909 engine from `../web/public/909/dist/machines/tr909/engine.js`
