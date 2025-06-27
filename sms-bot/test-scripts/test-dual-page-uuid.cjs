#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

async function createTestDualPageRequest() {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `dual-page-uuid-test-${timestamp}.txt`;
    const filePath = path.join(__dirname, '..', 'data', 'wtaf', filename);
    
    const testContent = {
        sender_phone: "+15551234567",
        user_slug: "testuser",
        user_prompt: "wtaf --admin build me a newsletter signup with admin dashboard",
        coach: "alex",
        timestamp: new Date().toISOString()
    };
    
    const content = `SENDER_PHONE: ${testContent.sender_phone}
USER_SLUG: ${testContent.user_slug}
USER_PROMPT: ${testContent.user_prompt}
COACH: ${testContent.coach}
TIMESTAMP: ${testContent.timestamp}`;
    
    await fs.writeFile(filePath, content, 'utf8');
    console.log(`✅ Created test file: ${filename}`);
    console.log(`📋 Content: ${testContent.user_prompt}`);
    console.log(`🔍 This will test:`)
    console.log(`   1. Main app gets UUID A for page storage`);
    console.log(`   2. Admin page gets UUID B for page storage`);
    console.log(`   3. Admin page forms use UUID A for data operations`);
    console.log(`   4. Both viewing and storing data use main app's UUID A`);
    
    return { filename, testContent };
}

// Run the test
createTestDualPageRequest()
    .then(({ filename }) => {
        console.log(`\n🚀 Test queued successfully: ${filename}`);
        console.log(`\n📊 Watch the logs for:`);
        console.log(`   - "Main app: ... (UUID: ...)" - main app UUID`);
        console.log(`   - "Admin page: ... (UUID: ...)" - admin page UUID`); 
        console.log(`   - "Data storage: Uses main app UUID ..." - confirmation`);
        console.log(`   - "Admin page configured to use submission UUID: ..." - UUID injection`);
    })
    .catch(console.error); 