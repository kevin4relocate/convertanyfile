export interface LoadedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

export async function loadImageFile(file: File): Promise<LoadedImage> {
  const bitmap = await createImageBitmap(file);
  return { bitmap, width: bitmap.width, height: bitmap.height };
}

export function releaseLoadedImage(image: LoadedImage | ImageBitmap | null | undefined): void {
  if (!image) return;
  if ('bitmap' in image) image.bitmap.close();
  else image.close();
}

export function createPreviewUrl(file: File | Blob): string {
  return URL.createObjectURL(file);
}

export function revokePreviewUrl(url: string | null | undefined): void {
  if (url) URL.revokeObjectURL(url);
}
