import { test, expect } from '../fixtures/auth.fixture';

test.describe('Job Search and Application Flow', () => {
  test('should browse available jobs', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/jobs');
    
    await expect(authenticatedPage.getByText(/available jobs/i)).toBeVisible();
    
    const jobCards = authenticatedPage.locator('[data-testid="job-card"]');
    await expect(jobCards.first()).toBeVisible();
  });

  test('should search jobs by keyword', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/jobs');
    
    await authenticatedPage.fill('input[placeholder*="Search"]', 'Software Engineer');
    await authenticatedPage.press('input[placeholder*="Search"]', 'Enter');
    
    await expect(authenticatedPage.getByText(/software engineer/i)).toBeVisible();
  });

  test('should filter jobs by location', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/jobs');
    
    await authenticatedPage.click('button:has-text("Filters")');
    await authenticatedPage.fill('input[name="location"]', 'Remote');
    await authenticatedPage.click('button:has-text("Apply Filters")');
    
    const jobCards = authenticatedPage.locator('[data-testid="job-card"]');
    await expect(jobCards.first()).toContainText(/remote/i);
  });

  test('should view job details', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/jobs');
    
    const firstJob = authenticatedPage.locator('[data-testid="job-card"]').first();
    await firstJob.click();
    
    await expect(authenticatedPage).toHaveURL(/.*jobs\/[a-z0-9-]+/);
    await expect(authenticatedPage.getByText(/job description/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/requirements/i)).toBeVisible();
  });

  test('should apply to a job', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/jobs');
    
    const firstJob = authenticatedPage.locator('[data-testid="job-card"]').first();
    await firstJob.click();
    
    await authenticatedPage.click('button:has-text("Apply Now")');
    
    await expect(authenticatedPage.getByText(/application submitted/i)).toBeVisible();
  });

  test('should not apply to same job twice', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/jobs');
    
    const firstJob = authenticatedPage.locator('[data-testid="job-card"]').first();
    await firstJob.click();
    
    await authenticatedPage.click('button:has-text("Apply Now")');
    await authenticatedPage.waitForTimeout(1000);
    
    await expect(authenticatedPage.getByText(/already applied/i)).toBeVisible();
  });

  test('should view application status', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/applications');
    
    await expect(authenticatedPage.getByText(/my applications/i)).toBeVisible();
    
    const applications = authenticatedPage.locator('[data-testid="application-card"]');
    await expect(applications.first()).toBeVisible();
  });

  test('should save job for later', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/jobs');
    
    const firstJob = authenticatedPage.locator('[data-testid="job-card"]').first();
    await firstJob.locator('button[aria-label="Save job"]').click();
    
    await expect(authenticatedPage.getByText(/job saved/i)).toBeVisible();
  });

  test('should view saved jobs', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/saved-jobs');
    
    await expect(authenticatedPage.getByText(/saved jobs/i)).toBeVisible();
    
    const savedJobs = authenticatedPage.locator('[data-testid="job-card"]');
    await expect(savedJobs.first()).toBeVisible();
  });
});
