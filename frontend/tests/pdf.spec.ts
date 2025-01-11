import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('PDF functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Register a test user
    await page.goto('/register');
    const testEmail = `test${Date.now()}@example.com`;
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for registration and redirect
    await expect(page).toHaveURL('/login');
    
    // Login
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'testpassword123');
    await page.click('button[type="submit"]');
    
    // Wait for login and redirect
    await expect(page).toHaveURL('/');
  });

  test('upload and view PDF', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../public/test.pdf');
    
    // Upload PDF
    const fileInput = await page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    // Wait for PDF to load
    await expect(page.locator('.react-pdf__Document')).toBeVisible();
    
    // Verify split screen layout
    await expect(page.locator('.chat-container')).toBeVisible();
    
    // Test PDF navigation
    const pageText = page.locator('text=Page 1 of');
    await expect(pageText).toBeVisible();
    
    // Click next page
    await page.click('button:has([data-testid="chevron-right"])');
    await expect(page.locator('text=Page 2 of')).toBeVisible();
    
    // Click previous page
    await page.click('button:has([data-testid="chevron-left"])');
    await expect(pageText).toBeVisible();
  });

  test('chat and AI interaction', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../public/test.pdf');
    await page.locator('input[type="file"]').setInputFiles(testPdfPath);
    await expect(page.locator('.react-pdf__Document')).toBeVisible();
    
    // Send a test message
    const message = 'What is this document about?';
    await page.fill('input[placeholder="Type your message..."]', message);
    await page.click('button:has([data-testid="send"])');
    
    // Wait for AI response
    await expect(page.locator('.chat-container')).toContainText(message);
    await expect(page.locator('.chat-container')).toContainText('Test PDF');
    
    // Verify annotations appear
    await expect(page.locator('canvas')).toBeVisible();
  });

  test('voice interaction', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../public/test.pdf');
    await page.locator('input[type="file"]').setInputFiles(testPdfPath);
    
    // Click microphone button
    await page.click('button:has([data-testid="mic"])');
    
    // Verify recording state
    await expect(page.locator('button:has([data-testid="mic"])').first())
      .toHaveClass(/bg-red-500/);
      
    // Click again to stop recording
    await page.click('button:has([data-testid="mic"])');
    
    // Verify recording stopped
    await expect(page.locator('button:has([data-testid="mic"])').first())
      .not.toHaveClass(/bg-red-500/);
  });

  test('persistence', async ({ page }) => {
    const testPdfPath = path.join(__dirname, '../public/test.pdf');
    await page.locator('input[type="file"]').setInputFiles(testPdfPath);
    
    // Send a test message
    await page.fill('input[placeholder="Type your message..."]', 'Test message');
    await page.click('button:has([data-testid="send"])');
    
    // Wait for response
    await expect(page.locator('.chat-container')).toContainText('Test message');
    
    // Reload page
    await page.reload();
    
    // Verify PDF and chat history persist
    await expect(page.locator('.react-pdf__Document')).toBeVisible();
    await expect(page.locator('.chat-container')).toContainText('Test message');
  });
});
