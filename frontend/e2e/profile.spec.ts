import { test, expect } from '@playwright/test';
import { setupAuthenticatedPage } from './fixtures';

test.describe('profile', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('displays account info and saves SMS notification preference', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
    await expect(page.getByRole('main').getByText('Demo User')).toBeVisible();
    await expect(page.getByRole('main').getByText('demo@taskflow.test')).toBeVisible();

    await page.locator('input[type="radio"][value="1"]').check();
    await expect(page.getByPlaceholder('+48 ...')).toBeVisible();
    await page.getByPlaceholder('+48 ...').fill('+48123456789');
    await page.getByRole('button', { name: 'Zapisz preferencję' }).click();

    await expect(page.getByText('Zapisano.')).toBeVisible();
  });
});
