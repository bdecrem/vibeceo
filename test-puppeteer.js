#!/usr/bin/env node

// Simple test script for Puppeteer MCP
console.log('Testing Puppeteer MCP commands...\n');

console.log('Available Puppeteer MCP commands:');
console.log('1. mcp__puppeteer__puppeteer_navigate - Navigate to a URL');
console.log('2. mcp__puppeteer__puppeteer_screenshot - Take a screenshot');
console.log('3. mcp__puppeteer__puppeteer_click - Click an element');
console.log('4. mcp__puppeteer__puppeteer_fill - Fill out an input field');
console.log('5. mcp__puppeteer__puppeteer_select - Select an option');
console.log('6. mcp__puppeteer__puppeteer_hover - Hover over an element');
console.log('7. mcp__puppeteer__puppeteer_evaluate - Execute JavaScript');

console.log('\nExample usage from Claude Code:');
console.log('- Navigate: Use mcp__puppeteer__puppeteer_navigate with url parameter');
console.log('- Screenshot: Use mcp__puppeteer__puppeteer_screenshot with name parameter');
console.log('- Click: Use mcp__puppeteer__puppeteer_click with selector parameter');
console.log('- Fill form: Use mcp__puppeteer__puppeteer_fill with selector and value');

console.log('\nTo test interactively, try these commands in Claude Code:');
console.log('1. Navigate to a website');
console.log('2. Take a screenshot');
console.log('3. Interact with page elements');