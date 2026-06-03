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
      status: 200, contentType: 'application/json',
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

test.describe('Billing flow', () => {
  test('user sees current plan', async ({ page }) => {
    test.setTimeout(90000);
    await setupAuth(page);

    await page.route('**/api/v1/billing/current', async (route) => {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          plan: 'STARTER',
          renewalDate: null,
          messagesUsed: 42,
          messagesLimit: 500,
          usagePercentage: 8.4,
        }),
      });
    });

    await page.goto('/settings');

    await expect(page.getByText('Plan y Facturación')).toBeVisible();
    await expect(page.getByText('Starter').first()).toBeVisible();
    await expect(page.getByText('8.4%')).toBeVisible();
  });

  test('upgrade button redirects to MercadoPago', async ({ page }) => {
    await setupAuth(page);

    await page.route('**/api/v1/billing/current', async (route) => {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          plan: 'STARTER',
          renewalDate: null,
          messagesUsed: 100,
          messagesLimit: 500,
          usagePercentage: 20,
        }),
      });
    });

    await page.route('**/api/v1/billing/subscribe', async (route) => {
      return route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          checkoutUrl: 'https://www.mercadopago.com.ar/checkout/test',
        }),
      });
    });

    await page.goto('/settings');

    const upgradeButton = page.getByRole('button', { name: /Actualizar/i }).first();
    await expect(upgradeButton).toBeVisible();
  });
});
