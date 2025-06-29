const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
require('dotenv').config({ path: '.env.local' });

// Debug: Check if environment variables are loaded
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'loaded' : 'missing');
console.log('SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'loaded' : 'missing');

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

// Import stackdb functions from the engine
async function importStackDBFunctions() {
    try {
        // Import using dynamic import with file:// URL
        const modulePath = join(process.cwd(), 'dist/engine/stackables-manager.js');
        const module = await import(`file://${modulePath}`);
        return {
            parseStackDBCommand: module.parseStackDBCommand,
            getAppUUIDForStackDB: module.getAppUUIDForStackDB,
            buildEnhancedDBPrompt: module.buildEnhancedDBPrompt,
            processStackDBRequest: module.processStackDBRequest
        };
    } catch (error) {
        console.log(`❌ Failed to import stackdb functions: ${error.message}`);
        console.log(`🔧 Make sure to run 'npm run build' first to compile TypeScript`);
        return null;
    }
}

// Test 1: Parse stackdb command
function testParseStackDBCommand(parseStackDBCommand) {
    console.log('\n🧪 TEST 1: Parse StackDB Command');
    console.log('=' .repeat(50));
    
    const testCases = [
        'wtaf --stackdb my-app build me a dashboard',
        '--stackdb signup-form create customer list',
        'wtaf --stackdb contact-form make analytics page',
        'invalid command format',
        '--stackdb',
        'wtaf --stackdb only-app-slug'
    ];
    
    testCases.forEach((input, index) => {
        console.log(`\nTest ${index + 1}: "${input}"`);
        const result = parseStackDBCommand(input);
        if (result) {
            console.log(`✅ Parsed: appSlug="${result.appSlug}", userRequest="${result.userRequest}"`);
        } else {
            console.log(`❌ Failed to parse`);
        }
    });
}

// Test 2: Get app UUID (requires database)
async function testGetAppUUID(getAppUUIDForStackDB) {
    console.log('\n🧪 TEST 2: Get App UUID');
    console.log('=' .repeat(50));
    
    // First, let's see what apps exist for our user
    console.log(`\n📋 Checking existing apps for user: ${HARDCODED_USER_SLUG}`);
    const { data: apps, error } = await supabase
        .from('wtaf_content')
        .select('app_slug, id')
        .eq('user_id', HARDCODED_USER_ID)
        .limit(5);
    
    if (error) {
        console.log(`❌ Database error: ${error.message}`);
        return;
    }
    
    if (!apps || apps.length === 0) {
        console.log(`⚠️ No apps found for user ${HARDCODED_USER_SLUG}`);
        return;
    }
    
    console.log(`📱 Found ${apps.length} apps:`);
    apps.forEach(app => {
        console.log(`  - ${app.app_slug} (UUID: ${app.id})`);
    });
    
    // Test with real app
    const testApp = apps[0];
    console.log(`\n🔍 Testing UUID lookup for: ${testApp.app_slug}`);
    const uuid = await getAppUUIDForStackDB(HARDCODED_USER_SLUG, testApp.app_slug);
    
    if (uuid) {
        console.log(`✅ Retrieved UUID: ${uuid}`);
        console.log(`✅ Matches expected: ${uuid === testApp.id}`);
    } else {
        console.log(`❌ Failed to retrieve UUID`);
    }
    
    // Test with non-existent app
    console.log(`\n🔍 Testing with non-existent app: fake-app-123`);
    const fakeUuid = await getAppUUIDForStackDB(HARDCODED_USER_SLUG, 'fake-app-123');
    
    if (fakeUuid === null) {
        console.log(`✅ Correctly returned null for non-existent app`);
    } else {
        console.log(`❌ Should have returned null, got: ${fakeUuid}`);
    }
    
    return testApp; // Return for next test
}

// Test 3: Build enhanced prompt
async function testBuildEnhancedPrompt(buildEnhancedDBPrompt, testApp) {
    console.log('\n🧪 TEST 3: Build Enhanced DB Prompt');
    console.log('=' .repeat(50));
    
    if (!testApp) {
        console.log(`⚠️ Skipping - no test app available`);
        return;
    }
    
    const userRequest = "build me a live dashboard showing all submissions";
    console.log(`\n📝 User request: "${userRequest}"`);
    console.log(`🆔 App UUID: ${testApp.id}`);
    
    const enhancedPrompt = await buildEnhancedDBPrompt(userRequest, testApp.id);
    
    console.log(`\n📏 Enhanced prompt length: ${enhancedPrompt.length} characters`);
    console.log(`\n📋 Enhanced prompt preview (first 500 chars):`);
    console.log('=' .repeat(50));
    console.log(enhancedPrompt.substring(0, 500) + '...');
    console.log('=' .repeat(50));
    
    // Check that UUID is included
    if (enhancedPrompt.includes(testApp.id)) {
        console.log(`✅ UUID correctly included in prompt`);
    } else {
        console.log(`❌ UUID missing from prompt`);
    }
    
    // Check that WTAF design system is included
    if (enhancedPrompt.includes('WTAF STYLE GUIDE')) {
        console.log(`✅ WTAF design system included`);
    } else {
        console.log(`❌ WTAF design system missing`);
    }
    
    return enhancedPrompt;
}

// Test 4: Process complete stackdb request
async function testProcessStackDBRequest(processStackDBRequest, testApp) {
    console.log('\n🧪 TEST 4: Process Complete StackDB Request');
    console.log('=' .repeat(50));
    
    if (!testApp) {
        console.log(`⚠️ Skipping - no test app available`);
        return;
    }
    
    const stackCommand = `wtaf --stackdb ${testApp.app_slug} build me a live customer dashboard`;
    console.log(`\n📝 Stack command: "${stackCommand}"`);
    
    const result = await processStackDBRequest(HARDCODED_USER_SLUG, stackCommand);
    
    console.log(`\n📊 Processing result:`);
    console.log(`  Success: ${result.success}`);
    if (result.success) {
        console.log(`  User Request: "${result.userRequest}"`);
        console.log(`  App UUID: ${result.appUuid}`);
        console.log(`  Enhanced Prompt Length: ${result.enhancedPrompt?.length || 0} characters`);
        console.log(`✅ Complete stackdb request processed successfully`);
    } else {
        console.log(`  Error: ${result.error}`);
        console.log(`❌ Processing failed`);
    }
    
    return result;
}

// Test 5: Send to Claude and generate HTML
async function testClaudeGeneration(enhancedPrompt, testApp) {
    console.log('\n🧪 TEST 5: Claude HTML Generation');
    console.log('=' .repeat(50));
    
    if (!enhancedPrompt || !testApp) {
        console.log(`⚠️ Skipping - missing enhanced prompt or test app`);
        return;
    }
    
    // Load stackdb system prompt
    try {
        const stackdbPromptPath = join(__dirname, '..', 'content', 'stackdb-gpt-prompt.txt');
        const systemPrompt = readFileSync(stackdbPromptPath, 'utf8');
        console.log(`📄 System prompt loaded: ${systemPrompt.length} characters`);
        
        console.log(`\n🚀 Sending to Claude...`);
        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 8192,
            temperature: 0.1,
            system: systemPrompt,
            messages: [{ role: 'user', content: enhancedPrompt }]
        });
        
        const htmlResponse = response.content[0].text;
        console.log(`📥 Claude response length: ${htmlResponse.length} characters`);
        
        // Check for HTML code block
        const htmlMatch = htmlResponse.match(/```html\n([\s\S]*?)\n```/);
        if (htmlMatch) {
            const html = htmlMatch[1];
            console.log(`✅ Found HTML code block: ${html.length} characters`);
            
            // Check for live database features
            const checks = [
                { name: 'Supabase client usage', pattern: /supabase.*from.*wtaf_submissions/i },
                { name: 'App UUID usage', pattern: new RegExp(testApp.id) },
                { name: 'Live data query', pattern: /\.eq\(['"]app_id['"].*\)/i },
                { name: 'Loading state', pattern: /loading/i },
                { name: 'Error handling', pattern: /error|catch|try/i },
                { name: 'WTAF styling', pattern: /gradient|neon|courier|monospace/i }
            ];
            
            console.log(`\n🔍 HTML Feature Analysis:`);
            checks.forEach(check => {
                const found = check.pattern.test(html);
                console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
            });
            
            // Save generated HTML for inspection
            const filename = `stackdb-test-${testApp.app_slug}-${Date.now()}.html`;
            const outputPath = join(__dirname, '..', 'logs', filename);
            
            // Ensure logs directory exists
            const logsDir = join(__dirname, '..', 'logs');
            if (!existsSync(logsDir)) {
                mkdirSync(logsDir, { recursive: true });
            }
            
            writeFileSync(outputPath, html, 'utf8');
            console.log(`💾 Generated HTML saved to: ${outputPath}`);
            
            return html;
        } else {
            console.log(`❌ No HTML code block found in Claude response`);
            console.log(`📝 Response preview:`, htmlResponse.substring(0, 200) + '...');
        }
        
    } catch (error) {
        console.log(`❌ Claude generation failed: ${error.message}`);
    }
}

// Main test runner
async function runAllTests() {
    console.log('🧪 STACKDB COMPREHENSIVE TEST SUITE');
    console.log('=' .repeat(80));
    
    // Import functions
    console.log('\n📦 Importing StackDB functions...');
    const functions = await importStackDBFunctions();
    
    if (!functions) {
        console.log('❌ Failed to import functions. Exiting.');
        rl.close();
        return;
    }
    
    console.log('✅ Functions imported successfully');
    
    const { parseStackDBCommand, getAppUUIDForStackDB, buildEnhancedDBPrompt, processStackDBRequest } = functions;
    
    try {
        // Run tests
        testParseStackDBCommand(parseStackDBCommand);
        
        const testApp = await testGetAppUUID(getAppUUIDForStackDB);
        
        const enhancedPrompt = await testBuildEnhancedPrompt(buildEnhancedDBPrompt, testApp);
        
        await testProcessStackDBRequest(processStackDBRequest, testApp);
        
        await testClaudeGeneration(enhancedPrompt, testApp);
        
        console.log('\n🎉 ALL TESTS COMPLETED');
        console.log('=' .repeat(80));
        
    } catch (error) {
        console.log(`\n❌ Test suite failed: ${error.message}`);
        console.error(error);
    }
    
    rl.close();
}

// Interactive mode
async function interactiveTest() {
    console.log('\n🎯 INTERACTIVE STACKDB TEST');
    console.log('=' .repeat(50));
    
    const functions = await importStackDBFunctions();
    if (!functions) {
        rl.close();
        return;
    }
    
    const input = await askQuestion('Enter your stackdb command: ');
    if (!input.trim()) {
        rl.close();
        return;
    }
    
    console.log('\n🔄 Processing interactive command...');
    const result = await functions.processStackDBRequest(HARDCODED_USER_SLUG, input);
    
    if (result.success) {
        console.log('✅ Command processed successfully!');
        console.log(`📝 Will create: ${result.userRequest}`);
        console.log(`🔗 Using data from app UUID: ${result.appUuid}`);
        
        const proceed = await askQuestion('\nSend to Claude and generate HTML? (y/n): ');
        if (proceed.toLowerCase() === 'y') {
            await testClaudeGeneration(result.enhancedPrompt, { id: result.appUuid, app_slug: 'interactive-test' });
        }
    } else {
        console.log('❌ Command failed:', result.error);
    }
    
    rl.close();
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--interactive') || args.includes('-i')) {
        await interactiveTest();
    } else {
        await runAllTests();
    }
}

process.on('SIGINT', () => {
    rl.close();
    process.exit(0);
});

main().catch(console.error); 