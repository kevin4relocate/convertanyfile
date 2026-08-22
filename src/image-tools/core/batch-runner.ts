import { getEffectiveSettings } from './batch-state';
import type { BatchEditorState, BatchImageItem, ImageToolAdapter } from './batch-types';

export interface BatchRunCallbacks<TSettings> {
  onItemUpdate?: (item: BatchImageItem<TSettings>, index: number, total: number) => void;
  onProgress?: (completed: number, total: number) => void;
}

export async function runImageBatch<TSettings>(
  state: BatchEditorState<TSettings>,
  adapter: ImageToolAdapter<TSettings>,
  callbacks: BatchRunCallbacks<TSettings> = {},
  signal?: AbortSignal
): Promise<BatchEditorState<TSettings>> {
  const items = [...state.items];
  callbacks.onProgress?.(0, items.length);

  for (let index = 0; index < items.length; index += 1) {
    if (signal?.aborted) throw new DOMException('Batch processing cancelled.', 'AbortError');

    const original = items[index];
    const processing = { ...original, status: 'processing' as const, error: undefined };
    items[index] = processing;
    callbacks.onItemUpdate?.(processing, index, items.length);

    try {
      let settings = getEffectiveSettings({ ...state, items }, processing);
      settings = adapter.normalizeSettings?.(settings, processing) ?? settings;
      const validationError = adapter.validateSettings?.(settings, processing);
      if (validationError) throw new Error(validationError);

      const result = await adapter.process(processing, settings, signal);
      const done = { ...processing, status: 'done' as const, result: result.blob, error: undefined };
      items[index] = done;
      callbacks.onItemUpdate?.(done, index, items.length);
    } catch (error) {
      if (signal?.aborted) throw error;
      const failed = {
        ...processing,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'Unable to process this image.',
      };
      items[index] = failed;
      callbacks.onItemUpdate?.(failed, index, items.length);
    }

    callbacks.onProgress?.(index + 1, items.length);
  }

  return { ...state, items };
}
