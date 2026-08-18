import { expect, test } from '@playwright/test';

test('homepage exposes Images and Data as first-class converter tabs', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage category UX regression');
  await page.goto('/');

  const imageTab = page.getByRole('tab', { name: 'Images' });
  const dataTab = page.getByRole('tab', { name: 'Data' });
  const imagePanel = page.locator('[data-home-panel="image"]');
  const dataPanel = page.locator('[data-home-panel="data"]');

  await expect(imageTab).toHaveAttribute('aria-selected', 'true');
  await expect(dataTab).toHaveAttribute('aria-selected', 'false');
  await expect(imagePanel).toBeVisible();
  await expect(dataPanel).toBeHidden();
  await expect(imagePanel.locator('.converter-topbar strong')).toHaveText('Image Converter');

  await dataTab.click();
  await expect(dataTab).toHaveAttribute('aria-selected', 'true');
  await expect(imageTab).toHaveAttribute('aria-selected', 'false');
  await expect(dataPanel).toBeVisible();
  await expect(imagePanel).toBeHidden();
  await expect(dataPanel.locator('.converter-topbar strong')).toHaveText('Data Converter');
  const dataAccept = await dataPanel.locator('[data-role="file-input"]').getAttribute('accept');
  expect(dataAccept).toContain('.csv');
  expect(dataAccept).toContain('.json');
  expect(dataAccept).not.toContain('.png');

  await imageTab.click();
  await expect(imagePanel).toBeVisible();
  await expect(dataPanel).toBeHidden();
});

test('dropping a data file on the homepage automatically routes it to Data', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage auto-detect regression');
  await page.goto('/');

  const root = page.locator('[data-home-converter]');
  const dataTab = page.getByRole('tab', { name: 'Data' });
  const dataPanel = page.locator('[data-home-panel="data"]');

  await root.evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['id,name\n1,Alice'], 'people.csv', { type: 'text/csv' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });

  await expect(dataTab).toHaveAttribute('aria-selected', 'true');
  await expect(dataPanel).toBeVisible();
  await expect(dataPanel.locator('.file-row')).toHaveCount(1);
  await expect(dataPanel.locator('[data-role="file-list"]')).toContainText('people.csv');
  await expect(dataPanel.locator('[data-role="output-format"]')).toBeEnabled();
  await expect(dataPanel.locator('[data-role="engine-state"]')).toContainText('Private converter ready');
});

test('homepage keeps independent Image and Data queues while switching tabs', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage queue-preservation regression');
  await page.goto('/');

  const imageTab = page.getByRole('tab', { name: 'Images' });
  const dataTab = page.getByRole('tab', { name: 'Data' });
  const imagePanel = page.locator('[data-home-panel="image"]');
  const dataPanel = page.locator('[data-home-panel="data"]');

  await dataTab.click();
  await dataPanel.locator('[data-role="file-input"]').setInputFiles({
    name: 'records.json',
    mimeType: 'application/json',
    buffer: Buffer.from('[{"id":1,"name":"Alice"}]'),
  });
  await expect(dataPanel.locator('.file-row')).toHaveCount(1);

  await imageTab.click();
  await expect(imagePanel).toBeVisible();
  await expect(dataPanel).toBeHidden();
  await expect(imagePanel.locator('.file-row')).toHaveCount(0);

  await dataTab.click();
  await expect(dataPanel.locator('.file-row')).toHaveCount(1);
  await expect(dataPanel.locator('[data-role="file-list"]')).toContainText('records.json');
});
