import { expect, test } from '@playwright/test';
import JSZip from 'jszip';

async function makeZip(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('hello.txt', 'hello');
  return Buffer.from(await zip.generateAsync({ type: 'uint8array' }));
}

test('homepage exposes Images, Data, and Archives as first-class converter tabs', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage category UX regression');
  await page.goto('/');
  const imageTab = page.getByRole('tab', { name: 'Images' });
  const dataTab = page.getByRole('tab', { name: 'Data' });
  const archiveTab = page.getByRole('tab', { name: 'Archives' });
  const imagePanel = page.locator('[data-home-panel="image"]');
  const dataPanel = page.locator('[data-home-panel="data"]');
  const archivePanel = page.locator('[data-home-panel="archive"]');

  await expect(imageTab).toHaveAttribute('aria-selected', 'true');
  await expect(imagePanel).toBeVisible();
  await expect(dataPanel).toBeHidden();
  await expect(archivePanel).toBeHidden();

  await archiveTab.click();
  await expect(archiveTab).toHaveAttribute('aria-selected', 'true');
  await expect(archivePanel).toBeVisible();
  await expect(archivePanel.locator('.converter-topbar strong')).toHaveText('Archive Converter');
  const archiveAccept = await archivePanel.locator('[data-role="file-input"]').getAttribute('accept');
  expect(archiveAccept).toContain('.zip');
  expect(archiveAccept).toContain('.7z');
  expect(archiveAccept).toContain('.rar');

  await dataTab.click();
  await expect(dataPanel).toBeVisible();
  await expect(dataPanel.locator('.converter-topbar strong')).toHaveText('Data Converter');
});

test('homogeneous drops auto-route to the matching category', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage auto-detect regression');
  await page.goto('/');
  const root = page.locator('[data-home-converter]');

  await root.evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['id,name\n1,Alice'], 'people.csv', { type: 'text/csv' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  });
  await expect(page.getByRole('tab', { name: 'Data' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-home-panel="data"] [data-role="file-list"]')).toContainText('people.csv');

  await page.reload();
  const zipBytes = await makeZip();
  await page.locator('[data-home-converter]').evaluate((element, bytes) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([new Uint8Array(bytes)], 'bundle.zip', { type: 'application/zip' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, Array.from(zipBytes));
  await expect(page.getByRole('tab', { name: 'Archives' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-home-panel="archive"] [data-role="file-list"]')).toContainText('bundle.zip');
});

test('mixed-category drops stay on the selected tab and only that category is admitted', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage mixed-category routing regression');
  await page.goto('/');
  await page.getByRole('tab', { name: 'Data' }).click();
  const zipBytes = await makeZip();

  await page.locator('[data-home-converter]').evaluate((element, zip) => {
    const transfer = new DataTransfer();
    transfer.items.add(new File(['fake png bytes'], 'photo.png', { type: 'image/png' }));
    transfer.items.add(new File([new Uint8Array(zip)], 'bundle.zip', { type: 'application/zip' }));
    transfer.items.add(new File(['id,name\n1,Alice'], 'people.csv', { type: 'text/csv' }));
    element.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: transfer }));
  }, Array.from(zipBytes));

  await expect(page.getByRole('tab', { name: 'Data' })).toHaveAttribute('aria-selected', 'true');
  const dataPanel = page.locator('[data-home-panel="data"]');
  await expect(dataPanel.locator('.file-row')).toHaveCount(1);
  await expect(dataPanel.locator('[data-role="file-list"]')).toContainText('people.csv');
  await expect(dataPanel.locator('[data-role="file-list"]')).not.toContainText('photo.png');
  await expect(dataPanel.locator('[data-role="file-list"]')).not.toContainText('bundle.zip');
  await expect(page.locator('[data-home-auto-hint]')).toContainText('Mixed files kept on Data');
});

test('homepage keeps independent queues while switching categories', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage queue-preservation regression');
  await page.goto('/');
  const dataTab = page.getByRole('tab', { name: 'Data' });
  const archiveTab = page.getByRole('tab', { name: 'Archives' });
  const dataPanel = page.locator('[data-home-panel="data"]');
  const archivePanel = page.locator('[data-home-panel="archive"]');

  await dataTab.click();
  await dataPanel.locator('[data-role="file-input"]').setInputFiles({ name: 'records.json', mimeType: 'application/json', buffer: Buffer.from('[{"id":1}]') });
  await expect(dataPanel.locator('.file-row')).toHaveCount(1);

  await archiveTab.click();
  await expect(archivePanel.locator('.file-row')).toHaveCount(0);
  await dataTab.click();
  await expect(dataPanel.locator('[data-role="file-list"]')).toContainText('records.json');
});

