const { join } = require('path');
const { writeFile, readFile } = require('fs/promises');

async function testRealStackDB() {
    try {
        console.log('🧪 TESTING REAL STACKDB COMMAND PROCESSING');
        console.log('=' .repeat(60));
        
        // Import controller functions
        const controllerPath = join(process.cwd(), 'dist/engine/controller.js');
        // Since controller is an entry point, we need to import individual functions
        
        // Import stackables manager
        const stackablesPath = join(process.cwd(), 'dist/engine/stackables-manager.js');
        const stackables = await import(`file://${stackablesPath}`);
        
        // Import utils for UUID replacement
        const utilsPath = join(process.cwd(), 'dist/engine/shared/utils.js');
        const { replaceAppTableId, extractCodeBlocks } = await import(`file://${utilsPath}`);
        
        // Test the exact command user is sending
        const userCommand = 'wtaf --stackdb bronze-eagle-running build me a page showing all the links';
        console.log(`\n📝 Testing command: "${userCommand}"`);
        
        // Step 1: Process stackdb request (what controller does)
        console.log('\n📋 Step 1: Process stackdb request');
        const stackResult = await stackables.processStackDBRequest('bart', userCommand);
        
        if (!stackResult.success) {
            console.log('❌ StackDB processing failed:', stackResult.error);
            return;
        }
        
        console.log('✅ StackDB processing succeeded');
        console.log(`   User Request: ${stackResult.userRequest}`);
        console.log(`   App UUID: ${stackResult.appUuid}`);
        console.log(`   Enhanced Prompt Length: ${stackResult.enhancedPrompt?.length}`);
        
        // Step 2: Load stackdb system prompt (what controller does)
        console.log('\n📋 Step 2: Load stackdb system prompt');
        const promptPath = join(__dirname, '..', 'content', 'stackdb-gpt-prompt.txt');
        const systemPrompt = await readFile(promptPath, 'utf8');
        console.log(`✅ System prompt loaded: ${systemPrompt.length} characters`);
        
        // Step 3: Simulate Claude call (shortened)
        console.log('\n📋 Step 3: Simulate Claude response');
        const mockClaudeResponse = `\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <title>THE SCRAPPILE</title>
    <script src="https://unpkg.com/@supabase/supabase-js@2"></script>
</head>
<body>
    <h1>THE SCRAPPILE</h1>
    <div id="links"></div>
    
    <script>
        const SUPABASE_URL = 'https://tqniseocczttrfwtpbdr.supabase.co'
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

        async function loadLinks() {
            const { data: submissions, error } = await supabaseClient
                .from('wtaf_submissions')
                .select('submission_data, created_at')
                .eq('app_id', 'd8b85720-e7a8-4e44-9dd5-3b2f9c269754')
                .order('created_at', { ascending: false })
        }
        
        loadLinks()
    </script>
</body>
</html>
\`\`\``;

        console.log('✅ Mock Claude response created with wrong UUID: d8b85720-e7a8-4e44-9dd5-3b2f9c269754');
        
        // Step 4: Extract code blocks (what controller does)
        console.log('\n📋 Step 4: Extract code blocks');
        const code = extractCodeBlocks(mockClaudeResponse);
        console.log(`✅ Code extracted: ${code.length} characters`);
        console.log(`   Contains wrong UUID: ${code.includes('d8b85720-e7a8-4e44-9dd5-3b2f9c269754') ? 'YES' : 'NO'}`);
        
        // Step 5: Apply UUID replacement (CRITICAL STEP)
        console.log('\n📋 Step 5: Apply UUID replacement');
        console.log(`   Original UUID in code: d8b85720-e7a8-4e44-9dd5-3b2f9c269754`);
        console.log(`   Target UUID: ${stackResult.appUuid}`);
        
        const codeWithUuid = replaceAppTableId(code, stackResult.appUuid);
        
        console.log(`✅ UUID replacement applied`);
        console.log(`   Fixed code contains correct UUID: ${codeWithUuid.includes(stackResult.appUuid) ? 'YES' : 'NO'}`);
        console.log(`   Fixed code contains old UUID: ${codeWithUuid.includes('d8b85720-e7a8-4e44-9dd5-3b2f9c269754') ? 'YES' : 'NO'}`);
        
        // Step 6: Show before/after
        console.log('\n📋 Step 6: Before/After Comparison');
        console.log('BEFORE (extracted from Claude):');
        const beforeLine = code.match(/\.eq\('app_id',\s*'[^']+'\)/);
        console.log(`   ${beforeLine ? beforeLine[0] : 'NOT FOUND'}`);
        
        console.log('AFTER (with UUID replacement):');
        const afterLine = codeWithUuid.match(/\.eq\('app_id',\s*'[^']+'\)/);
        console.log(`   ${afterLine ? afterLine[0] : 'NOT FOUND'}`);
        
        // Step 7: Save test output
        const outputPath = join(__dirname, '..', 'logs', `stackdb-test-${Date.now()}.html`);
        await writeFile(outputPath, codeWithUuid, 'utf8');
        console.log(`\n💾 Test result saved to: ${outputPath}`);
        
        console.log('\n🎯 FINAL RESULT:');
        if (codeWithUuid.includes(stackResult.appUuid) && !codeWithUuid.includes('d8b85720-e7a8-4e44-9dd5-3b2f9c269754')) {
            console.log('✅ SUCCESS: UUID replacement worked correctly');
            console.log('   The stackdb system should work properly');
        } else {
            console.log('❌ FAILURE: UUID replacement did not work');
            console.log('   This explains why your pages show wrong data');
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.error(error);
    }
}

testRealStackDB().catch(console.error); 