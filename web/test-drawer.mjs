import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Navigate to the drawer
    await page.goto('file:///Users/bart/Documents/code/vibeceo/web/public/amber/drawer.html');

    console.log('Opened drawer page. Testing interaction...');

    // Wait a moment to see initial state
    await page.waitForTimeout(2000);

    // Click the drawer
    await page.click('#drawer');
    console.log('Clicked drawer - should open and reveal treasure');

    // Wait to see the treasure
    await page.waitForTimeout(4000);

    // Take a screenshot
    await page.screenshot({ path: 'drawer-treasure.png', fullPage: true });
    console.log('Screenshot saved as drawer-treasure.png');

    // Close the treasure
    await page.click('#closeBtn');
    console.log('Closed treasure - drawer should close');

    await page.waitForTimeout(2000);

    // Click again to get a different treasure
    await page.click('#drawer');
    await page.waitForTimeout(3000);

    console.log('Test complete. Browser will stay open for manual testing.');

    // Keep browser open for manual testing
    // await browser.close();
})();
