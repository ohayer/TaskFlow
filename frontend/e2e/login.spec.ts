import { test, expect } from '@playwright/test';
import { mockAuth, mockProjects } from './fixtures';

test.describe('login page', () => {
  test('renders the login form and brand heading', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'TaskFlow' })).toBeVisible();
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    await expect(page.getByPlaceholder(/Hasło/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zaloguj' })).toBeVisible();
  });

  test('switches between login and register tabs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByPlaceholder('Imię i nazwisko')).toHaveCount(0);

    await page.getByRole('button', { name: 'Rejestracja' }).click();
    await expect(page.getByPlaceholder('Imię i nazwisko')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zarejestruj się' })).toBeVisible();

    await page.getByRole('button', { name: 'Logowanie' }).click();
    await expect(page.getByPlaceholder('Imię i nazwisko')).toHaveCount(0);
  });

  test('shows error from API on wrong credentials', async ({ page }) => {
    await mockAuth(page, { failLogin: true });

    await page.goto('/');
    await page.getByPlaceholder('Email').fill('nobody@taskflow.test');
    await page.getByPlaceholder(/Hasło/).fill('wrong-password');
    await page.getByRole('button', { name: 'Zaloguj' }).click();

    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('successful login navigates to the dashboard', async ({ page }) => {
    await mockAuth(page);
    await mockProjects(page, []);

    await page.goto('/');
    await page.getByPlaceholder('Email').fill('demo@taskflow.test');
    await page.getByPlaceholder(/Hasło/).fill('Pa$$w0rd!');
    await page.getByRole('button', { name: 'Zaloguj' }).click();

    await expect(page.getByRole('heading', { name: 'Twoje projekty' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Nowy projekt/ })).toBeVisible();
  });
});
