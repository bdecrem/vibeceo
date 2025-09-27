#!/usr/bin/env node

import readline from 'readline';
import fetch from 'node-fetch';

const MCP_URL = 'http://localhost:3456';

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

console.log(`${colors.bright}${colors.blue}🚀 Poke-Webtoys Interactive Tester${colors.reset}\n`);
console.log('This simulates how Poke would interact with your MCP server.\n');

// Test examples
const examples = [
  'build a todo list app',
  'create a particle animation',
  'make a meme about debugging',
  'build a countdown timer',
  'create a drawing canvas',
  'make a quiz game',
  'build a weather dashboard',
  'create a music player'
];

console.log(`${colors.yellow}Example commands:${colors.reset}`);
examples.forEach((ex, i) => {
  console.log(`  ${i + 1}. ${ex}`);
});
console.log('');

async function testCommand(description) {
  console.log(`\n${colors.bright}Sending to MCP server...${colors.reset}`);

  try {
    const response = await fetch(`${MCP_URL}/tool/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool: 'build_webtoys_app',
        arguments: {
          description: description,
          user_id: `test-${Date.now()}`
        }
      })
    });

    const result = await response.json();

    if (result.content && result.content[0]) {
      console.log(`\n${colors.green}✅ Response from MCP:${colors.reset}`);
      console.log(result.content[0].text);

      // Try to extract URL from response
      const urlMatch = result.content[0].text.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        console.log(`\n${colors.bright}${colors.magenta}🔗 Open this URL in your browser:${colors.reset}`);
        console.log(`   ${colors.blue}${urlMatch[0]}${colors.reset}`);
      }
    } else if (result.error) {
      console.log(`\n${colors.yellow}⚠️ Error:${colors.reset} ${result.error}`);
    }
  } catch (error) {
    console.log(`\n${colors.yellow}❌ Failed to connect to MCP server${colors.reset}`);
    console.log('Make sure the server is running: npm start');
  }
}

function askForCommand() {
  rl.question(`\n${colors.bright}What do you want to build? ${colors.reset}(or 'quit' to exit)\n> `, async (answer) => {
    if (answer.toLowerCase() === 'quit' || answer.toLowerCase() === 'exit') {
      console.log(`\n${colors.blue}👋 Goodbye!${colors.reset}`);
      rl.close();
      return;
    }

    // Check if user entered a number (selecting an example)
    const num = parseInt(answer);
    if (num >= 1 && num <= examples.length) {
      await testCommand(examples[num - 1]);
    } else if (answer.trim()) {
      await testCommand(answer);
    }

    // Ask again
    askForCommand();
  });
}

// Check if MCP server is running
console.log(`${colors.bright}Checking MCP server...${colors.reset}`);
fetch(`${MCP_URL}/`)
  .then(res => res.json())
  .then(data => {
    console.log(`${colors.green}✅ MCP server is running!${colors.reset}\n`);
    askForCommand();
  })
  .catch(err => {
    console.log(`${colors.yellow}❌ MCP server is not running${colors.reset}`);
    console.log('Start it with: npm start');
    process.exit(1);
  });