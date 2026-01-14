// jambot/build.js - Bundle jambot for distribution
import * as esbuild from 'esbuild';
import { mkdirSync, cpSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🔨 Building Jambot for distribution...\n');

// Create dist folder
mkdirSync('dist', { recursive: true });

// Bundle the main app
await esbuild.build({
  entryPoints: ['jambot.js'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outfile: 'dist/jambot.js',
  banner: {
    js: '#!/usr/bin/env node'
  },
  // Mark native modules as external (they can't be bundled)
  external: [
    'node-web-audio-api',  // Native addon
    'inquirer',            // Has dynamic requires
  ],
});

// Create package.json for dist
const pkg = {
  name: "jambot",
  version: "0.0.1",
  type: "module",
  description: "AI-powered music creation CLI",
  bin: {
    jambot: "./jambot.js"
  },
  dependencies: {
    "node-web-audio-api": "^1.0.7",
    "inquirer": "^13.2.0"
  }
};

writeFileSync('dist/package.json', JSON.stringify(pkg, null, 2));

// Create README
const readme = `# Jambot

🤖 Your AI just learned to funk 🎛️

## Setup

1. Install dependencies:
   \`\`\`
   npm install
   \`\`\`

2. Set your Anthropic API key:
   \`\`\`
   export ANTHROPIC_API_KEY=sk-ant-...
   \`\`\`

3. Run:
   \`\`\`
   node jambot.js
   \`\`\`

## Usage

Just talk to it:
- "make me a techno beat at 128"
- "add some swing"
- "make the kick punchier"
- "render it"

Type \`/\` for commands, \`/909\` for drum machine guide.
`;

writeFileSync('dist/README.md', readme);

console.log('✅ Built to dist/');
console.log('');
console.log('To distribute:');
console.log('  1. cd dist');
console.log('  2. npm install');
console.log('  3. export ANTHROPIC_API_KEY=...');
console.log('  4. node jambot.js');
console.log('');
console.log('Or zip dist/ and send to a friend!');
