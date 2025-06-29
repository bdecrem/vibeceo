const { join } = require('path');

async function testStackDBFlow() {
    try {
        // Import stackdb functions
        const modulePath = join(process.cwd(), 'dist/engine/stackables-manager.js');
        const stackModule = await import(`file://${modulePath}`);
        
        // Import UUID replacement function  
        const utilsPath = join(process.cwd(), 'dist/engine/shared/utils.js');
        const { replaceAppTableId } = await import(`file://${utilsPath}`);
        
        console.log('🧪 TESTING FULL STACKDB FLOW');
        console.log('=' .repeat(50));
        
        // Test 1: Get UUID for bronze-eagle-running
        console.log('\n📋 Step 1: Get UUID for bronze-eagle-running');
        const appUuid = await stackModule.getAppUUIDForStackDB('bart', 'bronze-eagle-running');
        console.log(`Retrieved UUID: ${appUuid}`);
        
        if (appUuid !== '7d970033-5ab3-4ceb-9f89-910c8c0c0925') {
            console.log('❌ WRONG UUID! Expected: 7d970033-5ab3-4ceb-9f89-910c8c0c0925');
        } else {
            console.log('✅ Correct UUID retrieved');
        }
        
        // Test 2: Build enhanced prompt
        console.log('\n📋 Step 2: Build enhanced prompt');
        const enhancedPrompt = await stackModule.buildEnhancedDBPrompt(
            'build me a dashboard showing all the links', 
            appUuid
        );
        
        console.log(`Enhanced prompt length: ${enhancedPrompt.length}`);
        console.log(`Contains correct UUID: ${enhancedPrompt.includes(appUuid) ? 'YES' : 'NO'}`);
        
        // Test 3: Simulate what Claude would return (with wrong UUID)
        console.log('\n📋 Step 3: Simulate Claude response with wrong UUID');
        const mockClaudeResponse = `
        <script>
        async function loadData() {
            const { data, error } = await supabaseClient
                .from('wtaf_submissions')
                .select('submission_data, created_at')
                .eq('app_id', 'd8b85720-e7a8-4e44-9dd5-3b2f9c269754')
                .order('created_at', { ascending: false });
        }
        </script>`;
        
        console.log('Mock Claude response contains wrong UUID:', 'd8b85720-e7a8-4e44-9dd5-3b2f9c269754');
        
        // Test 4: Apply UUID replacement
        console.log('\n📋 Step 4: Apply UUID replacement');
        const fixedHTML = replaceAppTableId(mockClaudeResponse, appUuid);
        
        console.log('Fixed HTML:');
        console.log(fixedHTML);
        
        if (fixedHTML.includes(appUuid)) {
            console.log('✅ UUID replacement worked - correct UUID found in result');
        } else {
            console.log('❌ UUID replacement failed - correct UUID NOT found');
        }
        
        if (fixedHTML.includes('d8b85720-e7a8-4e44-9dd5-3b2f9c269754')) {
            console.log('❌ Old wrong UUID still present');
        } else {
            console.log('✅ Wrong UUID successfully removed');
        }
        
        console.log('\n🎯 SUMMARY:');
        console.log(`Expected UUID: 7d970033-5ab3-4ceb-9f89-910c8c0c0925`);
        console.log(`Retrieved UUID: ${appUuid}`);
        console.log(`Replacement worked: ${fixedHTML.includes(appUuid) && !fixedHTML.includes('d8b85720-e7a8-4e44-9dd5-3b2f9c269754')}`);
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
        console.error(error);
    }
}

testStackDBFlow().catch(console.error); 