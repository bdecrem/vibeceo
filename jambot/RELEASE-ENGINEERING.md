# Jambot Release Engineering

Plan for shipping releases with a proper user experience.

## Current Version: v0.1.0

## Historical Problems (pre-v0.1)

1. **API Key**: Code looks for `../sms-bot/.env.local` — external users don't have this
2. **No setup instructions**: README doesn't explain where to get API key
3. **No first-run experience**: Missing key = crash with no guidance
4. **Dependencies unclear**: Node version? Native bindings?

## v0.1.x Release Plan

### 1. API Key Handling

Check order:
1. `process.env.ANTHROPIC_API_KEY` (standard env var)
2. `~/.jambot/.env` (user's home directory)
3. `./.env` (local directory)
4. Prompt user on first run → save to `~/.jambot/.env`

If missing, show friendly message:
```
No API key found. Get one at console.anthropic.com

Enter your key: sk-ant-...
Save to ~/.jambot/.env? (y/n)
```

### 2. Release README

Update `releases/v0.1.0/README.md` (the public repo) to:

```markdown
# Jambot

🤖 Your AI just learned to funk 🎛️

## Install

1. Clone this repo (or download ZIP)
2. Run: npm install
3. Run: node jambot.js
4. On first run, enter your Anthropic API key

## Requirements

- Node.js 18+
- Anthropic API key (console.anthropic.com)

## What it does

Talk to it naturally:
- "make me a techno beat at 128"
- "add some swing"
- "make the kick punchier"
- "render it"

Outputs WAV files. Uses TR-909, TB-303, SH-101 emulations.

## Commands

Type `/` for menu, or:
- `/r9d9` - Drum machine guide
- `/r3d3` - Acid bass guide
- `/r1d1` - Lead synth guide
- `/status` - Current session
- `/clear` - Reset

## Troubleshooting

**API key issues:**
- Key stored in: `~/.jambot/.env`
- To reset: `rm ~/.jambot/.env` and restart

**Build errors on npm install:**
- Ensure Node.js 18+ is installed
- On Mac: May need Xcode Command Line Tools
- On Linux: May need build-essential
```

### 3. First-Run Wizard

On launch, if no API key detected:
```
┌─────────────────────────────────────────────────┐
│  Welcome to Jambot                              │
├─────────────────────────────────────────────────┤
│                                                 │
│  To make beats, you need an Anthropic API key. │
│  Get one at: console.anthropic.com              │
│                                                 │
│  Paste your key: █                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

After entry, prompt to save:
```
Save key to ~/.jambot/.env so you don't have to enter it again? (y/n)
```

### 4. Graceful Errors

Instead of crashes, show helpful messages:

**No API key:**
```
No API key found.

Get one at: console.anthropic.com
Then either:
  • Set ANTHROPIC_API_KEY environment variable
  • Or restart Jambot and paste when prompted
```

**API error:**
```
Could not connect to Anthropic API.

Check:
  • Internet connection
  • API key is valid (console.anthropic.com)

Key location: ~/.jambot/.env
To reset: rm ~/.jambot/.env
```

**Missing dependencies:**
```
Missing native audio module.

Try:
  npm rebuild node-web-audio-api

Or reinstall:
  rm -rf node_modules && npm install
```

### 5. Version Check (Future)

Optional: On startup, check for updates:
```
Update available: v0.1.1 (you have v0.1.x)
→ github.com/bdecrem/jambot
```

Not critical for v0.1.x.

## Release Checklist

For each release:

- [ ] Update version in `package.json`
- [ ] Update version in `build.js`
- [ ] Update splash screen in `jambot.js`
- [ ] Update `/changelog` command in `jambot.js`
- [ ] Run `npm run build`
- [ ] Test fresh install:
  - [ ] Delete node_modules
  - [ ] `npm install`
  - [ ] Run with no API key (should prompt gracefully)
  - [ ] Run with valid key (should work)
- [ ] Copy `dist/*` to `releases/v0.1.0/`
- [ ] Update `releases/v0.1.0/README.md` if needed
- [ ] Commit and push release repo
- [ ] (Optional) Create GitHub release with tag

## File Locations

| File | Purpose |
|------|---------|
| `jambot.js` | Main source (version, splash, changelog) |
| `build.js` | Bundler config (version in output package.json) |
| `package.json` | Dev package (version) |
| `dist/` | Build output |
| `releases/v0.1.0/` | Public release repo → github.com/bdecrem/jambot |
| `genres.json` | Genre knowledge (bundled in build) |

## Implementation Order

1. API key handling (check env, ~/.jambot/.env, prompt)
2. First-run wizard
3. Graceful error messages
4. Update release README
5. Test full flow
6. Ship v0.1.x
