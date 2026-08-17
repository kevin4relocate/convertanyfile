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

function pcx1x1(): Uint8Array {
  const bytes = new Uint8Array(135);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x0a; bytes[1] = 5; bytes[2] = 1; bytes[3] = 8;
  view.setUint16(8, 0, true); view.setUint16(10, 0, true);
  view.setUint16(12, 72, true); view.setUint16(14, 72, true);
  bytes[65] = 3; view.setUint16(66, 2, true); view.setUint16(68, 1, true);
  bytes.set([0xc1, 0xff, 0x00, 0xc2, 0x00, 0xc2, 0x00], 128);
  return bytes;
}

function tga1x1(): Uint8Array {
  const bytes = new Uint8Array(21);
  const view = new DataView(bytes.buffer);
  bytes[2] = 2;
  view.setUint16(12, 1, true); view.setUint16(14, 1, true);
  bytes[16] = 24; bytes[17] = 0x20;
  bytes.set([0x00, 0x00, 0xff], 18);
  return bytes;
}

function icoWithPng(png: Buffer, corrupt = false): Uint8Array {
  const bytes = new Uint8Array(22 + png.length);
  const view = new DataView(bytes.buffer);
  bytes.set([0x00,0x00,0x01,0x00,0x01,0x00]);
  bytes[6] = 2; bytes[7] = 2;
  view.setUint16(10, 1, true); view.setUint16(12, 32, true);
  view.setUint32(14, corrupt ? png.length + 1000 : png.length, true);
  view.setUint32(18, 22, true);
  bytes.set(png, 22);
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

  const pcx = await detectImage(makeFile('legacy.pcx', pcx1x1()));
  expect(pcx).toMatchObject({ extension: 'pcx', width: 1, height: 1 });

  const tga = await detectImage(makeFile('legacy.tga', tga1x1()));
  expect(tga).toMatchObject({ extension: 'tga', width: 1, height: 1 });

  const disguisedAudio = await detectImage(makeFile('pretend.jpg', Buffer.from('ID3\x04\x00\x00fake-audio', 'binary')));
  expect(disguisedAudio).toBeNull();
});

test('ICO admission checks its directory and embedded payload before entering the queue', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'Pure detection regression only needs one project');

  const valid = await detectImage(makeFile('valid.ico', icoWithPng(PNG_2X2)));
  expect(valid?.extension).toBe('ico');

  const malformed = await detectImage(makeFile('malformed.ico', icoWithPng(PNG_2X2, true)));
  expect(malformed).toBeNull();
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
