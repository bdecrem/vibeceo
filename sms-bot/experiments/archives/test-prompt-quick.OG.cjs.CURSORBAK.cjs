const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Prompt the user for input
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Enhanced App ID generation with sequential counter
function generateAppId() {
  const counterFile = path.join(__dirname, '.test-counter');
  let counter = 1;
  
  try {
    if (fs.existsSync(counterFile)) {
      const counterContent = fs.readFileSync(counterFile, 'utf8').trim();
      counter = parseInt(counterContent) || 1;
    }
  } catch (error) {
    console.log('🔄 Starting counter from 1');
  }
  
  // Increment and save counter
  const nextCounter = counter + 1;
  try {
    fs.writeFileSync(counterFile, nextCounter.toString());
  } catch (error) {
    console.log('⚠️ Could not save counter, but continuing...');
  }
  
  const appId = `test${counter}`;
  console.log(`🆔 Generated APP_ID: ${appId}`);
  return appId;
}

// Main execution function
async function main() {
  try {
    console.log('🚀 WTAF Test Script v3.0 - Enhanced with 14-Point Validation');
    console.log('✨ Features: Sequential APP_IDs, Auto-fix, Comprehensive Validation');
    console.log('📖 Loads prompt.txt and injects collaborative database data\n');

    rl.question('What would you like to build? ', async (userRequest) => {
      if (!userRequest.trim()) {
        console.log('❌ Please provide a request.');
        rl.close();
        return;
      }

      try {
        console.log('\n📝 Loading enhanced prompt template...');
        
        const promptPath = path.join(__dirname, 'prompt.txt');
        if (!fs.existsSync(promptPath)) {
          console.log('❌ prompt.txt not found');
          rl.close();
          return;
        }

        let promptTemplate = fs.readFileSync(promptPath, 'utf8');
        
        // Generate sequential APP_ID
        const appId = generateAppId();
        
        // Enhanced APP_ID replacement - handles any existing APP_ID pattern
        console.log('🔧 Injecting sequential APP_ID into prompt...');
        const originalPrompt = promptTemplate;
        promptTemplate = promptTemplate.replace(
          /const APP_ID = .+;/gm, 
          `const APP_ID = '${appId}';`
        );
        
        // Verification that replacement worked
        if (originalPrompt === promptTemplate) {
          console.log('⚠️ Warning: APP_ID replacement may not have worked');
        } else {
          console.log(`✅ APP_ID successfully set to: ${appId}`);
        }

        // Enhanced user message with critical reminders
        const userMessage = `Build a complete working web app for: ${userRequest}

CRITICAL REMINDERS:
1. COPY all authentication functions EXACTLY - do not modify them
2. Include ALL 4 screens (welcome, new-user, returning-user, main)
3. Use the EXACT database structure provided
4. Put your app functionality ONLY in the #app-content div
5. The authentication WILL FAIL if you modify the login functions
6. Use APP_ID = '${appId}' (do NOT generate a random APP_ID)

${promptTemplate}`;

        console.log('🤖 Sending request to OpenAI GPT-4...');
        
        const completion = await openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { role: "user", content: userMessage }
          ],
          temperature: 0.2  // Lower temperature for consistency
        });

        let htmlContent = completion.choices[0].message.content;
        
        // Enhanced validation system with 14 critical checks
        console.log('\n🔍 Running comprehensive validation (14 critical checks)...');
        
        const criticalChecks = {
          'HTML file structure': htmlContent.includes('<!DOCTYPE html>'),
          'Supabase client setup': htmlContent.includes('window.supabase.createClient'),
          'Correct database table': htmlContent.includes('wtaf_zero_admin_collaborative'),
          'Welcome screen': htmlContent.includes('id="welcome-screen"'),
          'New user screen': htmlContent.includes('id="new-user-screen"'),  
          'Returning user screen': htmlContent.includes('id="returning-user-screen"'),
          'Main screen': htmlContent.includes('id="main-screen"'),
          'App content div': htmlContent.includes('id="app-content"'),
          'Authentication functions': htmlContent.includes('generateNewUser()') && htmlContent.includes('registerNewUser()'),
          'Screen navigation': htmlContent.includes('showScreen('),
          'User capacity check': htmlContent.includes('usedLabels.length >= 5'),
          'Database insert pattern': htmlContent.includes('participant_id') && htmlContent.includes('action_type'),
          'Required CSS styles': htmlContent.includes('.screen') && htmlContent.includes('.screen.active'),
          'Correct APP_ID usage': htmlContent.includes(`APP_ID = '${appId}'`)
        };

        console.log('\n📊 Validation Results:');
        let passCount = 0;
        for (const [check, result] of Object.entries(criticalChecks)) {
          const status = result ? '✅ PASS' : '❌ FAIL';
          console.log(`   ${status} ${check}`);
          if (result) passCount++;
        }
        
        console.log(`\n📈 Overall: ${passCount}/${Object.keys(criticalChecks).length} checks passed`);

        // Auto-fix common issues (including APP_ID verification)
        console.log('\n🔧 Running auto-fix system...');
        htmlContent = autoFixCommonIssues(htmlContent, appId);

        if (passCount < Object.keys(criticalChecks).length) {
          console.log('\n⚠️ Some validation checks failed. Common issues:');
          console.log('   • Authentication functions were modified (should be copied exactly)');
          console.log('   • Missing required HTML structure (4 screens)');
          console.log('   • Incorrect database field names');
          console.log('   • Modified APP_ID generation logic');
        }

        // Extract HTML content
        const htmlMatch = htmlContent.match(/```html\n([\s\S]*?)\n```/);
        if (htmlMatch) {
          htmlContent = htmlMatch[1];
        } else {
          console.log('⚠️ No HTML code block found, using full response');
        }

        // Generate filename and save
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${userRequest.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').substring(0, 50)}-${timestamp}.html`;
        const filepath = path.join(__dirname, filename);
        
        fs.writeFileSync(filepath, htmlContent);
        
        console.log(`\n🎉 Success! Generated: ${filename}`);
        console.log(`📁 File saved to: ${filepath}`);
        console.log(`🆔 APP_ID for this instance: ${appId}`);
        console.log('\n💡 Tips:');
        console.log('   • Open the HTML file in a browser to test');
        console.log('   • Multiple users can collaborate using the same APP_ID');
        console.log('   • Check the database validation results above');
        
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
      
      rl.close();
    });
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    rl.close();
  }
}

