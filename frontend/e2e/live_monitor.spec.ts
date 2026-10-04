import { test, expect } from '@playwright/test';

test.describe('SafeDrive AI - Real-time Live Monitoring & Telemetry HUD', () => {
  test('should display video canvas HUD with Demo Mode switch', async ({ page }) => {
    await page.goto('/live-monitor');

    await expect(page.getByText(/Live Driver Monitoring/i)).toBeVisible();
    await expect(page.getByText(/DEMO MODE/i)).toBeVisible();

    // Verify Telemetry HUD panels
    await expect(page.getByText(/Gaze & Head Pose/i)).toBeVisible();
    await expect(page.getByText(/Eye State \(EAR\)/i)).toBeVisible();
    await expect(page.getByText(/Yawn State \(MAR\)/i)).toBeVisible();
    await expect(page.getByText(/Cell Phone/i)).toBeVisible();

    // Verify Risk meter
    await expect(page.getByText(/Dynamic Risk Engine/i)).toBeVisible();
  });

  test('should toggle between Demo Simulation and Webcam mode', async ({ page }) => {
    await page.goto('/live-monitor');

    const demoBtn = page.getByRole('button', { name: /Demo Sim/i });
    const webcamBtn = page.getByRole('button', { name: /Webcam/i });

    await expect(demoBtn).toBeVisible();
    await expect(webcamBtn).toBeVisible();

    await webcamBtn.click();
    // Verify audio alert toggle
    const audioToggle = page.getByRole('button', { name: /Alert Audio/i });
    if (await audioToggle.isVisible()) {
      await audioToggle.click();
    }
  });
});
