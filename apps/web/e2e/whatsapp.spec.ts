import { test, expect, Page } from '@playwright/test';

async function setupAuth(page: Page) {
  await page.context().addCookies([
    { name: 'autoclaw_access_token', value: 'test-token', url: 'http://localhost:3001' },
    { name: 'autoclaw_refresh_token', value: 'test-token', url: 'http://localhost:3001' },
  ]);

  await page.route('**/api/v1/tenants/me', async (route) => {
    if (route.request().method() === 'PATCH') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'tenant-1', name: 'Test Business', slug: 'test-business',
        status: 'ACTIVE', onboardingStep: 4,
      }),
    });
  });

  await page.route('**/api/v1/tenants/me/stats', async (route) => {
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ totalMessages: 0, activeWorkflows: 0, integrations: [], containerStatus: 'running' }),
    });
  });
}

test.describe('WhatsApp flow', () => {
  test('user can connect WhatsApp', async ({ page }) => {
    let connected = false;
    const phoneNumber = '+5491112345678';

    await setupAuth(page);

    await page.route('**/api/v1/whatsapp/status', async (route) => {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ connected, phoneNumber: connected ? phoneNumber : undefined }),
      });
    });

    await page.route('**/api/v1/whatsapp/connect', async (route) => {
      connected = true;
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.route('**/api/v1/workflows', async (route) => {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [], total: 0, page: 1, limit: 20 }) });
    });

    await page.goto('/whatsapp');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Conectar WhatsApp').first()).toBeVisible();

    await page.fill('#phoneNumberId', '123456789012345');
    await page.fill('#accessToken', 'EAATtesttoken');
    await page.fill('#webhookSecret', 'my_webhook_secret');

    await page.click('button[type="submit"]');

    await page.waitForLoadState('networkidle');

    await expect(page.getByText('WhatsApp conectado')).toBeVisible();
    await expect(page.getByText(phoneNumber)).toBeVisible();
  });

  test('user can create a workflow', async ({ page }) => {
    const workflows: Array<{ id: string; name: string; trigger: string; active: boolean }> = [];

    await setupAuth(page);

    await page.route('**/api/v1/whatsapp/status', async (route) => {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ connected: true, phoneNumber: '+5491112345678' }),
      });
    });

    await page.route('**/api/v1/workflows', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        const newWf = { id: `wf-${Date.now()}`, name: body.name, trigger: body.trigger, active: true };
        workflows.push(newWf);
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newWf) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: workflows, total: workflows.length, page: 1, limit: 20 }) });
    });

    await page.goto('/whatsapp');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('No tenés workflows creados')).toBeVisible();

    await page.getByRole('button', { name: 'Nuevo Workflow' }).click();

    await page.fill('#wf-name', 'Responder pedidos');
    await page.fill('#wf-prompt', 'Respondé amablemente al cliente.');
    await page.getByRole('button', { name: 'Guardar workflow' }).click();

    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Responder pedidos')).toBeVisible();
  });

  test('user can toggle workflow active/inactive', async ({ page }) => {
    const workflows = [
      { id: 'wf-1', name: 'Workflow test', trigger: 'WHATSAPP_MESSAGE', active: true },
    ];

    await setupAuth(page);

    await page.route('**/api/v1/whatsapp/status', async (route) => {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ connected: true, phoneNumber: '+5491112345678' }),
      });
    });

    await page.route('**/api/v1/workflows', async (route) => {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ data: workflows, total: workflows.length, page: 1, limit: 20 }),
      });
    });

    await page.route(/\/api\/v1\/workflows\/(.+)\/toggle/, async (route) => {
      const match = route.request().url().match(/\/workflows\/(.+)\/toggle/);
      const id = match?.[1];
      const wf = workflows.find((w) => w.id === id);
      if (wf) wf.active = !wf.active;
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/whatsapp');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Workflow test')).toBeVisible();
    await expect(page.getByText('Activo')).toBeVisible();

    const toggle = page.locator('label.inline-flex').first();
    await toggle.click();

    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Inactivo')).toBeVisible();
  });
});
