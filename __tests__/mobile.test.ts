import { test, expect } from '@playwright/test'

test.describe('Mobile Tests', () => {
  test('Chat input is visible on iPhone 16', async ({ page }) => {
    // iPhone 16 Pro dimensions
    await page.setViewportSize({ width: 393, height: 852 })
    
    // Navigate to chat page
    await page.goto('http://localhost:3000/chat')
    
    // Wait for the chat interface to load
    await page.waitForSelector('form')
    
    // Get the send button
    const sendButton = await page.locator('button[type="submit"]')
    
    // Check if the send button is visible in the viewport
    const isVisible = await sendButton.isVisible()
    expect(isVisible).toBe(true)
    
    // Get the bounding box of the send button
    const box = await sendButton.boundingBox()
    expect(box).toBeTruthy()
    
    if (box) {
      // Check if the button is fully within the viewport
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(393) // iPhone 16 width
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(852) // iPhone 16 height
    }
    
    // Check if input field is visible and usable
    const input = await page.locator('input[placeholder="Type a message..."]')
    expect(await input.isVisible()).toBe(true)
    
    // Type something in the input
    await input.type('Test message')
    expect(await input.inputValue()).toBe('Test message')
  })
}) 