const fs = require('fs');
const path = require('path');
const readline = require('readline');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });

// Initialize Anthropic
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Create readline interface for user input
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

function loadPromptTemplate() {
  const promptPath = path.join(__dirname, 'prompt.txt');
  try {
    return fs.readFileSync(promptPath, 'utf-8');
  } catch (error) {
    console.error('Error reading prompt.txt:', error);
    console.error('Make sure prompt.txt exists in the same directory as this script.');
    process.exit(1);
  }
}

function generateAppId() {
  const counterFile = path.join(__dirname, '.test-counter');
  let counter = 1;
  
  try {
    if (fs.existsSync(counterFile)) {
      const saved = fs.readFileSync(counterFile, 'utf-8');
      counter = parseInt(saved) || 1;
    }
  } catch (error) {
    console.log('📝 Starting with test1 (first run)');
  }
  
  const appId = `test${counter}`;
  
  try {
    fs.writeFileSync(counterFile, (counter + 1).toString());
  } catch (error) {
    console.warn('⚠️  Could not save counter, next run will reuse same ID');
  }
  
  return appId;
}

async function generateHTMLApp(userRequest, promptTemplate, appId) {
  // Replace the [USER REQUEST] placeholder with actual user input
  let systemPrompt = promptTemplate.replace(/\[USER REQUEST\]/g, userRequest);
  
  // Replace ANY APP_ID assignment with our generated one
  // This will match any pattern: 'app-xxx', 'shared-wtaf-app', random generation, etc.
  systemPrompt = systemPrompt.replace(
    /const APP_ID = .+;/gm, 
    `const APP_ID = '${appId}';`
  );
  
  // Also tell Claude explicitly to use this APP_ID in the user message
  const userMessage = `Build a complete working web app for: ${userRequest}

CRITICAL REMINDERS:
1. COPY all authentication functions EXACTLY - do not modify them
2. Include ALL 4 screens (welcome, new-user, returning-user, main)
3. Use the EXACT database structure provided
4. Put your app functionality ONLY in the #app-content div
5. The authentication WILL FAIL if you modify the login functions
6. Use APP_ID = '${appId}' (do NOT generate a random APP_ID)

Return ONLY the complete HTML file, no explanations.`;
  
  // Verify the replacement worked
  if (systemPrompt.includes(`APP_ID = '${appId}'`)) {
    console.log(`✅ APP_ID successfully set to: ${appId}`);
  } else {
    console.warn(`⚠️  APP_ID replacement may have failed. Will enforce in generated HTML.`);
  }
  
  console.log('\n🤖 Sending request to Claude 3.5 Sonnet...');
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,  // Claude has higher limits
      temperature: 0.4,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    // Claude returns content differently
    const htmlContent = response.content[0].text;
    
    if (!htmlContent) {
      throw new Error('No content returned from Claude');
    }

    return htmlContent;
  } catch (error) {
    console.error('Error calling Claude:', error);
    throw error;
  }
}

function extractHTMLFromResponse(response) {
  // Look for HTML content within code blocks
  const htmlMatch = response.match(/```html\n([\s\S]*?)\n```/i) || 
                   response.match(/```\n([\s\S]*?)\n```/i);
  
  if (htmlMatch) {
    return htmlMatch[1].trim();
  }
  
  // If no code blocks found, check if the response starts with HTML
  if (response.trim().toLowerCase().startsWith('<!doctype html') || 
      response.trim().toLowerCase().startsWith('<html')) {
    return response.trim();
  }
  
  // If it looks like HTML but doesn't have proper structure, return as-is
  if (response.includes('<html') || response.includes('<!DOCTYPE')) {
    return response;
  }
  
  // If no HTML found, throw error
  throw new Error('No valid HTML found in Claude response. Response may be incomplete or malformed.');
}

function validateHTMLStructure(htmlContent, expectedAppId) {
  const criticalChecks = {
    'Supabase Client': htmlContent.includes('supabase.createClient'),
    'App ID Exists': htmlContent.includes('const APP_ID ='),
    'App ID Correct': htmlContent.includes(`APP_ID = '${expectedAppId}'`),
    'User Labels': htmlContent.includes('USER_LABELS'),
    'Generate User Function': htmlContent.includes('async function generateNewUser()'),
    'Register User Function': htmlContent.includes('async function registerNewUser()'),
    'Login Function': htmlContent.includes('async function loginReturningUser()'),
    'Capacity Check': htmlContent.includes('usedLabels.length >= 5'),
    'User Record Find': htmlContent.includes('joinRecords?.find(record =>'),
    'Participant Data Check': htmlContent.includes('record.participant_data?.userLabel'),
    'Welcome Screen': htmlContent.includes('welcome-screen'),
    'New User Screen': htmlContent.includes('new-user-screen'),
    'Returning User Screen': htmlContent.includes('returning-user-screen'),
    'Main Screen': htmlContent.includes('main-screen'),
    'Show New User Async': htmlContent.includes('async function showNewUserScreen()')
  };
  
  const results = {};
  const issues = [];
  
  for (const [check, result] of Object.entries(criticalChecks)) {
    results[check] = result;
    if (!result) {
      issues.push(check);
    }
  }
  
  return { results, issues, isValid: issues.length === 0 };
}

