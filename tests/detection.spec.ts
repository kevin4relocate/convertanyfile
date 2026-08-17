import { File } from 'node:buffer';
import { expect, test } from '@playwright/test';
import { detectImage } from '../src/engines/image/detect';
import { imageEngine } from '../src/engines/image/runtime';

const makeFile = (name: string, bytes: Uint8Array | Buffer): globalThis.File =>
  new File([bytes], name) as unknown as globalThis.File;

const PNG_2X2 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DA8J+BkYHh////DAAe9gT9Ce00PgAAAABJRU5ErkJggg==',
  'base64',
);

function hugePngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

test('image detection normalizes supported format families without trusting extensions', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Pure detection regression only needs one project');

  const psb = await detectImage(makeFile('large-document.psb', Buffer.from('8BPS\x00\x00\x00\x02', 'binary')));
  expect(psb?.extension).toBe('psd');

  const j2k = await detectImage(makeFile('codestream.j2k', Uint8Array.from([0xff, 0x4f, 0xff, 0x51, 0x00, 0x00])));
  expect(j2k?.extension).toBe('jp2');

  const ppm = await detectImage(makeFile('pixel.ppm', Buffer.from('P6\n1 1\n255\n\x00\x00\x00', 'binary')));
  expect(ppm?.extension).toBe('pnm');

  const disguisedAudio = await detectImage(makeFile('pretend.jpg', Buffer.from('ID3\x04\x00\x00fake-audio', 'binary')));
  expect(disguisedAudio).toBeNull();
});

test('common image headers expose decoded-memory estimates before the WASM decoder starts', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Pure detection regression only needs one project');

  const normal = await detectImage(makeFile('small.png', PNG_2X2));
  expect(normal?.width).toBe(2);
  expect(normal?.height).toBe(2);
  expect(normal?.estimatedDecodedBytes).toBe(16);

  const hugeFile = makeFile('huge.png', hugePngHeader(12_000, 9_000));
  const huge = await detectImage(hugeFile);
  expect(huge?.estimatedDecodedBytes).toBe(432_000_000);
  await expect(imageEngine.validate(hugeFile)).resolves.toBeNull();
});
