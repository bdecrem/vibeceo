import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({
        headless: false,
        args: ['--autoplay-policy=no-user-gesture-required'] // Allow audio
    });
    const page = await browser.newPage();

    // Navigate to the drawer
    await page.goto('file:///Users/bart/Documents/code/vibeceo/web/public/amber/drawer.html');

    console.log('The Drawer — Final Test');
    console.log('Watch for: drawer animation, treasure reveal, gentle chime sound');

    // Wait to see initial state
    await page.waitForTimeout(2000);

    // Click the drawer (should hear gentle chime)
    console.log('\nOpening drawer (listen for chime)...');
    await page.click('#drawer');

    // Wait to see the treasure reveal
    await page.waitForTimeout(3000);

    // Take screenshot of treasure
    await page.screenshot({ path: 'drawer-final.png', fullPage: true });
    console.log('Screenshot saved: drawer-final.png');

    // Close
    await page.click('#closeBtn');
    await page.waitForTimeout(2000);

    // Open again for different treasure
    console.log('\nOpening again for new treasure...');
    await page.click('#drawer');
    await page.waitForTimeout(3000);

    console.log('\n✓ Test complete');
    console.log('Browser stays open for manual testing');

    // Keep open
})();
