import { Page, Route } from '@playwright/test';

export interface MockUser {
  id: string;
  email: string;
  displayName: string;
}

export interface MockProject {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  memberCount: number;
  taskCount: number;
}

export const FAKE_PROJECT_ID = 'aaaa1111-0000-0000-0000-000000000000';
export const FAKE_TASK_ID = 'task1111-0000-0000-0000-000000000001';

const FAKE_TOKEN = 'fake.jwt.token';
const FAKE_USER: MockUser & { notificationPreference: number } = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'demo@taskflow.test',
  displayName: 'Demo User',
  notificationPreference: 0,
};

export interface MockTask {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: number;
  assigneeId: string | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
}

export interface MockAttachment {
  id: string;
  taskId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  downloadUrl: string;
  thumbnailUrl: string | null;
  aiTags: string[];
  aiCaption: string | null;
  uploadedAt: string;
}

export interface MockAuditEntry {
  id: string;
  action: string;
  performedById: string;
  performedByName: string | null;
  performedByEmail: string | null;
  timestamp: string;
  previousState: string | null;
  newState: string | null;
}

export async function setupAuthenticatedPage(page: Page) {
  const seed = seededAuthLocalStorage();
  await page.addInitScript(({ key, value }) => {
    window.localStorage.setItem(key, value);
  }, seed);
  await mockAuth(page);
}

export async function mockAuth(page: Page, opts?: { failLogin?: boolean }) {
  await page.route('**/api/auth/login', async (route: Route) => {
    if (opts?.failLogin) {
      await route.fulfill({ status: 401, json: { error: 'Invalid email or password' } });
      return;
    }
    await route.fulfill({
      status: 200,
      json: {
        token: FAKE_TOKEN,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        user: FAKE_USER,
      },
    });
  });

  await page.route('**/api/auth/register', async (route: Route) => {
    await route.fulfill({
      status: 200,
      json: {
        token: FAKE_TOKEN,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        user: FAKE_USER,
      },
    });
  });

  await page.route('**/api/users/me', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: FAKE_USER });
      return;
    }
    await route.continue();
  });

  await page.route('**/api/users/me/notification-preference', async (route: Route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as { channel: number; phoneNumber?: string };
      FAKE_USER.notificationPreference = body.channel;
      await route.fulfill({ status: 204 });
      return;
    }
    await route.continue();
  });
}

export async function mockProjects(page: Page, projects: MockProject[]) {
  const store = [...projects];

  await page.route('**/api/projects', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: store });
      return;
    }
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { name: string; description: string | null };
      const created: MockProject = {
        id: crypto.randomUUID(),
        name: body.name,
        description: body.description,
        ownerId: FAKE_USER.id,
        createdAt: new Date().toISOString(),
        memberCount: 1,
        taskCount: 0,
      };
      store.push(created);
      await route.fulfill({ status: 201, json: created });
      return;
    }
    await route.continue();
  });
}

function pathnameMatches(url: string, pathname: string) {
  return new URL(url).pathname === pathname;
}

export async function mockProjectById(page: Page, project: MockProject) {
  const path = `/api/projects/${project.id}`;
  await page.route(
    (url) => pathnameMatches(url, path),
    async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: project });
        return;
      }
      await route.continue();
    },
  );
}

export async function mockTasksForProject(page: Page, projectId: string, initial: MockTask[]) {
  const store = [...initial];
  const path = `/api/projects/${projectId}/tasks`;

  await page.route(
    (url) => pathnameMatches(url, path),
    async (route: Route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === 'GET') {
      const statusParam = url.searchParams.get('status');
      const filtered =
        statusParam === null || statusParam === ''
          ? store
          : store.filter((t) => t.status === Number(statusParam));
      await route.fulfill({ status: 200, json: filtered });
      return;
    }
    if (route.request().method() === 'POST') {
      const body = route.request().postDataJSON() as { title: string; description: string | null };
      const created: MockTask = {
        id: crypto.randomUUID(),
        projectId,
        title: body.title,
        description: body.description,
        status: 0,
        assigneeId: null,
        dueDate: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachmentCount: 0,
      };
      store.push(created);
      await route.fulfill({ status: 201, json: created });
      return;
    }
    await route.continue();
    },
  );
}

export async function mockTaskById(page: Page, task: MockTask) {
  const path = `/api/tasks/${task.id}`;
  await page.route(
    (url) => pathnameMatches(url, path),
    async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: task });
      return;
    }
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as Partial<MockTask>;
      Object.assign(task, body, { updatedAt: new Date().toISOString() });
      await route.fulfill({ status: 200, json: task });
      return;
    }
    await route.continue();
    },
  );
}

export async function mockProjectMembers(page: Page, projectId: string) {
  const path = `/api/projects/${projectId}/members`;
  await page.route(
    (url) => pathnameMatches(url, path),
    async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        json: [
          {
            userId: FAKE_USER.id,
            email: FAKE_USER.email,
            displayName: FAKE_USER.displayName,
            role: 2,
            joinedAt: new Date().toISOString(),
            isOwner: true,
          },
        ],
      });
      return;
    }
    await route.continue();
    },
  );
}

export async function mockProjectExports(page: Page, projectId: string, exports: { fileName: string; url: string; sizeBytes: number; createdAt: string }[] = []) {
  const path = `/api/projects/${projectId}/exports`;
  await page.route(
    (url) => pathnameMatches(url, path),
    async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: exports });
      return;
    }
    if (route.request().method() === 'POST') {
      const created = {
        fileName: `export-${Date.now()}.csv`,
        url: `/api/projects/${projectId}/exports/export.csv`,
        sizeBytes: 1024,
        createdAt: new Date().toISOString(),
      };
      await route.fulfill({ status: 201, json: created });
      return;
    }
    await route.continue();
    },
  );
}

export async function mockAttachments(page: Page, taskId: string, attachments: MockAttachment[]) {
  const path = `/api/tasks/${taskId}/attachments`;
  await page.route(
    (url) => pathnameMatches(url, path),
    async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: attachments });
      return;
    }
    await route.continue();
    },
  );
}

export async function mockTaskAudit(page: Page, taskId: string, entries: MockAuditEntry[] = []) {
  const path = `/api/tasks/${taskId}/audit`;
  await page.route(
    (url) => pathnameMatches(url, path),
    async (route: Route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, json: entries });
        return;
      }
      await route.continue();
    },
  );
}

export function defaultMockProject(overrides?: Partial<MockProject>): MockProject {
  return {
    id: FAKE_PROJECT_ID,
    name: 'Apollo',
    description: 'moon shot',
    ownerId: FAKE_USER.id,
    createdAt: new Date().toISOString(),
    memberCount: 1,
    taskCount: 1,
    ...overrides,
  };
}

export function defaultMockTask(overrides?: Partial<MockTask>): MockTask {
  return {
    id: FAKE_TASK_ID,
    projectId: FAKE_PROJECT_ID,
    title: 'Przygotować raport',
    description: 'CSV z zadaniami',
    status: 0,
    assigneeId: null,
    dueDate: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    attachmentCount: 0,
    ...overrides,
  };
}

export function seededAuthLocalStorage() {
  // Match the shape the AuthContext writes — see frontend/src/api/client.ts STORAGE_KEY.
  return {
    key: 'taskflow.auth',
    value: JSON.stringify({
      token: FAKE_TOKEN,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      user: FAKE_USER,
    }),
  };
}
