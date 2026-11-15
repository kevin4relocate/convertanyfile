import { expect, test } from '@playwright/test';

test('build exposes only non-sensitive release metadata', async ({ request }) => {
  const response = await request.get('/build-info.json');
  expect(response.status()).toBe(200);
  const body = await response.json() as Record<string, unknown>;
  expect(Object.keys(body).sort()).toEqual(['builtAt', 'revision', 'site']);
  expect(body.site).toBe('ConvertAnyFile');
  expect(typeof body.revision).toBe('string');
  expect(Number.isFinite(Date.parse(String(body.builtAt)))).toBe(true);
});

test('Text workbench accepts the first Run click only after listeners attach', async ({ page, request }) => {
  const response = await request.get('/text/json-validator/');
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toMatch(/data-tool-run[^>]*disabled/);

  await page.goto('/text/json-validator/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-text-workbench]')).toHaveAttribute('data-tool-ready', 'true');
  await page.locator('[data-tool-run]').click();
  await expect(page.locator('[data-tool-output]')).toContainText('Valid JSON');
  await expect(page.locator('[data-tool-download]')).toBeEnabled();
});

test('Data workbench exposes Run only after the local operation handler is ready', async ({ page, request }) => {
  const response = await request.get('/data/json-schema-validator/');
  expect(response.ok()).toBeTruthy();
  expect(await response.text()).toMatch(/data-data-run[^>]*disabled/);
  await page.goto('/data/json-schema-validator/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-data-workbench]')).toHaveAttribute('data-tool-ready', 'true');
  await page.locator('[data-data-run]').click();
  await expect(page.locator('[data-data-output]')).not.toHaveValue('');
  await expect(page.locator('[data-data-download]')).toBeEnabled();
});
