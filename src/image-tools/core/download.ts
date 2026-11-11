function splitFilename(filename: string): { stem: string; extension: string } {
  const index = filename.lastIndexOf('.');
  if (index <= 0 || index === filename.length - 1) return { stem: filename, extension: '' };
  return { stem: filename.slice(0, index), extension: filename.slice(index) };
}

function uniqueFilename(filename: string, used: Map<string, number>): string {
  const normalized = filename.toLocaleLowerCase('en-US');
  const seen = used.get(normalized) ?? 0;
  if (!seen) {
    used.set(normalized, 1);
    return filename;
  }

  const { stem, extension } = splitFilename(filename);
  let suffix = seen + 1;
  let candidate = `${stem}-${suffix}${extension}`;
  while (used.has(candidate.toLocaleLowerCase('en-US'))) {
    suffix += 1;
    candidate = `${stem}-${suffix}${extension}`;
  }
  used.set(normalized, suffix);
  used.set(candidate.toLocaleLowerCase('en-US'), 1);
  return candidate;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  // Safari can defer reading the object URL until after the click handler returns.
  // Keep it alive briefly instead of revoking it in the same task.
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

export async function createZipBlob(files: readonly { filename: string; blob: Blob }[]): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  const used = new Map<string, number>();
  for (const file of files) zip.file(uniqueFilename(file.filename, used), file.blob);

  // JPG, PNG and WebP payloads are already compressed. Re-deflating them adds
  // significant browser CPU/memory cost for little or no size reduction.
  return zip.generateAsync({ type: 'blob', compression: 'STORE', streamFiles: true });
}

/**
 * Shared single-file vs ZIP output behavior for editor runtimes.
 * Preserves original source naming and the existing STORE-mode ZIP policy.
 */
export async function downloadResultBatch(
  files: readonly { filename: string; blob: Blob }[],
  zipFilename: string,
): Promise<void> {
  if (!files.length) return;
  if (files.length === 1) {
    const file = files[0]!;
    downloadBlob(file.blob, file.filename);
    return;
  }
  downloadBlob(await createZipBlob(files), zipFilename);
}
