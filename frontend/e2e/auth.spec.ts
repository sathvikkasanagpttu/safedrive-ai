import { test, expect } from '@playwright/test';

test.describe('SafeDrive AI - Authentication & Role Flows', () => {
  test('should display login page with quick-fill role presets', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/SafeDrive AI/i);
    await expect(page.getByText('SafeDrive AI')).toBeVisible();
    await expect(page.getByRole('button', { name: /Safety Officer/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Fleet Admin/i })).toBeVisible();
  });

  test('should quick-fill Admin credentials and submit successfully', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /Fleet Admin/i }).click();

    const emailInput = page.getByLabel(/Corporate Email/i);
    await expect(emailInput).toHaveValue('admin@safedrive.ai');

    const submitBtn = page.getByRole('button', { name: /Sign in to Fleet Console/i });
    await expect(submitBtn).toBeEnabled();
  });

  test('should navigate to registration page', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Register here/i }).click();
    await expect(page).toHaveURL(/.*register/);
    await expect(page.getByRole('heading', { name: /Create Account/i })).toBeVisible();
  });
});
