import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page', async ({ page }) => {
    await expect(page).toHaveTitle(/CardinalTalent/);
    await expect(page.getByText('CardinalTalent')).toBeVisible();
  });

  test('should navigate to auth page', async ({ page }) => {
    await page.click('text=Sign In');
    await expect(page).toHaveURL(/.*auth/);
  });

  test('should register new talent user', async ({ page }) => {
    await page.goto('/auth?mode=signup');
    
    await page.fill('input[name="firstName"]', 'John');
    await page.fill('input[name="lastName"]', 'Doe');
    await page.fill('input[type="email"]', `test-${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.selectOption('select[name="role"]', 'talent');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should register new employer user', async ({ page }) => {
    await page.goto('/auth?mode=signup');
    
    await page.fill('input[name="firstName"]', 'Jane');
    await page.fill('input[name="lastName"]', 'Smith');
    await page.fill('input[type="email"]', `employer-${Date.now()}@example.com`);
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.selectOption('select[name="role"]', 'employer');
    await page.fill('input[name="companyName"]', 'Test Company');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should show validation errors for invalid registration', async ({ page }) => {
    await page.goto('/auth?mode=signup');
    
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', '123');
    
    await page.click('button[type="submit"]');
    
    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');
    
    await page.fill('input[type="email"]', 'wrong@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    await expect(page.getByText(/invalid/i)).toBeVisible();
  });

  test('should logout user', async ({ page }) => {
    await page.goto('/auth');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    await page.waitForURL(/.*dashboard/);
    
    await page.click('button[aria-label="User menu"]');
    await page.click('text=Logout');
    
    await expect(page).toHaveURL('/');
  });

  test('should toggle between login and signup', async ({ page }) => {
    await page.goto('/auth');
    
    await expect(page.getByText(/sign in/i)).toBeVisible();
    
    await page.click('text=Sign up');
    
    await expect(page.getByText(/create account/i)).toBeVisible();
    
    await page.click('text=Sign in');
    
    await expect(page.getByText(/welcome back/i)).toBeVisible();
  });
});
