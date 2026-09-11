import { test, expect } from '@playwright/test';

test('score demo loads and shows percentage', async ({ page }) => {
  await page.goto('http://localhost:3000/demo/score-demo');
  await expect(page.getByText('ScoreCard demo')).toBeVisible();
  const pct = await page.locator('text=%').first();
  await expect(pct).toBeVisible();
});
