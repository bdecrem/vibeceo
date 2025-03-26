import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';

describe('Chat Layout Tests', () => {
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

  test('Puppeteer is working correctly', async () => {
    // Check if we can get the page title
    const title = await page.title();
    expect(title).toBeTruthy();

    // Check if we can interact with the page
    const input = await page.waitForSelector('input[type="text"]');
    expect(input).toBeTruthy();

    // Try to type something
    await input?.type('Test message');
    const inputValue = await input?.evaluate(el => (el as HTMLInputElement).value);
    expect(inputValue).toBe('Test message');
  });

  test('Input box should be fixed to bottom on desktop', async () => {
    // Wait for the form to be present
    const form = await page.waitForSelector('form');
    const formPosition = await form?.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      return {
        position: computedStyle.position,
        bottom: computedStyle.bottom,
        left: computedStyle.left,
        right: computedStyle.right
      };
    });

    // Check if form has fixed positioning
    expect(formPosition?.position).toBe('fixed');
    expect(formPosition?.bottom).toBe('0px');
    expect(formPosition?.left).toBe('0px');
    expect(formPosition?.right).toBe('0px');
  });

  test('Input box should be fixed to bottom on mobile', async () => {
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667 });

    // Wait for the form to be present
    const form = await page.waitForSelector('form');
    const formPosition = await form?.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      return {
        position: computedStyle.position,
        bottom: computedStyle.bottom,
        left: computedStyle.left,
        right: computedStyle.right
      };
    });

    // Check if form has fixed positioning
    expect(formPosition?.position).toBe('fixed');
    expect(formPosition?.bottom).toBe('0px');
    expect(formPosition?.left).toBe('0px');
    expect(formPosition?.right).toBe('0px');
  });

  test('Input box should maintain position when scrolling', async () => {
    // Wait for the form to be present
    const form = await page.waitForSelector('form');
    
    // Get initial position
    const initialPosition = await form?.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      return rect.bottom;
    });

    // Scroll the page
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });

    // Wait for scroll to complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Get position after scroll
    const finalPosition = await form?.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      return rect.bottom;
    });

    // Position should remain the same
    expect(finalPosition).toBe(initialPosition);
  });
}); 