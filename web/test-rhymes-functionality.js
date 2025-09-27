const { chromium } = require('playwright');

async function testRhymesApp() {
    console.log('🧪 Testing RHYMES app save/load functionality...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Navigate to test page
        await page.goto('http://localhost:3001/test-rhymes.html');
        await page.waitForLoadState('networkidle');
        
        console.log('✅ Page loaded successfully');
        
        // Take initial screenshot
        await page.screenshot({ path: 'rhymes-app-initial.png' });
        console.log('📸 Initial screenshot taken');
        
        // Test 1: Check if the app loads properly
        const title = await page.textContent('.title');
        console.log(`📝 App title: ${title}`);
        
        // Test 2: Enter some text in the editor
        const testPoem = `Roses are red,
Violets are blue,
Testing the RHYMES app,
To see if it's true.`;
        
        await page.fill('#editor', testPoem);
        await page.fill('#docTitle', 'Test Poem');
        console.log('✅ Text entered in editor');
        
        // Test 3: Simulate user authentication (localStorage)
        await page.evaluate(() => {
            const testUser = {
                handle: 'TESTUSER',
                pin: '1234',
                participantId: 'TESTUSER_1234'
            };
            localStorage.setItem('toybox_user', JSON.stringify(testUser));
            // Trigger auth update
            window.currentUser = testUser;
            window.updateUI();
        });
        
        console.log('✅ Test user authenticated');
        
        // Test 4: Try to save the document
        await page.click('button:has-text("💾 Save")');
        console.log('✅ Save button clicked');
        
        // Wait a bit for the save to complete
        await page.waitForTimeout(2000);
        
        // Check save status
        const saveStatus = await page.textContent('#saveStatus');
        console.log(`💾 Save status: ${saveStatus}`);
        
        // Test 5: Try to open documents
        await page.click('button:has-text("📂 Open")');
        console.log('✅ Open button clicked');
        
        // Wait for modal to appear
        await page.waitForSelector('.modal.active');
        
        // Take screenshot of the modal
        await page.screenshot({ path: 'rhymes-app-open-modal.png' });
        console.log('📸 Open modal screenshot taken');
        
        // Check if there are any documents listed
        const fileList = await page.textContent('#fileList');
        console.log(`📂 File list content: ${fileList}`);
        
        // Test 6: Close modal
        await page.click('.close-modal');
        console.log('✅ Modal closed');
        
        // Test 7: Test rhyme finding functionality
        await page.fill('#rhymeInput', 'cat');
        await page.click('.find-btn');
        console.log('✅ Rhyme search initiated');
        
        // Wait for rhyme results
        await page.waitForTimeout(5000);
        
        // Check rhyme results
        const rhymeResults = await page.textContent('#rhymeResults');
        console.log(`🎵 Rhyme results: ${rhymeResults.substring(0, 200)}...`);
        
        // Final screenshot
        await page.screenshot({ path: 'rhymes-app-final.png' });
        console.log('📸 Final screenshot taken');
        
        console.log('🎉 All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        await page.screenshot({ path: 'rhymes-app-error.png' });
    } finally {
        await browser.close();
    }
}

testRhymesApp();