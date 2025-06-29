const { join } = require('path');

// Import the UUID replacement function
async function testUUIDReplacement() {
    try {
        // Import the utils function
        const modulePath = join(process.cwd(), 'dist/engine/shared/utils.js');
        const { replaceAppTableId } = await import(`file://${modulePath}`);
        
        console.log('🧪 TESTING UUID REPLACEMENT FUNCTION');
        console.log('=' .repeat(50));
        
        // Test HTML with hardcoded UUID (like Claude generates)
        const testHTML = `
        async function loadLinks() {
            try {
                const { data: submissions, error } = await supabaseClient
                    .from('wtaf_submissions')
                    .select('submission_data, created_at')
                    .eq('app_id', 'd8b85720-e7a8-4e44-9dd5-3b2f9c269754')
                    .order('created_at', { ascending: false })
            } catch (error) {
                console.error('Error:', error)
            }
        }`;
        
        const correctUUID = 'CORRECT-UUID-HERE-12345';
        
        console.log('📝 Original HTML:');
        console.log(testHTML);
        
        console.log('\n🔧 Applying replaceAppTableId...');
        const replacedHTML = replaceAppTableId(testHTML, correctUUID);
        
        console.log('\n📝 Replaced HTML:');
        console.log(replacedHTML);
        
        // Check if replacement worked
        if (replacedHTML.includes(correctUUID)) {
            console.log('\n✅ UUID replacement WORKED');
        } else {
            console.log('\n❌ UUID replacement FAILED');
        }
        
        if (replacedHTML.includes('d8b85720-e7a8-4e44-9dd5-3b2f9c269754')) {
            console.log('❌ Old UUID still present');
        } else {
            console.log('✅ Old UUID removed');
        }
        
    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

testUUIDReplacement().catch(console.error); 