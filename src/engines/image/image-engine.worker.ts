/// <reference lib="webworker" />

import { Gravity, ImageMagick, Magick, MagickColors, MagickFormat, initializeImageMagick, type MagickFormat as MagickFormatType } from '@imagemagick/magick-wasm';
import magickWasmUrl from '@imagemagick/magick-wasm/magick.wasm?url';
import type { ConversionErrorCode } from '../../platform/converter/errors';
import { extractBestPngIcoFrame } from './legacy-formats';
import type { ImageMetadataSnapshot, ImageTransformOptions, ImageWorkerRequest, ImageWorkerResponse } from './protocol';

const scope = self as DedicatedWorkerGlobalScope;
let initialization: Promise<void> | undefined;
type MagickImage = Parameters<Parameters<typeof ImageMagick.read>[1]>[0];

/**
 * This is deliberately a product whitelist, not a mirror of every ImageMagick
 * writer. A format belongs here only when it is also present in IMAGE_OUTPUTS
 * and covered by the browser round-trip matrix.
 */
const OUTPUT_MAP: Record<string, MagickFormatType> = {
  jpg: MagickFormat.Jpeg,
  png: MagickFormat.Png,
  webp: MagickFormat.WebP,
  avif: MagickFormat.Avif,
  jxl: MagickFormat.Jxl,
  jp2: MagickFormat.Jp2,
  tiff: MagickFormat.Tiff,
  gif: MagickFormat.Gif,
  bmp: MagickFormat.Bmp,
  ico: MagickFormat.Ico,
  pcx: MagickFormat.Pcx,
  tga: MagickFormat.Tga,
  qoi: MagickFormat.Qoi,
  pnm: MagickFormat.Pnm,
  hdr: MagickFormat.Hdr,
  exr: MagickFormat.Exr,
};

const INPUT_HINT_MAP: Record<string, MagickFormatType> = {
  ico: MagickFormat.Ico,
  pcx: MagickFormat.Pcx,
  tga: MagickFormat.Tga,
};

const QUALITY_OUTPUTS = new Set(['jpg', 'webp', 'avif', 'jxl', 'jp2']);
const OPAQUE_OUTPUTS = new Set(['jpg', 'bmp', 'pcx', 'pnm', 'hdr']);
const COLOR_PROFILES = new Set(['icc', 'icm']);

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
  if (/delegate|unsupported|no images defined|no decode delegate|no encode delegate/i.test(message)) return { message: 'Unsupported image codec', code: 'unsupported-input', retryable: false };
  if (/corrupt|improper|invalid|unexpected end|insufficient|unexpected end-of-file/i.test(message)) return { message: 'The image appears to be corrupted or invalid', code: 'corrupt-input', retryable: false };
  return { message: 'Unable to process this image', code: 'conversion-failed', retryable: false };
}

