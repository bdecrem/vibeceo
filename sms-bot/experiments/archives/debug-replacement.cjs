const fs = require('fs');
const path = require('path');

function testReplacement() {
  console.log('🔍 Testing APP_ID Replacement Logic\n');
  
  // Load the actual prompt template
  const promptPath = path.join(__dirname, 'prompt.txt');
  const promptTemplate = fs.readFileSync(promptPath, 'utf-8');
  
  console.log('📖 Original prompt contains:');
  const originalLine = promptTemplate.split('\n').find(line => line.includes("APP_ID = 'shared-wtaf-app'"));
  console.log(`   ${originalLine}`);
  
  // Test the replacement
  const testAppId = 'test99';
  let modifiedPrompt = promptTemplate.replace(
    /const APP_ID = 'shared-wtaf-app';.*$/m, 
    `const APP_ID = '${testAppId}';`
  );
  
  console.log('\n🔄 After replacement:');
  const newLine = modifiedPrompt.split('\n').find(line => line.includes("APP_ID = 'test99'"));
  if (newLine) {
    console.log(`   ${newLine}`);
    console.log('✅ Replacement SUCCESSFUL');
  } else {
    console.log('❌ Replacement FAILED');
    console.log('Looking for any APP_ID lines in modified prompt:');
    modifiedPrompt.split('\n').forEach((line, i) => {
      if (line.includes('APP_ID')) {
        console.log(`   Line ${i+1}: ${line}`);
      }
    });
  }
  
  // Test verification
  console.log('\n🔍 Verification check:');
  if (modifiedPrompt.includes(`APP_ID = '${testAppId}'`)) {
    console.log('✅ Verification would PASS');
  } else {
    console.log('❌ Verification would FAIL');
  }
}

testReplacement(); 