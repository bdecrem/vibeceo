#!/usr/bin/env node

/**
 * Process submissions from localStorage (for local testing)
 * Run this after submitting via the form
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function getLocalSubmissions() {
  // In a browser, submissions are in localStorage
  // For testing, let's prompt for the submission details
  console.log('\n📝 Enter the app details you submitted:\n');
  
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise(resolve => {
    rl.question(prompt, resolve);
  });
  
  const appName = await question('App name: ');
  const appFunction = await question('What does it do: ');
  const submitterName = await question('Your name (or press Enter for Anonymous): ');
  
  rl.close();
  
  return {
    appName: appName.trim(),
    appFunction: appFunction.trim(),
    submitterName: submitterName.trim() || 'Anonymous'
  };
}

async function transformWithClaude(submission) {
  const prompt = `Transform this user submission into a simple desktop app specification.

User wants an app called: "${submission.appName}"
It should: "${submission.appFunction}"
Submitted by: ${submission.submitterName}

Generate a JSON object with:
1. name: A short, catchy name (max 12 chars)
2. icon: A single emoji that represents the app
3. code: Simple JavaScript code that runs when clicked. Use only:
   - alert() for messages
   - prompt() for input
   - confirm() for yes/no
   - Basic math and string operations
   - localStorage for simple persistence
   - document.body.style for visual changes
   Keep it VERY simple - one line if possible, max 3 lines
4. tooltip: A fun description (max 50 chars)

Examples of good code:
- "alert('You rolled: ' + Math.ceil(Math.random()*6))"
- "localStorage.petName = prompt('Name your pet:') || 'Rocky'; alert('Your pet ' + localStorage.petName + ' says hi!')"
- "document.body.style.filter = 'hue-rotate(' + Math.random()*360 + 'deg)'"

Respond with ONLY valid JSON, no explanation.`;

  try {
    console.log('\n🤖 Asking Claude to transform your app idea...');
    
    // Use claude command
    const { stdout } = await execAsync(`echo ${JSON.stringify(prompt)} | claude --no-markdown`, {
      maxBuffer: 1024 * 1024 * 10
    });
    
    const appSpec = JSON.parse(stdout.trim());
    return appSpec;
    
  } catch (error) {
    console.log('⚠️  Claude not available, using fallback transformation...');
    
    // Fallback: simple transformation without AI
    const icons = ['🎮', '🎲', '🎨', '🎵', '🎭', '🎪', '🎯', '🎰', '🎸', '🎺'];
    const icon = icons[Math.floor(Math.random() * icons.length)];
    
    return {
      name: submission.appName.substring(0, 12),
      icon: icon,
      code: `alert('${submission.appName}: ${submission.appFunction.substring(0, 50)}')`,
      tooltip: submission.appFunction.substring(0, 50)
    };
  }
}

async function addToDesktop(appSpec, submission) {
  const desktopPath = path.join(__dirname, 'desktop.html');
  
  try {
    let html = await fs.readFile(desktopPath, 'utf-8');
    
    const startMarker = '<!-- COMMUNITY_APPS_START -->';
    const endMarker = '<!-- COMMUNITY_APPS_END -->';
    
    const startIdx = html.indexOf(startMarker);
    const endIdx = html.indexOf(endMarker);
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Could not find app markers in desktop.html');
    }
    
    // Calculate position (find empty spot)
    const existingApps = html.substring(startIdx + startMarker.length, endIdx);
    const appCount = (existingApps.match(/desktop-icon/g) || []).length;
    
    const x = 20 + (appCount % 7) * 100;
    const y = 220 + Math.floor(appCount / 7) * 100;
    
    // Escape the code
    const escapedCode = appSpec.code
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Create app HTML
    const appHtml = `
        <div class="desktop-icon" 
             style="left: ${x}px; top: ${y}px"
             data-submitter-id="local-${Date.now()}"
             data-submitter-name="${submission.submitterName}"
             title="${appSpec.tooltip}"
             onclick="${escapedCode}">
            <div class="icon">${appSpec.icon}</div>
            <div class="label">${appSpec.name}</div>
        </div>`;
    
    // Insert before end marker
    const newHtml = html.substring(0, endIdx) + appHtml + '\n        ' + html.substring(endIdx);
    
    await fs.writeFile(desktopPath, newHtml);
    
    console.log(`\n✅ Added "${appSpec.name}" to the desktop!`);
    console.log(`   Icon: ${appSpec.icon}`);
    console.log(`   Position: (${x}, ${y})`);
    console.log(`   Submitted by: ${submission.submitterName}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error adding to desktop:', error.message);
    return false;
  }
}

async function processSubmission() {
  console.log('🖥️  Community Desktop - Local Submission Processor');
  console.log('='.repeat(50));
  
  try {
    // Get the submission details
    const submission = await getLocalSubmissions();
    
    console.log(`\n📋 Processing: "${submission.appName}"`);
    
    // Transform with Claude (or fallback)
    const appSpec = await transformWithClaude(submission);
    
    console.log('\n✨ Transformed to:');
    console.log(`   Name: ${appSpec.name}`);
    console.log(`   Icon: ${appSpec.icon}`);
    console.log(`   Action: ${appSpec.tooltip}`);
    
    // Add to desktop
    await addToDesktop(appSpec, submission);
    
    console.log('\n🎉 Success! Refresh desktop.html to see your new app!');
    console.log('   Command: open desktop.html');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Run it
processSubmission();