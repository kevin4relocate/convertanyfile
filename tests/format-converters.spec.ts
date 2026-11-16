import {test,expect} from '@playwright/test';

test('format converter directory links to ten working browser tools',async({page})=>{
 await page.goto('/format-converters/');
 const links=page.locator('.tools a');
 await expect(links).toHaveCount(10);
 for(const href of ['markdown-html','html-plain-text','csv-html-table','ini-json','json-yaml','json-toml','yaml-toml','xml-csv','vcf-csv','ics-csv']){
  await expect(page.locator('.tools a[href="/convert/'+href+'/"]')).toBeVisible();
 }
});

test('all lightweight format converters produce output',async({page})=>{
 const ids=['markdown-html','html-plain-text','csv-html-table','ini-json','json-yaml','json-toml','yaml-toml','xml-csv','vcf-csv','ics-csv'];
 for(const id of ids){
  await page.goto('/convert/'+id+'/');
  const root=page.locator('[data-format-workbench]');
  await expect(root).toHaveAttribute('data-ready','true');
  await root.locator('[data-run]').click();
  await expect(root.locator('[data-output]')).not.toHaveValue('');
  await expect(root.locator('[data-download]')).toBeEnabled();
 }
});

test('converter rejects invalid structured data and clears outdated output',async({page})=>{
 await page.goto('/convert/json-toml/');
 const root=page.locator('[data-format-workbench]');
 await expect(root).toHaveAttribute('data-ready','true');
 await root.locator('[data-run]').click();
 await expect(root.locator('[data-output]')).not.toHaveValue('');
 await root.locator('[data-input]').fill('{"nested":{"x":1}}');
 await expect(root.locator('[data-output]')).toHaveValue('');
 await root.locator('[data-run]').click();
 await expect(root.locator('[data-error]')).toContainText('Nested');
 await expect(root.locator('[data-download]')).toBeDisabled();
});
