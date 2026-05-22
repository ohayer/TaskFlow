import { test, expect } from '@playwright/test';
import { mockAuth, mockProjects, seededAuthLocalStorage, type MockProject } from './fixtures';

test.describe('dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-seed the auth token so the app boots straight into the dashboard.
    const seed = seededAuthLocalStorage();
    await page.addInitScript(({ key, value }) => {
      window.localStorage.setItem(key, value);
    }, seed);
    await mockAuth(page);
  });

  test('shows empty state when there are no projects', async ({ page }) => {
    await mockProjects(page, []);

    await page.goto('/');

    await expect(page.getByText('Nie masz jeszcze żadnych projektów.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Utwórz pierwszy/ })).toBeVisible();
  });

  test('lists projects returned by the API', async ({ page }) => {
    const projects: MockProject[] = [
      {
        id: 'aaaa1111-0000-0000-0000-000000000000',
        name: 'Apollo',
        description: 'moon shot',
        ownerId: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date().toISOString(),
        memberCount: 3,
        taskCount: 12,
      },
      {
        id: 'bbbb2222-0000-0000-0000-000000000000',
        name: 'Gemini',
        description: null,
        ownerId: '11111111-1111-1111-1111-111111111111',
        createdAt: new Date().toISOString(),
        memberCount: 1,
        taskCount: 0,
      },
    ];
    await mockProjects(page, projects);

    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Apollo' })).toBeVisible();
    await expect(page.getByText('moon shot')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Gemini' })).toBeVisible();
    await expect(page.getByText('12 zadań')).toBeVisible();
  });

  test('creating a project POSTs and shows it in the list', async ({ page }) => {
    await mockProjects(page, []);

    await page.goto('/');
    await page.getByRole('button', { name: /Nowy projekt/ }).click();

    await page.getByPlaceholder('Nazwa projektu').fill('Skylab');
    await page.getByPlaceholder('Opis (opcjonalny)').fill('orbital lab');
    await page.getByRole('button', { name: 'Utwórz' }).click();

    await expect(page.getByRole('heading', { name: 'Skylab' })).toBeVisible();
    await expect(page.getByText('orbital lab')).toBeVisible();
  });
});
