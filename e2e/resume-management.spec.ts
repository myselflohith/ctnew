import { test, expect } from '../fixtures/auth.fixture';

test.describe('Resume Management Flow', () => {
  test('should navigate to resume management', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    
    await authenticatedPage.click('text=Resumes');
    
    await expect(authenticatedPage).toHaveURL(/.*resumes/);
    await expect(authenticatedPage.getByText(/my resumes/i)).toBeVisible();
  });

  test('should upload a resume', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/resumes');
    
    const fileInput = authenticatedPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-resume.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('PDF content'),
    });
    
    await expect(authenticatedPage.getByText(/upload successful/i)).toBeVisible({ timeout: 10000 });
  });

  test('should display uploaded resumes', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/resumes');
    
    const resumeCards = authenticatedPage.locator('[data-testid="resume-card"]');
    await expect(resumeCards.first()).toBeVisible();
  });

  test('should delete a resume', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/resumes');
    
    const firstResume = authenticatedPage.locator('[data-testid="resume-card"]').first();
    await firstResume.locator('button[aria-label="Delete resume"]').click();
    
    await authenticatedPage.click('button:has-text("Confirm")');
    
    await expect(authenticatedPage.getByText(/resume deleted/i)).toBeVisible();
  });

  test('should download a resume', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/resumes');
    
    const downloadPromise = authenticatedPage.waitForEvent('download');
    
    const firstResume = authenticatedPage.locator('[data-testid="resume-card"]').first();
    await firstResume.locator('button[aria-label="Download resume"]').click();
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should show error for invalid file type', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/resumes');
    
    const fileInput = authenticatedPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Text content'),
    });
    
    await expect(authenticatedPage.getByText(/invalid file type/i)).toBeVisible();
  });

  test('should show error for file too large', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/resumes');
    
    const largeBuffer = Buffer.alloc(11 * 1024 * 1024);
    
    const fileInput = authenticatedPage.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'large-resume.pdf',
      mimeType: 'application/pdf',
      buffer: largeBuffer,
    });
    
    await expect(authenticatedPage.getByText(/file too large/i)).toBeVisible();
  });

  test('should set primary resume', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard/resumes');
    
    const secondResume = authenticatedPage.locator('[data-testid="resume-card"]').nth(1);
    await secondResume.locator('button[aria-label="Set as primary"]').click();
    
    await expect(authenticatedPage.getByText(/primary resume updated/i)).toBeVisible();
  });
});
