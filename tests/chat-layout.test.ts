import puppeteer, { Browser, Page, ElementHandle } from 'puppeteer';
import fs from 'fs';
import path from 'path';

// Load Cursor settings
const cursorSettings = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), '.cursor', 'settings.json'), 'utf-8')
);

describe('Chat Layout Tests', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await puppeteer.launch(cursorSettings.puppeteer);
  });

  afterAll(async () => {
    await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport(cursorSettings.puppeteer.defaultViewport);
    await page.goto('http://localhost:3000/chat');
  });

  afterEach(async () => {
    await page.close();
  });

  test('Input box should be fixed to bottom on desktop', async () => {
    // Wait for the form to be present
    const form = await page.waitForSelector('form');
    const formPosition = await form?.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width
      };
    });

    // Check if form is fixed to bottom
    expect(formPosition?.bottom).toBe(0);
    expect(formPosition?.left).toBe(0);
    expect(formPosition?.right).toBe(cursorSettings.puppeteer.defaultViewport.width);
  });

  test('Input box should be fixed to bottom on mobile', async () => {
    // Set mobile viewport
    await page.setViewport({ width: 375, height: 667 });

    // Wait for the form to be present
    const form = await page.waitForSelector('form');
    const formPosition = await form?.evaluate((el: Element) => {
      const rect = el.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        width: rect.width
      };
    });

    // Check if form is fixed to bottom
    expect(formPosition?.bottom).toBe(0);
    expect(formPosition?.left).toBe(0);
    expect(formPosition?.right).toBe(375);
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