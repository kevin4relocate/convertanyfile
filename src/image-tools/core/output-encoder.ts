export type ImageOutputFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export interface EncodeCanvasOptions {
  type: ImageOutputFormat;
  quality?: number;
}

export async function encodeCanvas(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  options: EncodeCanvasOptions
): Promise<Blob> {
  const quality = options.quality === undefined
    ? undefined
    : Math.min(1, Math.max(0, options.quality));

  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: options.type, quality });
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error(`Unable to encode ${options.type} output.`));
    }, options.type, quality);
  });
}

export function extensionForOutput(type: ImageOutputFormat): string {
  if (type === 'image/jpeg') return 'jpg';
  if (type === 'image/webp') return 'webp';
  return 'png';
}
