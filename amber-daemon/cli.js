#!/usr/bin/env node
// amber-daemon/cli.js - Entry point

import { createSession, runAgentLoop, getApiKey, SPLASH } from './amber.js';
import { createInterface } from 'readline';

// Simple REPL for now - TUI can come later
async function main() {
  console.log(SPLASH);

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('\n❌ No API key found.');
    console.error('Set ANTHROPIC_API_KEY environment variable or create ~/.amber/.env');
    process.exit(1);
  }

  const session = createSession();
  const messages = [];

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const prompt = () => {
    rl.question('\n🔮 ', async (input) => {
      const trimmed = input.trim();
      
      if (!trimmed) {
        prompt();
        return;
      }

      if (trimmed === '/exit' || trimmed === '/quit') {
        console.log('\n✨ Later.\n');
        rl.close();
        process.exit(0);
      }

      if (trimmed === '/help') {
        console.log(`
Commands:
  /help   - Show this help
  /clear  - Clear conversation history
  /exit   - Quit

Just type to talk to Amber.
`);
        prompt();
        return;
      }

      if (trimmed === '/clear') {
        messages.length = 0;
        console.log('Cleared conversation history.');
        prompt();
        return;
      }

      try {
        await runAgentLoop(trimmed, session, messages, {
          onStart: (task) => {
            // console.log(`\n[Processing: ${task.substring(0, 50)}...]`);
          },
          onTool: (name, input) => {
            console.log(`\n🔧 ${name}`);
          },
          onToolResult: (name, result) => {
            const preview = typeof result === 'string' 
              ? result.substring(0, 100) + (result.length > 100 ? '...' : '')
              : JSON.stringify(result).substring(0, 100);
            console.log(`   → ${preview}`);
          },
          onResponse: (text) => {
            console.log(`\n${text}`);
          },
          onEnd: () => {
            // Done
          }
        }, {
          repoRoot: '/Users/bart/Documents/code/vibeceo'
        });
      } catch (err) {
        console.error(`\n❌ Error: ${err.message}`);
      }

      prompt();
    });
  };

  prompt();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
