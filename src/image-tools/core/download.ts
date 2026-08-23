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
  for (const file of files) zip.file(file.filename, file.blob);

  // JPG, PNG and WebP payloads are already compressed. Re-deflating them adds
  // significant browser CPU/memory cost for little or no size reduction.
  return zip.generateAsync({ type: 'blob', compression: 'STORE', streamFiles: true });
}