function safeInteger(value: number, min: number, max: number, label: string): number {
  if (!Number.isFinite(value)) throw new Error(`${label} is invalid`);
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeOptions(options: ImageTransformOptions | undefined): ImageTransformOptions {
  if (!options) return {};
  const normalized: ImageTransformOptions = {
    stripMetadata: options.stripMetadata === true,
    preserveColorProfile: options.preserveColorProfile !== false,
  };
  if (options.resize) {
    const width = safeInteger(options.resize.width, 1, 12_000, 'Resize width');
    const height = safeInteger(options.resize.height, 1, 12_000, 'Resize height');
    if (width * height > 20_000_000) throw new Error('Requested image dimensions exceed the browser safety limit');
    normalized.resize = { width, height };
  }
  if (options.crop) {
    normalized.crop = {
      width: safeInteger(options.crop.width, 1, 12_000, 'Crop width'),
      height: safeInteger(options.crop.height, 1, 12_000, 'Crop height'),
    };
  }
  if (options.rotate) {
    const degrees = Number(options.rotate.degrees);
    if (![0, 90, 180, 270, -90, -180, -270].includes(degrees)) throw new Error('Rotation must be 0, 90, 180, or 270 degrees');
    normalized.rotate = {
      degrees,
      flipHorizontal: options.rotate.flipHorizontal === true,
      flipVertical: options.rotate.flipVertical === true,
    };
  }
  return normalized;
}

function stripMetadata(image: MagickImage, preserveColorProfile: boolean): void {
  const attributes = [...image.attributeNames];
  for (const name of attributes) image.removeAttribute(name);
  const profiles = [...image.profileNames];
  for (const name of profiles) {
    if (preserveColorProfile && COLOR_PROFILES.has(name.toLowerCase())) continue;
    image.removeProfile(name);
  }
}

function metadataSnapshot(image: MagickImage): ImageMetadataSnapshot {
  const attributes: Array<{ name: string; value: string }> = [];
  for (const name of image.attributeNames.slice(0, 100)) {
    try {
      const value = image.getAttribute(name);
      if (value == null) continue;
      attributes.push({ name, value: value.length > 500 ? `${value.slice(0, 497)}…` : value });
    } catch { /* Ignore one unreadable metadata entry instead of failing the file. */ }
  }
  return {
    width: image.width,
    height: image.height,
    profiles: [...image.profileNames].slice(0, 50),
    attributes,
  };
}

function readWithHint<TReturn>(bytes: Uint8Array, inputFormat: string | undefined, callback: (image: MagickImage) => TReturn): TReturn {
  if (inputFormat === 'ico') {
    const pngFrame = extractBestPngIcoFrame(bytes);
    if (pngFrame) return ImageMagick.read(pngFrame, MagickFormat.Png, callback);
  }
  const hint = inputFormat ? INPUT_HINT_MAP[inputFormat] : undefined;
  return hint ? ImageMagick.read(bytes, hint, callback) : ImageMagick.read(bytes, callback);
}

async function inspect(input: ArrayBuffer, inputFormat: string | undefined): Promise<ImageMetadataSnapshot> {
  await ensureInitialized();
  return readWithHint(new Uint8Array(input), inputFormat, metadataSnapshot);
}

async function convert(input: ArrayBuffer, inputFormat: string | undefined, output: string, quality: number, rawOptions?: ImageTransformOptions): Promise<ArrayBuffer> {
  await ensureInitialized();
  const format = OUTPUT_MAP[output];
  if (!format) throw new Error('Unsupported output format');
  const bytes = new Uint8Array(input);
  const options = normalizeOptions(rawOptions);
  const process = (image: MagickImage): ArrayBuffer => {
    image.autoOrient();

    if (options.rotate) {
      if (options.rotate.degrees) image.rotate(options.rotate.degrees);
      if (options.rotate.flipHorizontal) image.flop();
      if (options.rotate.flipVertical) image.flip();
    }

    if (options.crop) {
      if (options.crop.width > image.width || options.crop.height > image.height) throw new Error('Crop size cannot be larger than the source image');
      image.crop(options.crop.width, options.crop.height, Gravity.Center);
      image.resetPage();
    }

    if (options.resize) image.resize(options.resize.width, options.resize.height);
    if (options.stripMetadata) stripMetadata(image, options.preserveColorProfile !== false);
    if (OPAQUE_OUTPUTS.has(output) && !image.isOpaque) image.colorAlpha(MagickColors.White);
    if (QUALITY_OUTPUTS.has(output)) image.quality = Math.min(100, Math.max(1, quality));

    return image.write(format, (data) => {
      const copy = new Uint8Array(data.length);
      copy.set(data);
      return copy.buffer;
    });
  };

  return readWithHint(bytes, inputFormat, process);
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
      scope.postMessage(response);
      return;
    }
    if (request.type === 'inspect') {
      const metadata = await inspect(request.input, request.inputFormat);
      const response: ImageWorkerResponse = { type: 'inspect-result', requestId: request.requestId, ok: true, metadata };
      scope.postMessage(response);
      return;
    }
    const output = await convert(request.input, request.inputFormat, request.output, request.quality, request.options);
    const response: ImageWorkerResponse = { type: 'convert-result', requestId: request.requestId, ok: true, output };
    scope.postMessage(response, [output]);
  } catch (error) {
    const failure = friendlyError(error);
    const response: ImageWorkerResponse = {
      type: request.type === 'convert' ? 'convert-result' : request.type === 'inspect' ? 'inspect-result' : 'capabilities-result',
      requestId: request.requestId,
      ok: false,
      error: failure.message,
      code: failure.code,
      retryable: failure.retryable,
    } as ImageWorkerResponse;
    scope.postMessage(response);
  }
});
