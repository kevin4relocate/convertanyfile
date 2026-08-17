import { File } from 'node:buffer';
import { expect, test } from '@playwright/test';
import { detectImage } from '../src/engines/image/detect';

const makeFile = (name: string, bytes: Uint8Array | Buffer): globalThis.File =>
  new File([bytes], name) as unknown as globalThis.File;

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
