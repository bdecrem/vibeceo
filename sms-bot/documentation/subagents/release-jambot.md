# /release-jambot

Release a new version of Jambot to the public repo.

## Usage

```
/release-jambot 0.0.3 "Fixed X, added Y"
```

Arguments:
- **version**: New version number (e.g., 0.0.3)
- **changelog**: Brief description of changes

## Release Checklist

Execute each step in order. Stop and report if any step fails.

### 1. Bump Version

Update version in these files:
- `jambot/jambot.js` — SPLASH constant (line ~150) and CHANGELOG_TEXT
- `jambot/build.js` — version in pkg object and console.log message
- `jambot/package.json` — version field

Search for the old version string and replace with new version.
Add changelog entry to CHANGELOG_TEXT in jambot.js.

### 2. Build

```bash
cd /Users/bart/Documents/code/vibeceo/jambot && node build.js
```

Verify:
- Build completes without errors (warnings OK)
- `dist/jambot.js` has single shebang line
- `dist/package.json` has correct version

### 3. Smoke Test

```bash
cd /tmp && rm -rf jambot-test && mkdir jambot-test && cd jambot-test
cp -r /Users/bart/Documents/code/vibeceo/jambot/dist/* .
npm install
timeout 5 node jambot.js || true
```

Verify:
- npm install succeeds
- App launches without immediate crash
- Splash screen appears (check output for "JAMBOT" ASCII art)

### 4. Push to Releases Repo

```bash
# Clone fresh
cd /tmp && rm -rf jambot && gh repo clone bdecrem/jambot

# Copy dist contents
cp /Users/bart/Documents/code/vibeceo/jambot/dist/* /tmp/jambot/

# Commit and push
cd /tmp/jambot
git add -A
git commit -m "v{VERSION} — {CHANGELOG}"
git push origin main
```

### 5. Update README Version

Update the version line at bottom of README in both:
- `/tmp/jambot/README.md`
- `/Users/bart/Documents/code/vibeceo/jambot/build.js`

Format: `v{VERSION} — {DATE}`

Push the README update to releases repo.

### 6. Report Success

Output:
- Version released
- GitHub URL: https://github.com/bdecrem/jambot
- Download URL: https://github.com/bdecrem/jambot/archive/refs/heads/main.zip

## Notes

- Do NOT create GitHub Releases (tags) — we just use main branch
- Do NOT push changes to vibeceo repo — only update source files locally
- If smoke test fails, stop and debug before pushing
