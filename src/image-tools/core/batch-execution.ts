/**
 * Sequential, cancellation-aware batch runner shared by local image editors.
 * It deliberately does not own the UI or editor state: every editor remains
 * responsible for its statuses, rendering, reset, and native file resources.
 */
export interface BatchProgress {
  completed: number;
  failed: number;
  finished: number;
  total: number;
}

export interface BatchRunSummary extends BatchProgress {
  cancelled: boolean;
}

export interface SequentialBatchOptions<T> {
  process: (item: T, index: number) => void | Promise<void>;
  cancelled?: () => boolean;
  failed?: (item: T, error: unknown, index: number) => void;
  progress?: (progress: BatchProgress) => void;
}

export async function runSequentialBatch<T>(
  items: readonly T[],
  options: SequentialBatchOptions<T>,
): Promise<BatchRunSummary> {
  let completed = 0;
  let failed = 0;
  const total = items.length;

  for (let index = 0; index < total; index += 1) {
    if (options.cancelled?.()) break;
    const item = items[index]!;
    try {
      await options.process(item, index);
      completed += 1;
    } catch (error) {
      failed += 1;
      options.failed?.(item, error, index);
    }
    options.progress?.({ completed, failed, finished: completed + failed, total });
  }

  return {
    completed,
    failed,
    finished: completed + failed,
    total,
    cancelled: completed + failed < total && Boolean(options.cancelled?.()),
  };
}
