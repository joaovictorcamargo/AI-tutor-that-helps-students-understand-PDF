import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = 'testpassword123';

  test.beforeEach(async ({ page }) => {
    // Increase timeout for navigation
    page.setDefaultTimeout(15000);
  });

  test('registration flow', async ({ page }) => {
    await page.goto('/register');
    
    // Fill registration form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    // Submit form and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button:has-text("Create account")')
    ]);
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('login flow', async ({ page }) => {
    await page.goto('/login');
    
    // Fill login form
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    // Submit form and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.click('button:has-text("Sign in")')
    ]);
    
    // Should redirect to home
    await expect(page).toHaveURL('/', { timeout: 15000 });
    
    // Verify logged in state by checking for PDF upload component
    await expect(page.locator('text=Upload PDF to begin')).toBeVisible({ timeout: 15000 });
    
    // Verify session persistence
    await page.reload();
    await expect(page).not.toHaveURL('/login');
    await expect(page.locator('text=Upload PDF to begin')).toBeVisible();
  });
});
