import { test as base, Page } from '@playwright/test';
import { setupTestDatabase, cleanupTestDatabase, createTestUser } from '../server/test/helpers/db-setup';

type AuthFixtures = {
  authenticatedPage: Page;
  employerPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await setupTestDatabase();
    
    const testUser = await createTestUser({
      email: 'e2e-test@example.com',
      password: 'Test123!@#',
      role: 'talent',
      firstName: 'E2E',
      lastName: 'Test',
    });

    await page.goto('/auth');
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');

    await use(page);

    await cleanupTestDatabase();
  },

  employerPage: async ({ page }, use) => {
    await setupTestDatabase();
    
    const employer = await createTestUser({
      email: 'employer-e2e@example.com',
      password: 'Test123!@#',
      role: 'employer',
      firstName: 'Employer',
      lastName: 'Test',
    });

    await page.goto('/auth');
    await page.fill('input[type="email"]', employer.email);
    await page.fill('input[type="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    await page.waitForURL('/dashboard');

    await use(page);

    await cleanupTestDatabase();
  },
});

export { expect } from '@playwright/test';
