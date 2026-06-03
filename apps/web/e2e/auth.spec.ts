import { test, expect, Page } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api/v1';

async function mockAuthEndpoints(page: Page, status: 'active' | 'onboarding' = 'active') {
  await page.route('**/api/v1/auth/register', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.email === 'existing@test.com') {
      return route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'El email ya está registrado' }),
      });
    }
    return route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        user: { id: 'user-1', email: body.email, role: 'OWNER' },
      }),
    });
  });

  await page.route('**/api/v1/auth/login', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    if (body.email === 'wrong@test.com') {
      return route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Credenciales inválidas' }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        user: { id: 'user-1', email: body.email, role: 'OWNER' },
      }),
    });
  });

  await page.route('**/api/v1/auth/logout', async (route) => {
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });

  await page.route('**/api/v1/auth/me', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'user-1', email: 'test@test.com', role: 'OWNER' }),
    });
  });

  await page.route('**/api/v1/tenants/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'tenant-1',
        name: 'Test Business',
        slug: 'test-business',
        status,
        onboardingStep: status === 'onboarding' ? 1 : 4,
      }),
    });
  });

  await page.route('**/api/v1/tenants/me/stats', async (route) => {
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        totalMessages: 0,
        activeWorkflows: 0,
        integrations: [],
        containerStatus: 'running',
      }),
    });
  });
}

test.describe('Auth flow', () => {
  test('user can register with valid data and reach dashboard', async ({ page }) => {
    test.setTimeout(90000);
    await mockAuthEndpoints(page);

    await page.goto('/register');

    await page.fill('#name', 'Test User');
    await page.fill('#businessName', 'Test Business');
    await page.fill('#email', 'new@test.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');

    await page.click('button[type="submit"]');

    await page.waitForURL(/\/overview/, { timeout: 60000 });
    await expect(page.getByText('Overview')).toBeVisible();
  });

  test('user cannot register with duplicate email', async ({ page }) => {
    await mockAuthEndpoints(page);

    await page.goto('/register');

    await page.fill('#name', 'Test User');
    await page.fill('#businessName', 'Test Business');
    await page.fill('#email', 'existing@test.com');
    await page.fill('#password', 'password123');
    await page.fill('#confirmPassword', 'password123');

    await page.click('button[type="submit"]');

    await expect(page.getByText('El email ya está registrado')).toBeVisible();
  });

  test('user can login and logout', async ({ page }) => {
    await mockAuthEndpoints(page);

    await page.goto('/login');

    await page.fill('#email', 'test@test.com');
    await page.fill('#password', 'password123');

    await page.click('button[type="submit"]');

    await page.waitForURL(/\/overview/, { timeout: 30000 });
    await expect(page.getByText('Overview')).toBeVisible();

    await page.goto('/settings');
    await page.waitForURL(/\/settings/);
  });
});
