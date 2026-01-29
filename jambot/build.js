// jambot/build.js - Bundle jambot for distribution
import * as esbuild from 'esbuild';
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔨 Building Jambot v0.1.0 for distribution...\n');

// Create dist folder
mkdirSync('dist', { recursive: true });

// Bundle the UI (entry point)
await esbuild.build({
  entryPoints: ['terminal-ui.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/jambot.js',
  external: [
    'node-web-audio-api',  // Native addon
    '@anthropic-ai/sdk',   // API client
    'ffmpeg-static',       // Binary
  ],
  loader: {
    '.ts': 'ts',
  },
});

// Copy genres.json
if (existsSync('genres.json')) {
  copyFileSync('genres.json', 'dist/genres.json');
}

// Create package.json for dist
const pkg = {
  name: "jambot",
  version: "0.1.0",
  type: "module",
  description: "AI-powered music creation CLI",
  bin: {
    jambot: "./jambot.js"
  },
  dependencies: {
    "@anthropic-ai/sdk": "^0.71.2",
    "node-web-audio-api": "^1.0.7",
    "ffmpeg-static": "^5.3.0",
    "string-width": "^8.1.0",
    "wrap-ansi": "^9.0.2"
  }
};

writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));

// Create README
const readme = `# Jambot

🤖 Your AI just learned to funk 🎛️

Jambot is Claude Code for grooves, a command-line AI groovebox with an old skool attitude. Talk naturally—"give me a four-on-the-floor kick with offbeat hats"—and it programs real synth engines: TR-909 drums, TB-303 acid bass, SH-101 leads, plus a sample-based drum machine. No black-box AI slop. Every parameter is tweakable, every pattern is yours. Built for producers who want a jam partner, not a replacement.

## Install

1. [Download Jambot](https://github.com/bdecrem/jambot/archive/refs/heads/main.zip), move it to your preferred location, and unzip
2. Open Terminal, \`cd\` into the folder
3. Run: \`npm install\` (need Node.js? [get it here](https://nodejs.org/))
4. Run: \`node jambot.js\`
5. On first run, enter your Anthropic API key when prompted

## Requirements

- Anthropic API key (get one at console.anthropic.com)

## What it does

Talk to it naturally:
- "make me a techno beat at 128"
- "add some acid bass"
- "make the kick punchier"
- "add swing"
- Your projects live in \`~/Documents/Jambot/\` — drag WAVs straight into your DAW

## Commands

Type \`/\` for menu, or:
- \`/r9d9\` - Drum machine guide
- \`/r3d3\` - Acid bass guide
- \`/r1d1\` - Lead synth guide
- \`/export\` - Export MIDI + README
- \`/status\` - Current session
- \`/clear\` - Reset

## Troubleshooting

**API key issues:**
- Key stored in: \`~/.jambot/.env\`
- To reset: \`rm ~/.jambot/.env\` and restart

**Build errors on npm install:**
- Ensure Node.js 18+ is installed
- On Mac: May need Xcode Command Line Tools
- On Linux: May need build-essential

## Version

v0.1.0 — Jan 28, 2025
`;

writeFileSync('dist/README.md', readme);

console.log('✅ Built to dist/');
console.log('');
console.log('To test:');
console.log('  cd dist && npm install && node jambot.js');
console.log('');
console.log('To distribute: zip dist/ and share!');
