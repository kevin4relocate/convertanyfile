import type { BatchPolicy } from './types';

export const MIB = 1024 * 1024;

export const IMAGE_BATCH_POLICY: BatchPolicy = {
  maxFiles: 50,
  maxTotalBytes: 300 * MIB,
  maxFileBytes: 75 * MIB,
};

export const DATA_BATCH_POLICY: BatchPolicy = {
  maxFiles: 50,
  maxTotalBytes: 100 * MIB,
  maxFileBytes: 20 * MIB,
};

export interface AdmissionResult {
  accepted: File[];
  rejected: Array<{ file: File; reason: 'file-size' | 'file-count' | 'total-size' }>;
}

export function applyBatchPolicy(
  incoming: readonly File[],
  currentFiles: readonly File[],
  policy: BatchPolicy,
): AdmissionResult {
  const accepted: File[] = [];
  const rejected: AdmissionResult['rejected'] = [];
  let count = currentFiles.length;
  let totalBytes = currentFiles.reduce((sum, file) => sum + file.size, 0);

  for (const file of incoming) {
    if (file.size > policy.maxFileBytes) {
      rejected.push({ file, reason: 'file-size' });
      continue;
    }
    if (count >= policy.maxFiles) {
      rejected.push({ file, reason: 'file-count' });
      continue;
    }
    if (totalBytes + file.size > policy.maxTotalBytes) {
      rejected.push({ file, reason: 'total-size' });
      continue;
    }
    accepted.push(file);
    count += 1;
    totalBytes += file.size;
  }

  return { accepted, rejected };
}
