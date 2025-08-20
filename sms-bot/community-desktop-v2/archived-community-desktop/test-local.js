#!/usr/bin/env node

/**
 * Local test script for Community Desktop
 * Creates test submissions without needing database
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample app ideas to test with
const testApps = [
  {
    appName: "Magic 8 Ball",
    appFunction: "Shows a random fortune when clicked",
    submitterName: "TestUser1"
  },
  {
    appName: "Compliment Me",
    appFunction: "Shows a random compliment to make you smile",
    submitterName: "TestUser2"
  },
  {
    appName: "Color Splash",
    appFunction: "Changes the background to a random color",
    submitterName: "TestUser3"
  },
  {
    appName: "Backwards Clock",
    appFunction: "Shows the time running backwards",
    submitterName: "TestUser4"
  },
  {
    appName: "Pet Rock",
    appFunction: "Let me name a virtual pet rock and it says hello",
    submitterName: "TestUser5"
  }
];

// Transform submissions into app specs (simulating what Claude would do)
const mockAppSpecs = [
  {
    name: "Magic 8 Ball",
    icon: "🎱",
    code: "alert(['Yes!', 'No!', 'Maybe...', 'Ask again later', 'Definitely!'][Math.floor(Math.random()*5)])",
    tooltip: "Ask the magic 8 ball",
    submitterId: "test-1",
    submitterName: "TestUser1"
  },
  {
    name: "Compliments",
    icon: "💝",
    code: "alert(['You are awesome!', 'You rock!', 'Keep being amazing!', 'You got this!'][Math.floor(Math.random()*4)])",
    tooltip: "Get a compliment",
    submitterId: "test-2",
    submitterName: "TestUser2"
  },
  {
    name: "Color Splash",
    icon: "🎨",
    code: "document.body.style.background='#'+Math.floor(Math.random()*16777215).toString(16)",
    tooltip: "Random background color",
    submitterId: "test-3",
    submitterName: "TestUser3"
  },
  {
    name: "Time Warp",
    icon: "⏰",
    code: "alert('Time is: ' + new Date().toTimeString().split('').reverse().join(''))",
    tooltip: "Time runs backwards",
    submitterId: "test-4",
    submitterName: "TestUser4"
  },
  {
    name: "Pet Rock",
    icon: "🪨",
    code: "localStorage.rockName=prompt('Name your rock:')||'Rocky';alert(localStorage.rockName+' says hi!')",
    tooltip: "Your virtual pet rock",
    submitterId: "test-5",
    submitterName: "TestUser5"
  }
];

async function injectTestApps() {
  console.log('🧪 Testing Community Desktop Locally\n');
  
  const desktopPath = path.join(__dirname, 'desktop.html');
  
  try {
    // Read current desktop
    let html = await fs.readFile(desktopPath, 'utf-8');
    
    // Find injection point
    const startMarker = '<!-- COMMUNITY_APPS_START -->';
    const endMarker = '<!-- COMMUNITY_APPS_END -->';
    
    const startIdx = html.indexOf(startMarker);
    const endIdx = html.indexOf(endMarker);
    
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Could not find app markers in desktop.html');
    }
    
    // Generate HTML for all test apps
    let appHtml = '\n';
    let x = 220, y = 20;
    
    for (const app of mockAppSpecs) {
      // Escape the code
      const escapedCode = app.code
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      appHtml += `        <div class="desktop-icon" 
             style="left: ${x}px; top: ${y}px"
             data-submitter-id="${app.submitterId}"
             title="${app.tooltip}"
             onclick="${escapedCode}">
            <div class="icon">${app.icon}</div>
            <div class="label">${app.name}</div>
        </div>\n`;
      
      // Move to next position
      x += 100;
      if (x > 600) {
        x = 20;
        y += 100;
      }
    }
    
    // Keep existing apps and add new ones
    const existingApps = html.substring(startIdx + startMarker.length, endIdx);
    const newHtml = html.substring(0, startIdx + startMarker.length) + 
                    existingApps + appHtml + '        ' + 
                    html.substring(endIdx);
    
    // Write updated HTML
    await fs.writeFile(desktopPath, newHtml);
    
    console.log('✅ Added test apps to desktop.html:');
    for (const app of mockAppSpecs) {
      console.log(`   ${app.icon} ${app.name} - ${app.tooltip}`);
    }
    
    console.log('\n📂 Open desktop.html in your browser to see the apps!');
    console.log('   open sms-bot/community-desktop/desktop.html');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
injectTestApps();