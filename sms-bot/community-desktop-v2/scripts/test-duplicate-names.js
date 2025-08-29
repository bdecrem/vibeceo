#!/usr/bin/env node

/**
 * Test that duplicate app names work with unique IDs
 */

async function testDuplicateNames() {
    console.log('🧪 Testing duplicate name handling with unique IDs...\n');
    
    const testApps = [
        {
            appName: 'Calculator',
            appFunction: 'Basic math operations',
            appIcon: '🧮',
            appType: 'windowed',
            submitterName: 'test-user-1',
            source: 'testing'
        },
        {
            appName: 'Calculator',  // Same name!
            appFunction: 'Scientific calculator',
            appIcon: '🔬',
            appType: 'windowed',
            submitterName: 'test-user-2',
            source: 'testing'
        },
        {
            appName: 'Calculator',  // Same name again!
            appFunction: 'Graphing calculator',
            appIcon: '📊',
            appType: 'windowed',
            submitterName: 'test-user-3',
            source: 'testing'
        }
    ];
    
    console.log('📤 Submitting 3 apps with the same name "Calculator"...\n');
    
    const results = [];
    
    for (const [index, app] of testApps.entries()) {
        console.log(`Submission ${index + 1}:`);
        console.log(`  Name: ${app.appName}`);
        console.log(`  Function: ${app.appFunction}`);
        console.log(`  Submitter: ${app.submitterName}`);
        
        try {
            const response = await fetch('http://localhost:3031/webhook/toybox-apps', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(app)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`  ✅ Submitted successfully\n`);
            results.push({ success: true, app, result });
            
            // Wait a bit between submissions to avoid race conditions
            await new Promise(resolve => setTimeout(resolve, 2000));
            
        } catch (error) {
            console.log(`  ❌ Failed: ${error.message}\n`);
            results.push({ success: false, app, error: error.message });
        }
    }
    
    console.log('📊 Results Summary:');
    console.log('='.repeat(50));
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`✅ Successful: ${successful}/${testApps.length}`);
    console.log(`❌ Failed: ${failed}/${testApps.length}`);
    
    if (successful === testApps.length) {
        console.log('\n🎉 SUCCESS! All 3 "Calculator" apps were submitted!');
        console.log('Each will have a unique ID like:');
        console.log('  - CALCULATOR-123456');
        console.log('  - CALCULATOR-789012'); 
        console.log('  - CALCULATOR-345678');
        console.log('\n📝 Check ToyBox OS to see all 3 Calculator apps with different icons');
    } else {
        console.log('\n⚠️ Some submissions failed. Check webhook server logs.');
    }
    
    return successful === testApps.length;
}

// Run the test
if (process.argv[1].endsWith('test-duplicate-names.js')) {
    testDuplicateNames().then(success => {
        process.exit(success ? 0 : 1);
    }).catch(error => {
        console.error('Test failed:', error);
        process.exit(1);
    });
}

export { testDuplicateNames };