test('homepage copy reflects all three live categories', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Homepage copy regression');
  await page.goto('/');
  await expect(page.locator('.hero-lead')).toHaveText('Convert images, archives, and structured data locally in your browser.');
  await expect(page.locator('.proof-strip')).toContainText('3 categories');
  await expect(page.locator('.proof-strip')).toContainText('Images, archives, and structured data are live');
});

test('homepage uses the low-glare dark product theme', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Dark theme regression');
  await page.goto('/');

  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0b0e14');
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'dark');

  const theme = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    const card = getComputedStyle(document.querySelector('.converter-card')!);
    const drop = getComputedStyle(document.querySelector('.drop-zone')!);
    const header = getComputedStyle(document.querySelector('.site-header')!);
    return {
      colorScheme: root.colorScheme,
      rootBackground: root.backgroundColor,
      cardBackground: card.backgroundColor,
      dropBackgroundImage: drop.backgroundImage,
      headerBackground: header.backgroundColor,
    };
  });

  expect(theme.colorScheme).toContain('dark');
  expect(theme.rootBackground).toBe('rgb(11, 14, 20)');
  expect(theme.cardBackground).toBe('rgb(20, 25, 35)');
  expect(theme.dropBackgroundImage).toContain('linear-gradient');
  expect(theme.headerBackground).not.toBe('rgba(0, 0, 0, 0)');
});

test('shared FAQ layout uses separated cards and a stable desktop heading column', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'FAQ layout regression');
  await page.goto('/7z-to-zip/');

  const faq = page.locator('.faq-block');
  const heading = faq.locator(':scope > .section-heading');
  const items = faq.locator('.faq-list details');
  await expect(faq).toBeVisible();
  expect(await items.count()).toBeGreaterThanOrEqual(5);

  const styles = await faq.evaluate((element) => {
    const heading = element.querySelector<HTMLElement>(':scope > .section-heading')!;
    const list = element.querySelector<HTMLElement>('.faq-list')!;
    const first = element.querySelector<HTMLElement>('.faq-list details')!;
    return {
      columns: getComputedStyle(element).gridTemplateColumns,
      headingPosition: getComputedStyle(heading).position,
      listGap: getComputedStyle(list).rowGap,
      firstRadius: getComputedStyle(first).borderRadius,
    };
  });

  expect(styles.columns.split(' ').length).toBeGreaterThanOrEqual(2);
  expect(styles.headingPosition).toBe('sticky');
  expect(parseFloat(styles.listGap)).toBeGreaterThan(0);
  expect(parseFloat(styles.firstRadius)).toBeGreaterThanOrEqual(12);
  await expect(heading).toContainText('7Z to ZIP FAQ');
});

test('FAQ stacks into one full-width column on mobile without overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-mobile', 'Mobile FAQ regression');
  await page.goto('/faq/');

  const faq = page.locator('.faq-block').first();
  const heading = faq.locator(':scope > .section-heading');
  const list = faq.locator('.faq-list');
  const first = list.locator('details').first();

  await expect(faq).toBeVisible();
  await expect(heading).toBeVisible();
  await expect(first).toBeVisible();

  const layout = await faq.evaluate((element) => {
    const heading = element.querySelector<HTMLElement>(':scope > .section-heading')!;
    const list = element.querySelector<HTMLElement>('.faq-list')!;
    const faqBox = element.getBoundingClientRect();
    const headingBox = heading.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    return {
      columns: getComputedStyle(element).gridTemplateColumns,
      headingPosition: getComputedStyle(heading).position,
      faqWidth: faqBox.width,
      headingWidth: headingBox.width,
      listWidth: listBox.width,
      listTop: listBox.top,
      headingBottom: headingBox.bottom,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });

  expect(layout.headingPosition).toBe('static');
  expect(layout.listTop).toBeGreaterThanOrEqual(layout.headingBottom);
  expect(layout.headingWidth).toBeGreaterThan(layout.faqWidth * 0.9);
  expect(layout.listWidth).toBeGreaterThan(layout.faqWidth * 0.9);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
});
