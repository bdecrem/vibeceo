const fs = require('fs');
const path = require('path');

function checkSystemPrompts() {
    console.log('🔍 Checking system prompts...\n');
    
    const files = [
        'engine/controller.ts',
        'content/builder-admin-technical.json'
    ];
    
    let allGood = true;
    
    files.forEach(file => {
        try {
            const content = fs.readFileSync(file, 'utf8');
            const checks = {
                'Uses API endpoints': content.includes('/api/form/submit') && content.includes('/api/form/submissions'),
                'No Supabase client': !content.includes('window.supabase.createClient'),
                'No Supabase script': !content.includes('@supabase/supabase-js'),
                'No URL placeholder': !content.includes('YOUR_SUPABASE_URL'),
                'No key placeholder': !content.includes('YOUR_SUPABASE_ANON_KEY')
            };
            
            console.log(`📄 ${file}:`);
            for (const [check, passed] of Object.entries(checks)) {
                const status = passed ? '✅' : '❌';
                console.log(`  ${status} ${check}`);
                if (!passed) allGood = false;
            }
            console.log();
        } catch (error) {
            console.log(`❌ Could not read ${file}: ${error.message}`);
            allGood = false;
        }
    });
    
    return allGood;
}

function checkPostProcessing() {
    console.log('🔧 Checking post-processing function...\n');
    
    try {
        const utilsContent = fs.readFileSync('engine/shared/utils.ts', 'utf8');
        const checks = {
            'Has convertSupabaseToApiCalls': utilsContent.includes('convertSupabaseToApiCalls'),
            'Converts insert calls': utilsContent.includes('supabase.from(\'wtaf_submissions\').insert'),
            'Converts select calls': utilsContent.includes('supabase.from(\'wtaf_submissions\').select'),
            'Removes Supabase client': utilsContent.includes('window.supabase.createClient')
        };
        
        console.log('📄 Post-processing function:');
        for (const [check, passed] of Object.entries(checks)) {
            const status = passed ? '✅' : '❌';
            console.log(`  ${status} ${check}`);
        }
        console.log();
        
        return Object.values(checks).every(Boolean);
    } catch (error) {
        console.log(`❌ Could not check post-processing: ${error.message}`);
        return false;
    }
}

function checkApiEndpoints() {
    console.log('🔗 Checking API endpoints exist...\n');
    
    const endpoints = [
        '../web/app/api/form/submit/route.ts',
        '../web/app/api/form/submissions/route.ts'
    ];
    
    let allExist = true;
    
    endpoints.forEach(endpoint => {
        if (fs.existsSync(endpoint)) {
            console.log(`✅ ${endpoint} exists`);
        } else {
            console.log(`❌ ${endpoint} missing`);
            allExist = false;
        }
    });
    
    console.log();
    return allExist;
}

function checkRecentOutput() {
    console.log('📊 Checking recent output...\n');
    
    try {
        const outputDir = 'data/claude_outputs';
        const files = fs.readdirSync(outputDir)
            .filter(f => f.startsWith('output_'))
            .sort()
            .reverse()
            .slice(0, 1);
        
        if (files.length === 0) {
            console.log('⚠️ No recent output files found');
            return false;
        }
        
        const latestFile = path.join(outputDir, files[0]);
        const content = fs.readFileSync(latestFile, 'utf8');
        
        const checks = {
            'Uses API submit': content.includes('/api/form/submit'),
            'Uses API submissions': content.includes('/api/form/submissions'),
            'No Supabase client': !content.includes('window.supabase.createClient'),
            'No Supabase script': !content.includes('@supabase/supabase-js'),
            'No URL placeholder': !content.includes('YOUR_SUPABASE_URL'),
            'No key placeholder': !content.includes('YOUR_SUPABASE_ANON_KEY')
        };
        
        console.log(`📄 Latest output (${files[0]}):`);
        let allPassed = true;
        for (const [check, passed] of Object.entries(checks)) {
            const status = passed ? '✅' : '❌';
            console.log(`  ${status} ${check}`);
            if (!passed) allPassed = false;
        }
        console.log();
        
        return allPassed;
    } catch (error) {
        console.log(`❌ Could not check recent output: ${error.message}`);
        return false;
    }
}

function runMigrationVerification() {
    console.log('🚀 API Migration Verification\n');
    console.log('='.repeat(50));
    console.log();
    
    const results = {
        'System Prompts': checkSystemPrompts(),
        'Post-Processing': checkPostProcessing(),
        'API Endpoints': checkApiEndpoints(),
        'Recent Output': checkRecentOutput()
    };
    
    console.log('📋 SUMMARY');
    console.log('='.repeat(50));
    let allPassed = true;
    for (const [category, passed] of Object.entries(results)) {
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${category}`);
        if (!passed) allPassed = false;
    }
    
    console.log();
    if (allPassed) {
        console.log('🎉 MIGRATION COMPLETE! All checks passed.');
        console.log('🔒 Forms now use secure API endpoints instead of direct Supabase access.');
    } else {
        console.log('⚠️ Migration incomplete. Please address the failing checks above.');
    }
    
    return allPassed;
}

// Run the verification
runMigrationVerification(); 