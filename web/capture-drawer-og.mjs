import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        viewport: { width: 1200, height: 630 }
    });

    await page.goto('file:///Users/bart/Documents/code/vibeceo/web/public/amber/drawer.html');

    // Wait for page to load
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({
        path: 'public/amber/drawer-og.png',
        fullPage: false
    });

    console.log('✓ OpenGraph image saved: public/amber/drawer-og.png');

    await browser.close();
})();
