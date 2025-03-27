import { test, expect, Page, ElementHandle } from '@playwright/test';

test.describe('Layout Tests', () => {
  test.beforeEach(async ({ page }: { page: Page }) => {
    await page.goto('http://localhost:3003');
  });

  test('Desktop layout - header styling and company name', async ({ page }: { page: Page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // Check header styling
    const header = await page.locator('div[class*="bg-muted"]');
    const hamburger = await page.locator('button').first();
    const companyName = await page.locator('text=myVEO.ai');
    
    // Verify header height is compact
    const headerBox = await header.boundingBox();
    if (headerBox) {
      expect(headerBox.height).toBeLessThanOrEqual(45); // Compact height
    }
    
    // Verify hamburger is inside header
    const hamburgerBox = await hamburger.boundingBox();
    if (headerBox && hamburgerBox) {
      expect(hamburgerBox.y).toBeGreaterThanOrEqual(headerBox.y);
      expect(hamburgerBox.y + hamburgerBox.height).toBeLessThanOrEqual(headerBox.y + headerBox.height);
    }
    
    // Verify company name is centered
    const companyNameBox = await companyName.boundingBox();
    if (companyNameBox && headerBox) {
      expect(companyNameBox.x + companyNameBox.width / 2).toBeCloseTo(headerBox.width / 2, 5);
    }
    
    // Test sidebar toggle
    await hamburger.click();
    await expect(page.locator('.group\\/sidebar')).toHaveClass(/-translate-x-\[calc\(100\%-3rem\)\]/);
    
    await hamburger.click();
    await expect(page.locator('.group\\/sidebar')).toHaveClass(/translate-x-0/);
  });

  test('Mobile layout - header styling and company name', async ({ page }: { page: Page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check header styling
    const header = await page.locator('div[class*="bg-muted"]');
    const hamburger = await page.locator('button').first();
    const companyName = await page.locator('text=myVEO.ai');
    
    // Verify header height is compact
    const headerBox = await header.boundingBox();
    if (headerBox) {
      expect(headerBox.height).toBeLessThanOrEqual(45); // Compact height for both desktop and mobile
    }
    
    // Verify hamburger is inside header
    const hamburgerBox = await hamburger.boundingBox();
    if (headerBox && hamburgerBox) {
      expect(hamburgerBox.y).toBeGreaterThanOrEqual(headerBox.y);
      expect(hamburgerBox.y + hamburgerBox.height).toBeLessThanOrEqual(headerBox.y + headerBox.height);
      
      // Additional mobile-specific checks
      // Check hamburger button size is touch-friendly
      expect(hamburgerBox.width).toBeGreaterThanOrEqual(36);
      expect(hamburgerBox.height).toBeGreaterThanOrEqual(36);
      
      // Check hamburger position is not too close to edges
      expect(hamburgerBox.x).toBeGreaterThanOrEqual(8);
      expect(hamburgerBox.x + hamburgerBox.width).toBeLessThanOrEqual(headerBox.width - 8);
    }
    
    // Verify company name is centered and appropriately sized
    const companyNameBox = await companyName.boundingBox();
    if (companyNameBox && headerBox) {
      expect(companyNameBox.x + companyNameBox.width / 2).toBeCloseTo(headerBox.width / 2, 5);
      expect(companyNameBox.height).toBeLessThanOrEqual(20); // Compact text height
    }
    
    // Verify sidebar starts closed on mobile
    await expect(page.locator('.group\\/sidebar')).toHaveClass(/-translate-x-\[calc\(100\%-3rem\)\]/);
    
    // Test sidebar toggle
    await hamburger.click();
    await expect(page.locator('.group\\/sidebar')).toHaveClass(/translate-x-0/);
    
    // Verify sidebar width on mobile
    const sidebar = await page.locator('.group\\/sidebar');
    const sidebarBox = await sidebar.boundingBox();
    if (sidebarBox) {
      expect(sidebarBox.width).toBe(240); // Mobile sidebar width
    }

    // Verify logout button is visible in sidebar
    const logoutButton = await page.locator('text=Logout');
    const logoutBox = await logoutButton.boundingBox();
    if (logoutBox) {
      expect(logoutBox.y + logoutBox.height).toBeLessThanOrEqual(sidebarBox!.y + sidebarBox!.height);
    }
    
    await hamburger.click();
    await expect(page.locator('.group\\/sidebar')).toHaveClass(/-translate-x-\[calc\(100\%-3rem\)\]/);

    // Verify input box is visible and fixed at bottom
    const inputBox = await page.locator('input[placeholder="Type a message..."]');
    const inputBoxContainer = await inputBox.evaluateHandle((el: Element) => el.closest('div'));
    if (inputBoxContainer) {
      const inputBoxStyle = await inputBoxContainer.evaluate((el: HTMLDivElement) => window.getComputedStyle(el));
      expect(inputBoxStyle.position).toBe('fixed');
      expect(inputBoxStyle.bottom).toBe('0px');
    }
  });
}); 