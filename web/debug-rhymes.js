const { chromium } = require('playwright');

async function debugRhymesApp() {
    console.log('🔍 Debugging RHYMES app authentication...');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        // Navigate to test page
        await page.goto('http://localhost:3001/test-rhymes.html');
        await page.waitForLoadState('networkidle');
        
        console.log('✅ Page loaded successfully');
        
        // Check console logs
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        
        // Take initial screenshot
        await page.screenshot({ path: 'debug-initial.png' });
        
        // Check current authentication state
        const initialStatus = await page.textContent('#saveStatus');
        console.log(`Initial save status: ${initialStatus}`);
        
        // Set up test user data more explicitly
        await page.evaluate(() => {
            console.log('Setting up test user...');
            
            const testUser = {
                handle: 'TESTUSER',
                pin: '1234',
                participantId: 'TESTUSER_1234'
            };
            
            // Set in localStorage
            localStorage.setItem('toybox_user', JSON.stringify(testUser));
            
            // Set global variables
            window.currentUser = testUser;
            
            // Call update functions if they exist
            if (typeof window.updateUI === 'function') {
                window.updateUI();
            }
            
            console.log('Current user set:', window.currentUser);
            console.log('getUsername():', typeof window.getUsername === 'function' ? window.getUsername() : 'function not found');
            console.log('getParticipantId():', typeof window.getParticipantId === 'function' ? window.getParticipantId() : 'function not found');
        });
        
        // Wait a moment for updates
        await page.waitForTimeout(1000);
        
        // Check status after auth
        const authStatus = await page.textContent('#saveStatus');
        console.log(`After auth save status: ${authStatus}`);
        
        // Take screenshot after auth
        await page.screenshot({ path: 'debug-after-auth.png' });
        
        // Try entering some text
        await page.fill('#editor', 'Testing save functionality...');
        await page.fill('#docTitle', 'Debug Test Poem');
        
        // Check if status changes when typing
        await page.waitForTimeout(500);
        const typingStatus = await page.textContent('#saveStatus');
        console.log(`After typing save status: ${typingStatus}`);
        
        // Try clicking save button
        await page.click('button:has-text("💾 Save")');
        console.log('Save button clicked');
        
        // Wait and check status
        await page.waitForTimeout(2000);
        const saveAttemptStatus = await page.textContent('#saveStatus');
        console.log(`After save attempt: ${saveAttemptStatus}`);
        
        // Take final screenshot
        await page.screenshot({ path: 'debug-final.png' });
        
        // Let's also check the browser's network tab for any API calls
        const responses = [];
        page.on('response', response => {
            if (response.url().includes('api/')) {
                responses.push({
                    url: response.url(),
                    status: response.status(),
                    statusText: response.statusText()
                });
            }
        });
        
        // Try save again to catch network activity
        await page.click('button:has-text("💾 Save")');
        await page.waitForTimeout(3000);
        
        console.log('API calls made:', responses);
        
        console.log('🎉 Debug completed!');
        
        // Keep browser open for manual inspection
        console.log('Browser will stay open for 30 seconds for manual inspection...');
        await page.waitForTimeout(30000);
        
    } catch (error) {
        console.error('❌ Debug failed:', error);
        await page.screenshot({ path: 'debug-error.png' });
    } finally {
        await browser.close();
    }
}

debugRhymesApp();