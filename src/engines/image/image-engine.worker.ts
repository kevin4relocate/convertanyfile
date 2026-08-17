/// <reference lib="webworker" />

import { ImageMagick, Magick, MagickFormat, initializeImageMagick, type MagickFormat as MagickFormatType } from '@imagemagick/magick-wasm';
import magickWasmUrl from '@imagemagick/magick-wasm/magick.wasm?url';
import type { ImageWorkerRequest, ImageWorkerResponse } from './protocol';

const scope = self as DedicatedWorkerGlobalScope;
let initialization: Promise<void> | undefined;
const OUTPUT_MAP: Record<string, MagickFormatType> = {
  jpg: MagickFormat.Jpeg, png: MagickFormat.Png, webp: MagickFormat.WebP, avif: MagickFormat.Avif,
  tiff: MagickFormat.Tiff, gif: MagickFormat.Gif, bmp: MagickFormat.Bmp, ico: MagickFormat.Ico,
};

function ensureInitialized(): Promise<void> {
  if (!initialization) initialization = (async () => {
    const response = await fetch(new URL(magickWasmUrl, scope.location.href), { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Unable to load image engine (${response.status})`);
    await initializeImageMagick(new Uint8Array(await response.arrayBuffer()));
  })();
  return initialization;
}

function friendlyError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/memory|out of bounds|allocation/i.test(message)) return 'Not enough browser memory for this image';
  if (/delegate|unsupported|no images defined/i.test(message)) return 'Unsupported image codec';
  if (/corrupt|improper|invalid|unexpected end|insufficient/i.test(message)) return 'The image appears to be corrupted';
  return 'Unable to convert this image';
}

async function convert(input: ArrayBuffer, output: string, quality: number): Promise<ArrayBuffer> {
  await ensureInitialized();
  const format = OUTPUT_MAP[output];
  if (!format) throw new Error('Unsupported output format');
  return ImageMagick.read(new Uint8Array(input), (image) => {
    image.autoOrient();
    if (output === 'jpg' || output === 'webp' || output === 'avif') image.quality = quality;
    return image.write(format, (data) => {
      const copy = new Uint8Array(data.length); copy.set(data); return copy.buffer;
    });
  });
}

scope.addEventListener('message', async (event: MessageEvent<ImageWorkerRequest>) => {
  const request = event.data;
  try {
    await ensureInitialized();
    if (request.type === 'capabilities') {
      const formats = Magick.supportedFormats;
      const response: ImageWorkerResponse = {
        type: 'capabilities-result', requestId: request.requestId, ok: true,
        readable: formats.filter((f) => f.supportsReading).map((f) => f.format),
        writable: formats.filter((f) => f.supportsWriting).map((f) => f.format),
        version: Magick.imageMagickVersion,
      };
      scope.postMessage(response); return;
    }
    const output = await convert(request.input, request.output, request.quality);
    const response: ImageWorkerResponse = { type: 'convert-result', requestId: request.requestId, ok: true, output };
    scope.postMessage(response, [output]);
  } catch (error) {
    const response: ImageWorkerResponse = {
      type: request.type === 'convert' ? 'convert-result' : 'capabilities-result',
      requestId: request.requestId, ok: false, error: friendlyError(error),
    } as ImageWorkerResponse;
    scope.postMessage(response);
  }
});
