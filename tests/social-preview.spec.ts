import { expect, test } from '@playwright/test';

test('all site pages declare a fully qualified, shareable 1200×630 PNG OG image',async({request})=>{
 for(const page of ['/','/image-converter/','/image-tools/','/data-tools/','/guides/']){
  const res=await request.get(page);
  expect(res.ok(),page).toBeTruthy();
  const html=await res.text();
  expect(html).toContain('property="og:image" content="https://convertanyfile.net/social-card.png"');
  expect(html).toContain('property="og:image:width" content="1200"');
  expect(html).toContain('property="og:image:height" content="630"');
  expect(html).toContain('name="twitter:card" content="summary_large_image"');
  expect(html).toContain('name="twitter:image" content="https://convertanyfile.net/social-card.png"');
 }
 const img=await request.get('/social-card.png');
 expect(img.ok()).toBeTruthy();
 expect(img.headers()['content-type']).toMatch(/image\/png/);
 const bytes=await img.body();
 expect(bytes.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
 expect(bytes.readUInt32BE(16)).toBe(1200);
 expect(bytes.readUInt32BE(20)).toBe(630);
 expect(bytes.length).toBeGreaterThan(5000);
});
