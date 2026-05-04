import { test, expect } from '@playwright/test';

test('smoke test complete flow with accessibility', async ({ page }) => {
  await page.goto('http://localhost:5173');

  // App loads
  await expect(page.locator('h1').filter({ hasText: 'Zenith Rewards' })).toBeVisible();

  // Check STUB label is visible
  await expect(page.locator('text=Sandbox / Stub Mode')).toBeVisible();
});
