/**
 * Shared admission limits for browser-only image utilities.
 *
 * Call check() before attempting any expensive image decode. Call accept()
 * only AFTER decoding/dimension validation succeeds; a rejected or corrupt
 * image must not consume the remaining batch count or byte budget.
 */
export interface ImageFileAdmissionPolicy {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  acceptedExtensions: readonly string[];
}

export type FileAdmissionRejection = 'file-count' | 'total-size' | 'file-size' | 'format';

export interface ImageFileAdmission {
  check(file: Pick<File, 'name' | 'size'>): FileAdmissionRejection | undefined;
  accept(file: Pick<File, 'name' | 'size'>): void;
  readonly count: number;
  readonly totalBytes: number;
}

export function extensionOfFile(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

export function createImageFileAdmission<T extends { file: File }>(
  current: readonly T[],
  policy: ImageFileAdmissionPolicy,
): ImageFileAdmission {
  let count = current.length;
  let totalBytes = current.reduce((sum, item) => sum + item.file.size, 0);
  const extensions = new Set(policy.acceptedExtensions.map((ext) => ext.toLowerCase().replace(/^\./, '')));

  const check = (file: Pick<File, 'name' | 'size'>): FileAdmissionRejection | undefined => {
    // Preserve the site's historical admission priority: batch limits first,
    // then the per-file/format constraints.
    if (count >= policy.maxFiles) return 'file-count';
    if (totalBytes + file.size > policy.maxTotalBytes) return 'total-size';
    if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > policy.maxFileBytes) return 'file-size';
    if (!extensions.has(extensionOfFile(file.name))) return 'format';
    return undefined;
  };

  return {
    check,
    accept(file) {
      const rejection = check(file);
      if (rejection) throw new Error(`Cannot admit file ${file.name}: ${rejection}`);
      count += 1;
      totalBytes += file.size;
    },
    get count() { return count; },
    get totalBytes() { return totalBytes; },
  };
}

export function imageDimensionsWithinLimits(
  width: number,
  height: number,
  limits: Pick<{ maxDimension: number; maxPixels: number }, 'maxDimension' | 'maxPixels'>,
): boolean {
  return Number.isSafeInteger(width) && Number.isSafeInteger(height)
    && width > 0 && height > 0
    && width <= limits.maxDimension && height <= limits.maxDimension
    && width * height <= limits.maxPixels;
}
