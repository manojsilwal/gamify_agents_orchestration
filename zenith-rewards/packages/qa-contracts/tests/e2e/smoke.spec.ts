import { expect, test } from '@playwright/test';

/** Minimal smoke; full coverage is `zenith-live.spec.ts`. */
test('app shell and dashboard hero load', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Zenith').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Total Liquid Value' })).toBeVisible();
});
