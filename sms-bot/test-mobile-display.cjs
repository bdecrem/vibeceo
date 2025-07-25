const puppeteer = require('puppeteer');

async function testMobileDisplay() {
  const browser = await puppeteer.launch({ 
    headless: false,  // Set to true for production
    devtools: false 
  });
  
  const page = await browser.newPage();
  
  // Set mobile viewport (iPhone 12 Pro dimensions)
  await page.setViewport({ 
    width: 390, 
    height: 844, 
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3
  });

  try {
    // Navigate to the WEBTOYS landing page
    // Assuming the dev server is running on localhost:3000
    await page.goto('http://localhost:3000/wtaf-landing', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('✓ Page loaded successfully');

    // Wait for the phone display section to be present
    await page.waitForSelector('.phone-display', { timeout: 10000 });
    console.log('✓ Phone display section found');

    // Check if phone display is visible (not hidden)
    const phoneDisplayVisible = await page.evaluate(() => {
      const phoneDisplay = document.querySelector('.phone-display');
      if (!phoneDisplay) return false;
      
      const styles = window.getComputedStyle(phoneDisplay);
      return styles.display !== 'none' && styles.visibility !== 'hidden' && styles.opacity !== '0';
    });

    if (phoneDisplayVisible) {
      console.log('✅ PASS: Phone display section is visible on mobile');
    } else {
      console.log('❌ FAIL: Phone display section is not visible on mobile');
      return false;
    }

    // Check if SMS examples are present and visible
    const smsExamplesVisible = await page.evaluate(() => {
      const smsExamples = document.querySelector('.sms-examples');
      if (!smsExamples) return false;
      
      const bubbles = smsExamples.querySelectorAll('.sms-bubble');
      if (bubbles.length === 0) return false;
      
      // Check if at least one bubble is visible
      for (let bubble of bubbles) {
        const styles = window.getComputedStyle(bubble);
        if (styles.display !== 'none' && styles.visibility !== 'hidden') {
          return true;
        }
      }
      return false;
    });

    if (smsExamplesVisible) {
      console.log('✅ PASS: SMS examples are visible on mobile');
    } else {
      console.log('❌ FAIL: SMS examples are not visible on mobile');
      return false;
    }

    // Check specific SMS bubble texts
    const expectedTexts = [
      "Build me a sushi restaurant site with 80s vibes",
      "Create a game where you catch falling tacos", 
      "Make a meme generator for my cat photos",
      "I need a todo app but make it fun"
    ];

    const bubbleTexts = await page.evaluate(() => {
      const bubbles = document.querySelectorAll('.sms-bubble');
      return Array.from(bubbles).map(bubble => bubble.textContent.replace(/"/g, ''));
    });

    console.log('Found SMS bubble texts:', bubbleTexts);

    const allTextsPresent = expectedTexts.every(expectedText => 
      bubbleTexts.some(bubbleText => bubbleText.includes(expectedText))
    );

    if (allTextsPresent) {
      console.log('✅ PASS: All expected SMS example texts are present');
    } else {
      console.log('❌ FAIL: Some expected SMS example texts are missing');
      console.log('Expected:', expectedTexts);
      console.log('Found:', bubbleTexts);
      return false;
    }

    // Test phone number visibility
    const phoneNumber = await page.evaluate(() => {
      const phoneEl = document.querySelector('.sms-number');
      return phoneEl ? phoneEl.textContent : null;
    });

    if (phoneNumber && phoneNumber.includes('(866) 330-0015')) {
      console.log('✅ PASS: Phone number is displayed correctly');
    } else {
      console.log('❌ FAIL: Phone number not found or incorrect');
      console.log('Found phone number:', phoneNumber);
      return false;
    }

    // Take a screenshot for verification
    await page.screenshot({ 
      path: '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/mobile-test-screenshot.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved as mobile-test-screenshot.png');

    console.log('\n🎉 ALL TESTS PASSED! Mobile display is working correctly.');
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test
testMobileDisplay().then(success => {
  if (success) {
    console.log('\n✅ Mobile display test completed successfully');
    process.exit(0);
  } else {
    console.log('\n❌ Mobile display test failed');
    process.exit(1);
  }
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});