import { test, expect } from '@playwright/test';
import {
  FAKE_PROJECT_ID,
  FAKE_TASK_ID,
  defaultMockProject,
  defaultMockTask,
  mockProjectById,
  mockProjectExports,
  mockProjectMembers,
  mockTasksForProject,
  setupAuthenticatedPage,
} from './fixtures';

const PROJECT_URL = `/projects/${FAKE_PROJECT_ID}`;

test.describe('project detail', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
    const project = defaultMockProject();
    await mockProjectById(page, project);
    await mockProjectMembers(page, FAKE_PROJECT_ID);
    await mockProjectExports(page, FAKE_PROJECT_ID);
  });

  test('shows empty tasks state', async ({ page }) => {
    await mockTasksForProject(page, FAKE_PROJECT_ID, []);

    await page.goto(PROJECT_URL);

    await expect(page.getByRole('heading', { name: 'Apollo' })).toBeVisible();
    await expect(page.getByText('moon shot')).toBeVisible();
    await expect(page.getByText('Brak zadań w tym projekcie.')).toBeVisible();
  });

  test('lists tasks and opens task detail', async ({ page }) => {
    const task = defaultMockTask({ title: 'Deploy staging' });
    await mockTasksForProject(page, FAKE_PROJECT_ID, [task]);

    await page.goto(PROJECT_URL);

    await expect(page.getByRole('link', { name: /Deploy staging/ })).toBeVisible();
    await page.getByRole('link', { name: /Deploy staging/ }).click();

    await expect(page).toHaveURL(new RegExp(`/tasks/${task.id}$`));
  });

  test('creates a new task', async ({ page }) => {
    await mockTasksForProject(page, FAKE_PROJECT_ID, []);

    await page.goto(PROJECT_URL);
    await page.getByRole('button', { name: 'Nowe zadanie' }).click();
    await page.getByPlaceholder('Tytuł zadania (wymagane)').fill('Fix CI pipeline');
    await page.getByPlaceholder('Opis (opcjonalny)').fill('green build required');
    await page.getByRole('button', { name: 'Utwórz zadanie' }).click();

    await expect(page.getByRole('link', { name: /Fix CI pipeline/ })).toBeVisible();
    await expect(page.getByText('green build required')).toBeVisible();
  });

  test('filters tasks by status', async ({ page }) => {
    await mockTasksForProject(page, FAKE_PROJECT_ID, [
      defaultMockTask({ id: 't1', title: 'Todo item', status: 0 }),
      defaultMockTask({ id: 't2', title: 'Active item', status: 1 }),
      defaultMockTask({ id: FAKE_TASK_ID, title: 'Hidden when filtered', status: 3 }),
    ]);

    await page.goto(PROJECT_URL);
    await page.getByRole('button', { name: 'In Progress' }).click();

    await expect(page.getByRole('link', { name: /Active item/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Todo item/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: /Hidden when filtered/ })).toHaveCount(0);
  });
});