function autoFixCommonIssues(htmlContent, appId) {
  let fixed = htmlContent;
  
  // Fix 1: Ensure showNewUserScreen is async
  if (!fixed.includes('async function showNewUserScreen()')) {
    fixed = fixed.replace(
      'function showNewUserScreen()',
      'async function showNewUserScreen()'
    );
    console.log('🔧 Fixed: Made showNewUserScreen async');
  }
  
  // Fix 2: If APP_ID is not correct, fix it as a safety measure
  if (!fixed.includes(`APP_ID = '${appId}'`)) {
    fixed = fixed.replace(
      /const APP_ID = .+;/gm,
      `const APP_ID = '${appId}';`
    );
    console.log(`🔧 Fixed: Set APP_ID to ${appId}`);
  }
  
  // Fix 3: Ensure proper participant_data access
  if (fixed.includes('.eq(\'userLabel\'')) {
    console.log('⚠️  Warning: Direct userLabel query detected - manual fix may be needed');
  }
  
  return fixed;
}

function saveHTMLFile(htmlContent, userRequest) {
  // Create a safe filename from the user request
  const safeFileName = userRequest
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${safeFileName}-${timestamp}.html`;
  const filePath = path.join(__dirname, fileName);
  
  try {
    fs.writeFileSync(filePath, htmlContent, 'utf-8');
    return { fileName, filePath };
  } catch (error) {
    console.error('Error saving HTML file:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 WTAF Zero-Admin App Generator v3.1 Claude Edition');
  console.log('==================================================');
  console.log('🤖 Powered by Claude 3.5 Sonnet (8K tokens)');
  console.log('✨ Sequential App IDs: Each run gets test1, test2, test3...');
  console.log('🤝 Users within each app can collaborate!');
  console.log('🔧 Now with improved APP_ID handling!\n');
  
  try {
    // Load the prompt template
    console.log('📖 Loading prompt template...');
    const promptTemplate = loadPromptTemplate();
    
    // Get user input
    const userRequest = await askQuestion('💭 What would you like to build? ');
    
    if (!userRequest.trim()) {
      console.log('❌ Please provide a valid request.');
      rl.close();
      return;
    }
    
    console.log(`\n🎯 Building: "${userRequest}"`);
    
    // Generate unique app ID for this test
    const appId = generateAppId();
    console.log(`🆔 App ID: ${appId}`);
    
    // Generate the HTML app
    const response = await generateHTMLApp(userRequest, promptTemplate, appId);
    
    // Extract HTML from the response
    console.log('🔍 Extracting HTML...');
    let htmlContent = extractHTMLFromResponse(response);
    
    // Auto-fix common issues (including APP_ID verification)
    console.log('🔧 Checking for common issues...');
    htmlContent = autoFixCommonIssues(htmlContent, appId);
    
    // Validate the structure
    console.log('✅ Validating structure...');
    const validation = validateHTMLStructure(htmlContent, appId);
    
    // Save the HTML file
    const { fileName, filePath } = saveHTMLFile(htmlContent, userRequest);
    
    console.log('\n✅ File saved successfully!');
    console.log(`📁 HTML file: ${fileName}`);
    console.log(`📍 Location: ${filePath}`);
    console.log(`🆔 App ID: ${appId} (all users will share this instance)`);
    
    // Show detailed validation results
    console.log('\n🔍 Validation Results:');
    console.log('─'.repeat(50));
    
    let passCount = 0;
    for (const [check, passed] of Object.entries(validation.results)) {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
      if (passed) passCount++;
    }
    
    const totalChecks = Object.keys(validation.results).length;
    const passRate = Math.round((passCount / totalChecks) * 100);
    
    console.log('─'.repeat(50));
    console.log(`📊 Pass Rate: ${passCount}/${totalChecks} (${passRate}%)`);
    
    if (validation.isValid) {
      console.log('\n🎉 Perfect! Your app should work immediately.');
      console.log(`💡 Open the HTML file in your browser to test!`);
      console.log(`🤝 For collaboration: Open the same file in multiple browser windows/tabs!`);
      console.log(`📊 All users will connect to app instance "${appId}"`);
    } else {
      console.log('\n⚠️  Issues detected:');
      validation.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
      
      console.log('\n🔧 Common fixes:');
      if (validation.issues.includes('App ID Correct')) {
        console.log(`   - APP_ID should be set to '${appId}'`);
      }
      if (validation.issues.includes('Show New User Async')) {
        console.log('   - Make showNewUserScreen function async');
      }
      if (validation.issues.includes('Participant Data Check')) {
        console.log('   - Ensure login checks record.participant_data?.userLabel');
      }
      if (validation.issues.includes('Capacity Check')) {
        console.log('   - Add check for usedLabels.length >= 5');
      }
    }
    
    // Additional tips based on common issues
    if (passRate < 100) {
      console.log('\n💡 Pro tips:');
      console.log('   - The authentication functions must be copied EXACTLY');
      console.log('   - User data is nested in participant_data, not at top level');
      console.log('   - Always check capacity before creating new users');
      console.log('   - Test with multiple users to ensure login works');
      console.log(`   - Verify APP_ID is set to '${appId}' in the generated HTML`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('No valid HTML')) {
      console.log('\n🔧 Troubleshooting:');
      console.log('- Claude may have returned explanation text instead of code');
      console.log('- Try a simpler request');
      console.log('- Make sure the prompt emphasizes returning ONLY HTML');
    }
  } finally {
    rl.close();
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Goodbye!');
  rl.close();
  process.exit(0);
});

// Run the script
main().catch(console.error);