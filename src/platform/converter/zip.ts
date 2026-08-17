import JSZip from 'jszip';
import type { ConversionJob } from './types';

export async function buildZip(jobs: readonly ConversionJob[]): Promise<Blob> {
  const zip = new JSZip();
  const used = new Set<string>();
  for (const job of jobs) {
    if (!job.result) continue;
    let filename = job.result.filename;
    let counter = 2;
    while (used.has(filename.toLowerCase())) {
      const dot = filename.lastIndexOf('.');
      const base = dot >= 0 ? filename.slice(0, dot) : filename;
      const ext = dot >= 0 ? filename.slice(dot) : '';
      filename = `${base}-${counter}${ext}`;
      counter += 1;
    }
    used.add(filename.toLowerCase());
    zip.file(filename, job.result.blob);
  }
  return zip.generateAsync({ type: 'blob', compression: 'STORE' });
}
