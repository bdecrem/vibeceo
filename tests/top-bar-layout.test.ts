import puppeteer, { Browser, Page } from 'puppeteer';

describe('Top Bar Layout Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas', '--disable-gpu'],
      defaultViewport: { width: 1024, height: 768 },
      timeout: 30000
    });
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto('http://localhost:3000/chat');
  });

  afterEach(async () => {
    await page.close();
  });

  test('Top bar should be fixed at the top on desktop', async () => {
    const topBar = await page.waitForSelector('div[class*="fixed top-0"]');
    const position = await topBar?.evaluate((el: Element) => {
      const computedStyle = window.getComputedStyle(el);
      return {
        position: computedStyle.position,
        top: computedStyle.top,
        left: computedStyle.left,
        right: computedStyle.right,
        height: computedStyle.height,
        zIndex: computedStyle.zIndex
      };
    });

    expect(position?.position).toBe('fixed');
    expect(position?.top).toBe('0px');
    expect(position?.left).toBe('0px');
    expect(position?.right).toBe('0px');
    expect(position?.height).toBe('56px'); // 14 * 4 = 56px (h-14 in Tailwind)
    expect(Number(position?.zIndex)).toBeGreaterThanOrEqual(50);
  });

  test('Title should be centered in the top bar', async () => {
    const title = await page.waitForSelector('h1');
    const text = await title?.evaluate(el => el.textContent?.trim());
    const position = await title?.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      return {
        text: el.textContent?.trim(),
        elementCenter: rect.left + (rect.width / 2),
        viewportCenter: viewportWidth / 2
      };
    });

    expect(text).toBe('myVEO.ai');
    // Title should be within 5 pixels of center
    expect(Math.abs(position?.elementCenter! - position?.viewportCenter!)).toBeLessThan(5);
  });

  test('Layout should adjust correctly when sidebar is toggled', async () => {
    // Get initial title position
    const title = await page.waitForSelector('h1');
    const initialPosition = await title?.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      return rect.left;
    });

    // Click sidebar trigger
    const trigger = await page.waitForSelector('button[class*="inline-flex"]');
    await trigger?.click();

    // Wait for transition
    await new Promise(resolve => setTimeout(resolve, 300));

    // Get new title position
    const newPosition = await title?.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      return rect.left;
    });

    // Title should stay centered (position shouldn't change significantly)
    expect(Math.abs(newPosition! - initialPosition!)).toBeLessThan(10); // Allow for transition effects
  });

  test('Layout should work correctly on mobile', async () => {
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667 });

    // Check top bar
    const topBar = await page.waitForSelector('div[class*="fixed top-0"]');
    const position = await topBar?.evaluate((el: Element) => {
      const computedStyle = window.getComputedStyle(el);
      return {
        position: computedStyle.position,
        width: computedStyle.width,
        left: computedStyle.left,
        right: computedStyle.right
      };
    });

    expect(position?.position).toBe('fixed');
    expect(position?.left).toBe('0px');
    expect(position?.right).toBe('0px');

    // Check hamburger menu position
    const trigger = await page.waitForSelector('button[class*="inline-flex"]');
    const triggerPosition = await trigger?.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top
      };
    });

    expect(triggerPosition?.left).toBeLessThan(24); // Should be within 24px from left
    expect(triggerPosition?.top).toBeLessThan(56); // Should be within the top bar height
  });
}); 