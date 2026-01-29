import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
        viewport: { width: 1200, height: 630 }
    });

    await page.goto('file:///Users/bart/Documents/code/vibeceo/web/public/amber/warranty.html');

    // Wait for page to load and render
    await page.waitForTimeout(1000);

    // Take screenshot
    await page.screenshot({
        path: 'public/amber/warranty-og.png',
        fullPage: false
    });

    console.log('✓ Awesome warranty OG image captured: public/amber/warranty-og.png');

    await browser.close();
})();
