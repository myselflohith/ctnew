import { test, expect } from '../fixtures/auth.fixture';

test.describe('Employer Job Posting Flow', () => {
  test('should navigate to job posting page', async ({ employerPage }) => {
    await employerPage.goto('/dashboard');
    
    await employerPage.click('text=Post a Job');
    
    await expect(employerPage).toHaveURL(/.*jobs\/new/);
    await expect(employerPage.getByText(/create job posting/i)).toBeVisible();
  });

  test('should create a new job posting', async ({ employerPage }) => {
    await employerPage.goto('/dashboard/jobs/new');
    
    await employerPage.fill('input[name="title"]', 'Senior Software Engineer');
    await employerPage.fill('textarea[name="description"]', 'We are looking for an experienced software engineer...');
    await employerPage.fill('input[name="location"]', 'San Francisco, CA');
    await employerPage.fill('input[name="salary"]', '$150k - $200k');
    await employerPage.selectOption('select[name="type"]', 'full-time');
    await employerPage.fill('textarea[name="requirements"]', '5+ years of experience\nStrong JavaScript skills');
    
    await employerPage.click('button[type="submit"]');
    
    await expect(employerPage.getByText(/job posted successfully/i)).toBeVisible();
  });

  test('should show validation errors for incomplete job posting', async ({ employerPage }) => {
    await employerPage.goto('/dashboard/jobs/new');
    
    await employerPage.click('button[type="submit"]');
    
    await expect(employerPage.getByText(/required/i).first()).toBeVisible();
  });

  test('should view all posted jobs', async ({ employerPage }) => {
    await employerPage.goto('/dashboard/jobs');
    
    await expect(employerPage.getByText(/my job postings/i)).toBeVisible();
    
    const jobCards = employerPage.locator('[data-testid="job-card"]');
    await expect(jobCards.first()).toBeVisible();
  });

  test('should edit a job posting', async ({ employerPage }) => {
    await employerPage.goto('/dashboard/jobs');
    
    const firstJob = employerPage.locator('[data-testid="job-card"]').first();
    await firstJob.locator('button[aria-label="Edit job"]').click();
    
    await employerPage.fill('input[name="title"]', 'Updated Job Title');
    await employerPage.click('button[type="submit"]');
    
    await expect(employerPage.getByText(/job updated/i)).toBeVisible();
  });

  test('should pause a job posting', async ({ employerPage }) => {
    await employerPage.goto('/dashboard/jobs');
    
    const firstJob = employerPage.locator('[data-testid="job-card"]').first();
    await firstJob.locator('button[aria-label="Pause job"]').click();
    
    await expect(employerPage.getByText(/job paused/i)).toBeVisible();
  });

  test('should close a job posting', async ({ employerPage }) => {
    await employerPage.goto('/dashboard/jobs');
    
    const firstJob = employerPage.locator('[data-testid="job-card"]').first();
    await firstJob.locator('button[aria-label="Close job"]').click();
    await employerPage.click('button:has-text("Confirm")');
    
    await expect(employerPage.getByText(/job closed/i)).toBeVisible();
  });

  test('should view job applicants', async ({ employerPage }) => {
    await employerPage.goto('/dashboard/jobs');
    
    const firstJob = employerPage.locator('[data-testid="job-card"]').first();
    await firstJob.click();
    
    await employerPage.click('text=View Applicants');
    
    await expect(employerPage.getByText(/applicants/i)).toBeVisible();
  });

  test('should review applicant profile', async ({ employerPage }) => {
    await employerPage.goto('/dashboard/jobs');
    
    const firstJob = employerPage.locator('[data-testid="job-card"]').first();
    await firstJob.click();
    await employerPage.click('text=View Applicants');
    
    const firstApplicant = employerPage.locator('[data-testid="applicant-card"]').first();
    await firstApplicant.click();
    
    await expect(employerPage.getByText(/applicant profile/i)).toBeVisible();
  });

  test('should accept an application', async ({ employerPage }) => {
    await employerPage.goto('/dashboard/applications');
    
    const firstApplication = employerPage.locator('[data-testid="application-card"]').first();
    await firstApplication.locator('button:has-text("Accept")').click();
    
    await expect(employerPage.getByText(/application accepted/i)).toBeVisible();
  });

  test('should reject an application', async ({ employerPage }) => {
    await employerPage.goto('/dashboard/applications');
    
    const firstApplication = employerPage.locator('[data-testid="application-card"]').first();
    await firstApplication.locator('button:has-text("Reject")').click();
    await employerPage.click('button:has-text("Confirm")');
    
    await expect(employerPage.getByText(/application rejected/i)).toBeVisible();
  });
});
