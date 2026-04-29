import { test, expect } from '@playwright/test';

test('has sidebar navigation and routes correctly', async ({ page }) => {
  // Go to root
  await page.goto('/');

  // Check Dashboard loads
  await expect(page.getByRole('heading', { name: 'Total Liquid Value' })).toBeVisible();

  // Navigate to Portfolio
  await page.getByRole('link', { name: 'Portfolio' }).click();
  await expect(page.getByRole('heading', { name: 'Points Portfolio' })).toBeVisible();

  // Navigate to Optimization
  await page.getByRole('link', { name: 'Optimization' }).click();
  await expect(page.getByRole('heading', { name: 'Optimization Engine' })).toBeVisible();

  // Navigate to History
  await page.getByRole('link', { name: 'History' }).click();
  await expect(page.getByRole('heading', { name: 'Transaction History' })).toBeVisible();
});
