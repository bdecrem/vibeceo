const fs = require('fs');
const path = require('path');

// Create a test WTAF request file
async function createTestRequest() {
  console.log('🧪 Testing API Migration - Creating test request...\n');
  
  // Simulate a WTAF --admin request
  const testRequest = "wtaf --admin make an RSVP page for our party tonight";
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `test-api-migration-${timestamp}.txt`;
  const filePath = path.join(__dirname, '..', 'data', 'wtaf', fileName);
  
  // Write test request to wtaf queue
  fs.writeFileSync(filePath, testRequest);
  console.log(`✅ Created test request: ${fileName}`);
  console.log(`📄 Request: ${testRequest}`);
  
  return { fileName, filePath };
}

// Check if HTML uses API endpoints instead of Supabase
function checkForApiEndpoints(html) {
  console.log('\n🔍 Checking generated HTML for API endpoints...\n');
  
  const checks = {
    'API Submit Endpoint': html.includes('/api/form/submit'),
    'API Submissions Endpoint': html.includes('/api/form/submissions'),
    'No Supabase Client': !html.includes('window.supabase.createClient'),
    'No Supabase Script': !html.includes('@supabase/supabase-js'),
    'No Direct Supabase Insert': !html.includes('supabase.from(\'wtaf_submissions\').insert'),
    'No Direct Supabase Select': !html.includes('supabase.from(\'wtaf_submissions\').select'),
    'No Supabase URL Placeholder': !html.includes('YOUR_SUPABASE_URL'),
    'No Supabase Key Placeholder': !html.includes('YOUR_SUPABASE_ANON_KEY')
  };
  
  let allPassed = true;
  for (const [check, passed] of Object.entries(checks)) {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${check}`);
    if (!passed) allPassed = false;
  }
  
  console.log(`\n🎯 Overall Result: ${allPassed ? '✅ MIGRATION SUCCESSFUL' : '❌ MIGRATION INCOMPLETE'}`);
  return allPassed;
}

// Monitor for processed output
function waitForProcessedFile(fileName) {
  return new Promise((resolve, reject) => {
    const processedDir = path.join(__dirname, '..', 'data', 'processed');
    const checkInterval = 1000; // Check every second
    const maxWait = 30000; // Wait max 30 seconds
    let waited = 0;
    
    console.log(`\n⏳ Waiting for engine to process ${fileName}...`);
    
    const checkForFile = () => {
      const files = fs.readdirSync(processedDir);
      const matchingFile = files.find(file => file.includes('test-api-migration'));
      
      if (matchingFile) {
        console.log(`✅ Found processed file: ${matchingFile}`);
        resolve(path.join(processedDir, matchingFile));
      } else if (waited >= maxWait) {
        reject(new Error('Timeout waiting for processed file'));
      } else {
        waited += checkInterval;
        setTimeout(checkForFile, checkInterval);
      }
    };
    
    checkForFile();
  });
}

// Main test function
async function runApiMigrationTest() {
  try {
    console.log('🚀 Starting API Migration Test\n');
    
    // Step 1: Create test request
    const { fileName } = createTestRequest();
    
    // Step 2: Wait for engine to process it
    console.log('\n📝 Note: Make sure the WTAF engine is running to process this request');
    console.log('📝 If engine is not running, the test will timeout after 30 seconds');
    
    try {
      const processedFile = await waitForProcessedFile(fileName);
      
      // Step 3: Read the processed output
      const processedContent = fs.readFileSync(processedFile, 'utf8');
      console.log(`\n📄 Processed file size: ${processedContent.length} characters`);
      
      // Step 4: Check for API endpoints
      const migrationSuccess = checkForApiEndpoints(processedContent);
      
      // Step 5: Save a snippet for manual review
      const snippetFile = path.join(__dirname, 'api-migration-test-output.html');
      fs.writeFileSync(snippetFile, processedContent);
      console.log(`\n💾 Full output saved to: ${snippetFile}`);
      
      return migrationSuccess;
      
    } catch (error) {
      console.log(`\n⚠️ Engine processing failed: ${error.message}`);
      console.log('🔧 You can manually run the engine to process the test request');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
runApiMigrationTest().then(success => {
  console.log(`\n🏁 Test completed: ${success ? 'SUCCESS' : 'NEEDS REVIEW'}`);
}); 