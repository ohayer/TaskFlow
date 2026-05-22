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

const FAKE_TOKEN = 'fake.jwt.token';
const FAKE_USER: MockUser = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'demo@taskflow.test',
  displayName: 'Demo User',
};

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

  await page.route('**/api/users/me', async (route: Route) =>
    route.fulfill({ status: 200, json: FAKE_USER })
  );
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
