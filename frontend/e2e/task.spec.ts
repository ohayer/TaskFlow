import { test, expect } from '@playwright/test';
import {
  FAKE_TASK_ID,
  defaultMockTask,
  mockAttachments,
  mockTaskAudit,
  mockTaskById,
  setupAuthenticatedPage,
} from './fixtures';

const TASK_URL = `/tasks/${FAKE_TASK_ID}`;

test.describe('task detail', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
    await mockAttachments(page, FAKE_TASK_ID, []);
    await mockTaskAudit(page, FAKE_TASK_ID);
  });

  test('updates task status and saves', async ({ page }) => {
    const task = defaultMockTask({ status: 0, title: 'Review docs' });
    await mockTaskById(page, task);

    await page.goto(TASK_URL);
    await expect(page.getByText('Szczegóły zadania')).toBeVisible();

    await expect(page.locator('input.text-2xl')).toHaveValue('Review docs');
    await page.locator('select').selectOption({ label: 'Done' });
    await page.getByRole('button', { name: 'Zapisz zmiany' }).click();

    await expect(page.locator('select')).toHaveValue('3');
  });

  test('shows attachments with AI tags', async ({ page }) => {
    const task = defaultMockTask({ attachmentCount: 1 });
    await mockTaskById(page, task);
    await mockAttachments(page, FAKE_TASK_ID, [
      {
        id: 'att-1',
        taskId: FAKE_TASK_ID,
        fileName: 'screenshot.png',
        mimeType: 'image/png',
        sizeBytes: 2048,
        downloadUrl: 'https://example.test/screenshot.png',
        thumbnailUrl: 'https://example.test/thumb.png',
        aiTags: ['dashboard', 'ui'],
        aiCaption: 'A task management dashboard',
        uploadedAt: new Date().toISOString(),
      },
    ]);
    await page.goto(TASK_URL);

    await expect(page.getByText('Szczegóły zadania')).toBeVisible();
    await expect(page.getByText('Załączniki (1)')).toBeVisible();
    await expect(page.getByText('screenshot.png')).toBeVisible();
    await expect(page.getByText('A task management dashboard')).toBeVisible();
    await expect(page.getByRole('button', { name: 'dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'ui' })).toBeVisible();
  });
});
