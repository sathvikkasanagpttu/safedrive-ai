import { test, expect } from '@playwright/test';

test.describe('SafeDrive AI - Fleet Dashboard & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (authenticated or mock authenticated session)
    await page.goto('/dashboard');
  });

  test('should render main dashboard with safety metrics and analytics', async ({ page }) => {
    await expect(page.getByText('SafeDrive AI')).toBeVisible();
    await expect(page.getByText(/Total Drivers/i)).toBeVisible();
    await expect(page.getByText(/Active Sessions/i)).toBeVisible();
    await expect(page.getByText(/Fleet Safety Score/i)).toBeVisible();
  });

  test('should navigate seamlessly through sidebar routes', async ({ page }) => {
    // Live Monitor
    await page.click('a[href="/live-monitor"]');
    await expect(page).toHaveURL(/.*live-monitor/);

    // Drivers
    await page.click('a[href="/drivers"]');
    await expect(page).toHaveURL(/.*drivers/);

    // Sessions
    await page.click('a[href="/sessions"]');
    await expect(page).toHaveURL(/.*sessions/);

    // Analytics
    await page.click('a[href="/analytics"]');
    await expect(page).toHaveURL(/.*analytics/);

    // Reports
    await page.click('a[href="/reports"]');
    await expect(page).toHaveURL(/.*reports/);
  });
});
