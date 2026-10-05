import { test, expect } from '@playwright/test';

test.describe('SafeDrive AI - Real-time Live Monitoring & Telemetry HUD', () => {
  test('should display video canvas HUD and mode indicators', async ({ page }) => {
    await page.goto('/live-monitor');

    await expect(page.getByText(/Driver Monitoring Console/i)).toBeVisible();
    await expect(page.getByText(/DEMO MODE/i).first()).toBeVisible();

    // Verify Risk meter and Status indicators
    await expect(page.getByText(/Real-Time Risk Score/i)).toBeVisible();
    await expect(page.getByText(/Fused Safety Risk Index/i)).toBeVisible();
  });

  test('should interact with Webcam controls and audio alert toggles', async ({ page }) => {
    await page.goto('/live-monitor');

    const webcamBtn = page.getByRole('button', { name: /Start Webcam/i });
    await expect(webcamBtn).toBeVisible();

    // Verify audio alert toggle
    const audioToggle = page.getByRole('button', { name: /Audio/i });
    await expect(audioToggle).toBeVisible();
    await audioToggle.click();
    await expect(page.getByRole('button', { name: /Audio Muted/i })).toBeVisible();
  });
});

