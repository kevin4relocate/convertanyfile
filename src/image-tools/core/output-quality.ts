export const DEFAULT_WEBP_QUALITY = 82;
export const DEFAULT_JPEG_QUALITY = 90;

export function defaultQualityForImageOutput(output: string, fallback = DEFAULT_JPEG_QUALITY): number {
  const normalized = output.trim().toLowerCase();
  if (normalized === 'webp' || normalized === 'image/webp') return DEFAULT_WEBP_QUALITY;
  if (normalized === 'jpg' || normalized === 'jpeg' || normalized === 'image/jpeg') return DEFAULT_JPEG_QUALITY;
  return fallback;
}
