# Jambot

🤖 Your AI just learned to funk 🎛️

Jambot is Claude Code for grooves, a command-line AI groovebox with an old skool attitude. Talk naturally—"give me a four-on-the-floor kick with offbeat hats"—and it programs real synth engines: TR-909 drums, TB-303 acid bass, SH-101 leads, plus a sample-based drum machine. No black-box AI slop. Every parameter is tweakable, every pattern is yours. Built for producers who want a jam partner, not a replacement.

## Install

1. [Download Jambot](https://github.com/bdecrem/jambot/archive/refs/heads/main.zip), move it to your preferred location, and unzip
2. Open Terminal, `cd` into the folder
3. Run: `npm install` (need Node.js? [get it here](https://nodejs.org/))
4. Run: `node jambot.js`
5. On first run, enter your Anthropic API key when prompted

## Requirements

- Anthropic API key (get one at console.anthropic.com)

## What it does

Talk to it naturally:
- "make me a techno beat at 128"
- "add some acid bass"
- "make the kick punchier"
- "add swing"
- Your projects live in `~/Documents/Jambot/` — drag WAVs straight into your DAW

## Commands

Type `/` for menu, or:
- `/r9d9` - Drum machine guide
- `/r3d3` - Acid bass guide
- `/r1d1` - Lead synth guide
- `/export` - Export MIDI + README
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

## Version

v0.1.0 — Jan 28, 2025
