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
 await expect(root.locator('[data-error]')).toContainText(/nested objects/i);
 await expect(root.locator('[data-download]')).toBeDisabled();
});


test('all ten formats can convert forward, swap direction, and convert back', async ({page})=>{
  const ids=['markdown-html','html-plain-text','csv-html-table','ini-json','json-yaml','json-toml','yaml-toml','xml-csv','vcf-csv','ics-csv'];
  for(const id of ids){
    await page.goto('/convert/'+id+'/');
    const root=page.locator('[data-format-workbench]');
    await expect(root).toHaveAttribute('data-ready','true');
    await root.locator('[data-run]').click();
    const forward=await root.locator('[data-output]').inputValue();
    expect(forward.trim().length,id+' forward must not be blank').toBeGreaterThan(0);
    await root.locator('[data-swap]').click();
    await expect(root.locator('[data-direction]')).toHaveValue('reverse');
    await expect(root.locator('[data-input]')).toHaveValue(forward);
    await expect(root.locator('[data-output]')).toHaveValue('');
    await expect(root.locator('[data-download]')).toBeDisabled();
    await root.locator('[data-run]').click();
    const reverse=await root.locator('[data-output]').inputValue();
    expect(reverse.trim().length,id+' reverse must not be blank').toBeGreaterThan(0);
    await expect(root.locator('[data-error]')).toBeHidden();
    await expect(root.locator('[data-download]')).toBeEnabled();
  }
});

test('JSON/YAML/TOML formats preserve scalar values in two directions',async({page})=>{
  for(const slug of ['json-yaml','json-toml']){
    await page.goto('/convert/'+slug+'/');
    const root=page.locator('[data-format-workbench]');
    await expect(root).toHaveAttribute('data-ready','true');
    const original={city:'Hồ Chí Minh',emoji:'🍜',enabled:true,items:8,flag:false};
    await root.locator('[data-input]').fill(JSON.stringify(original));
    await root.locator('[data-run]').click();
    await root.locator('[data-swap]').click();
    await root.locator('[data-run]').click();
    expect(JSON.parse(await root.locator('[data-output]').inputValue())).toEqual(original);
  }
});

test('CSV ↔ HTML table escapes markup and preserves quoted CSV values',async({page})=>{
  await page.goto('/convert/csv-html-table/');
  const root=page.locator('[data-format-workbench]');
  await expect(root).toHaveAttribute('data-ready','true');
  const source='name,note\nAlice,"hello, ""world"""\nBob,"<script>alert(1)</script>"';
  await root.locator('[data-input]').fill(source);
  await root.locator('[data-run]').click();
  const html=await root.locator('[data-output]').inputValue();
  expect(html).toContain('&lt;script&gt;');
  expect(html).not.toContain('<script>');
  await root.locator('[data-swap]').click();
  await root.locator('[data-run]').click();
  const roundTrip=await root.locator('[data-output]').inputValue();
  expect(roundTrip).toContain('Alice,"hello, ""world"""');
  expect(roundTrip).toContain('Bob,<script>alert(1)</script>');
});

test('XML ↔ CSV round trip supports escaped Unicode and rejects invalid XML column headings',async({page})=>{
  await page.goto('/convert/xml-csv/');
  const root=page.locator('[data-format-workbench]');
  await expect(root).toHaveAttribute('data-ready','true');
  await root.locator('[data-direction]').selectOption('reverse');
  await root.locator('[data-input]').fill('name,note\nAn,"Hà Nội & 🍜"');
  await root.locator('[data-run]').click();
  const xml=await root.locator('[data-output]').inputValue();
  expect(xml).toContain('Hà Nội &amp; 🍜');
  await root.locator('[data-swap]').click();
  await root.locator('[data-run]').click();
  expect(await root.locator('[data-output]').inputValue()).toContain('Hà Nội & 🍜');

  await root.locator('[data-swap]').click();
  await root.locator('[data-input]').fill('full name,value\nA,1');
  await root.locator('[data-run]').click();
  await expect(root.locator('[data-error]')).toContainText('headings');
});

test('structured reverse tools reject unrepresentable data rather than silently dropping it',async({page})=>{
  const cases=[
    {id:'json-toml',source:'a = null',message:/unsupported TOML value/i},
    {id:'json-yaml',source:'a:\n  b: nested',message:/simple YAML|nested|indented/i},
    {id:'yaml-toml',source:'[section]\na = 1',message:/flat TOML/i},
    {id:'csv-html-table',source:'<table><tr><td colspan="2">x</td></tr></table>',message:/merged/i},
    {id:'ics-csv',source:'UID,DTSTART,DTEND,SUMMARY,LOCATION,DESCRIPTION\nid,20270230T120000Z,,Invalid,,',message:/invalid UTC calendar date/i}
  ];
  for(const c of cases){
    await page.goto('/convert/'+c.id+'/');
    const root=page.locator('[data-format-workbench]');
    await expect(root).toHaveAttribute('data-ready','true');
    await root.locator('[data-direction]').selectOption('reverse');
    await root.locator('[data-input]').fill(c.source);
    await root.locator('[data-run]').click();
    await expect(root.locator('[data-error]')).toContainText(c.message);
    await expect(root.locator('[data-download]')).toBeDisabled();
  }
});


test('switching direction preserves user-pasted data, while chaining completed output',async({page})=>{
  await page.goto('/convert/json-toml/');
  const root=page.locator('[data-format-workbench]');
  await expect(root).toHaveAttribute('data-ready','true');
  const custom='title = "A custom user value"';
  await root.locator('[data-input]').fill(custom);
  await root.locator('[data-direction]').selectOption('reverse');
  await expect(root.locator('[data-input]')).toHaveValue(custom);
  await root.locator('[data-run]').click();
  await expect(root.locator('[data-output]')).toHaveValue(/A custom user value/);
  const produced=await root.locator('[data-output]').inputValue();
  await root.locator('[data-swap]').click();
  await expect(root.locator('[data-input]')).toHaveValue(produced);
  await root.locator('[data-run]').click();
  await expect(root.locator('[data-output]')).toHaveValue(/title = "A custom user value"/);
});
