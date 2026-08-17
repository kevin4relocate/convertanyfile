/// <reference lib="webworker" />

import { ImageMagick, Magick, MagickColors, MagickFormat, initializeImageMagick, type MagickFormat as MagickFormatType } from '@imagemagick/magick-wasm';
import magickWasmUrl from '@imagemagick/magick-wasm/magick.wasm?url';
import type { ConversionErrorCode } from '../../platform/converter/errors';
import type { ImageWorkerRequest, ImageWorkerResponse } from './protocol';

const scope = self as DedicatedWorkerGlobalScope;
let initialization: Promise<void> | undefined;
const OUTPUT_MAP: Record<string, MagickFormatType> = {
  jpg: MagickFormat.Jpeg, png: MagickFormat.Png, webp: MagickFormat.WebP, avif: MagickFormat.Avif,
  tiff: MagickFormat.Tiff, gif: MagickFormat.Gif, bmp: MagickFormat.Bmp, ico: MagickFormat.Ico,
};
const INPUT_HINT_MAP: Record<string, MagickFormatType> = {
  ico: MagickFormat.Ico,
  pcx: MagickFormat.Pcx,
  tga: MagickFormat.Tga,
};

function ensureInitialized(): Promise<void> {
  if (!initialization) initialization = (async () => {
    const response = await fetch(new URL(magickWasmUrl, scope.location.href), { cache: 'force-cache' });
    if (!response.ok) throw new Error(`Unable to load image engine (${response.status})`);
    await initializeImageMagick(new Uint8Array(await response.arrayBuffer()));
  })();
  return initialization;
}

function friendlyError(error: unknown): { message: string; code: ConversionErrorCode; retryable: boolean } {
  const message = error instanceof Error ? error.message : String(error);
  if (/memory|out of bounds|allocation/i.test(message)) return { message: 'Not enough browser memory for this image', code: 'memory-limit', retryable: false };
  if (/delegate|unsupported|no images defined|no decode delegate/i.test(message)) return { message: 'Unsupported image codec', code: 'unsupported-input', retryable: false };
  if (/corrupt|improper|invalid|unexpected end|insufficient|unexpected end-of-file/i.test(message)) return { message: 'The image appears to be corrupted or invalid', code: 'corrupt-input', retryable: false };
  return { message: 'Unable to convert this image', code: 'conversion-failed', retryable: false };
}

async function convert(input: ArrayBuffer, inputFormat: string | undefined, output: string, quality: number): Promise<ArrayBuffer> {
  await ensureInitialized();
  const format = OUTPUT_MAP[output];
  if (!format) throw new Error('Unsupported output format');
  const bytes = new Uint8Array(input);
  const process = (image: Parameters<Parameters<typeof ImageMagick.read>[1]>[0]) => {
    image.autoOrient();
    if (output === 'jpg' && !image.isOpaque) image.colorAlpha(MagickColors.White);
    if (output === 'jpg' || output === 'webp' || output === 'avif') image.quality = quality;
    return image.write(format, (data) => {
      const copy = new Uint8Array(data.length); copy.set(data); return copy.buffer;
    });
  };
  const hint = inputFormat ? INPUT_HINT_MAP[inputFormat] : undefined;
  return hint ? ImageMagick.read(bytes, hint, process) : ImageMagick.read(bytes, process);
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
    const output = await convert(request.input, request.inputFormat, request.output, request.quality);
    const response: ImageWorkerResponse = { type: 'convert-result', requestId: request.requestId, ok: true, output };
    scope.postMessage(response, [output]);
  } catch (error) {
    const failure = friendlyError(error);
    const response: ImageWorkerResponse = {
      type: request.type === 'convert' ? 'convert-result' : 'capabilities-result',
      requestId: request.requestId, ok: false, error: failure.message, code: failure.code, retryable: failure.retryable,
    } as ImageWorkerResponse;
    scope.postMessage(response);
  }
});
