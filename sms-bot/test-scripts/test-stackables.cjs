const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config({ path: '../.env.local' });

// Hardcoded user info
const HARDCODED_USER_SLUG = 'bart';
const HARDCODED_USER_ID = 'a5167b9a-a718-4567-a22d-312b7bf9e773';

// Initialize clients
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
      rl.question(question, (answer) => {
          resolve(answer);
      });
  });
}

// Parse stack command input
function parseStackCommand(input) {
  console.log('\n🔍 PARSING COMMAND:');
  console.log(`Input: "${input}"`);
  
  const match = input.match(/^STACK\s+([a-z-]+)\s+(.+)$/i);
  if (!match) {
      throw new Error('Invalid format. Use: STACK app-slug your request here');
  }
  
  const result = {
      appSlug: match[1],
      userRequest: match[2]
  };
  
  console.log(`App Slug: "${result.appSlug}"`);
  console.log(`User Request: "${result.userRequest}"`);
  
  return result;
}

// Load HTML content from Supabase
async function loadStackedData(appSlug) {
  console.log('\n📡 LOADING DATA FROM SUPABASE:');
  console.log(`Looking for app_slug: "${appSlug}"`);
  console.log(`User ID: "${HARDCODED_USER_ID}"`);
  
  const { data: appData } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('app_slug', appSlug)
      .eq('user_id', HARDCODED_USER_ID)
      .single();
  
  console.log(`HTML content loaded: ${appData.html_content ? appData.html_content.length + ' characters' : 'null'}`);
  
  return appData.html_content;
}

// Build clean prompt with just user request + HTML
function buildEnhancedPrompt(userRequest, htmlContent) {
  console.log('\n🔧 BUILDING ENHANCED PROMPT:');
  console.log(`User request: "${userRequest}"`);
  console.log(`HTML content included: ${htmlContent ? 'YES' : 'NO'}`);
  
  let prompt = userRequest;
  
  if (htmlContent && htmlContent.trim()) {
      prompt += `\n\nHTML to use as template:\n\`\`\`html\n${htmlContent}\n\`\`\``;
  }
  
  console.log(`Final prompt length: ${prompt.length} characters`);
  
  return prompt;
}

async function main() {
  try {
      const input = await askQuestion('Enter your stack command: ');
      if (!input.trim()) {
          rl.close();
          return;
      }

      // Parse command
      const { appSlug, userRequest } = parseStackCommand(input);
      
      // Load HTML content from Supabase
      const htmlContent = await loadStackedData(appSlug);
      
      // Build clean prompt
      const enhancedPrompt = buildEnhancedPrompt(userRequest, htmlContent);

      // Load system prompt from external file
      console.log('\n📄 LOADING SYSTEM PROMPT:');
      const systemPrompt = readFileSync('./system-prompt.txt', 'utf8');
      console.log(`System prompt loaded: ${systemPrompt.length} characters`);
      
      // Log what's being sent to GPT
      console.log('\n🚀 SENDING TO CLAUDE:');
      console.log('=' .repeat(80));
      console.log('SYSTEM PROMPT:');
      console.log('=' .repeat(80));
      console.log(systemPrompt);
      console.log('\n' + '=' .repeat(80));
      console.log('USER PROMPT:');
      console.log('=' .repeat(80));
      console.log(enhancedPrompt);
      console.log('=' .repeat(80));
      
      // Send to Claude with system prompt + enhanced user prompt
      const response = await sendToClaude(systemPrompt, enhancedPrompt);
      
      console.log('\n✅ CLAUDE RESPONSE RECEIVED:');
      console.log(`Response length: ${response.length} characters`);
      
      // Save output
      const html = extractHTML(response);
      saveHTML(html, appSlug);
      
      rl.close();
      
  } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      rl.close();
  }
}

async function sendToClaude(systemPrompt, userInput) {
  const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8192,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: userInput }]
  });
  return response.content[0].text;
}

function extractHTML(response) {
  console.log('\n🔍 EXTRACTING HTML FROM RESPONSE:');
  
  const htmlMatch = response.match(/```html\n([\s\S]*?)\n```/);
  if (htmlMatch) {
      console.log('✅ Found HTML in code block');
      return htmlMatch[1];
  }
  
  if (response.includes('<!DOCTYPE html') || response.includes('<html')) {
      console.log('✅ Found raw HTML in response');
      return response;
  }
  
  console.log('❌ No HTML found in response');
  throw new Error('No HTML found in Claude response');
}

function saveHTML(html, appSlug) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `stackable-${appSlug}-${timestamp}.html`;
  const logsDir = join(__dirname, '..', 'logs');

  if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
  }

  const filepath = join(logsDir, filename);
  writeFileSync(filepath, html, 'utf8');
  console.log(`✅ HTML saved to: ${filepath}`);
}

process.on('SIGINT', () => {
  rl.close();
  process.exit(0);
});

main().catch(console.error);