// Auto-fix common issues function
function autoFixCommonIssues(htmlContent, appId) {
  console.log('🔧 Auto-fixing common issues...');
  
  let fixes = 0;
  
  // Fix 1: Ensure correct APP_ID is used throughout
  if (!htmlContent.includes(`APP_ID = '${appId}'`)) {
    htmlContent = htmlContent.replace(/const APP_ID = .+;/g, `const APP_ID = '${appId}';`);
    fixes++;
    console.log('   ✅ Fixed APP_ID assignment');
  }
  
  // Fix 2: Ensure Supabase client initialization is correct
  if (!htmlContent.includes('window.supabase.createClient')) {
    console.log('   ⚠️ Missing correct Supabase client setup');
  }
  
  // Fix 3: Check for screen.active CSS
  if (!htmlContent.includes('.screen.active')) {
    console.log('   ⚠️ Missing critical CSS for screen navigation');
  }
  
  // Fix 4: Verify database table name
  if (htmlContent.includes('wtaf_zero_admin') && !htmlContent.includes('wtaf_zero_admin_collaborative')) {
    htmlContent = htmlContent.replace(/wtaf_zero_admin/g, 'wtaf_zero_admin_collaborative');
    fixes++;
    console.log('   ✅ Fixed database table name');
  }
  
  if (fixes > 0) {
    console.log(`   🔧 Applied ${fixes} automatic fixes`);
  } else {
    console.log('   ✅ No automatic fixes needed');
  }
  
  return htmlContent;
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { generateAppId, autoFixCommonIssues };