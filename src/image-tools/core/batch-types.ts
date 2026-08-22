import type { ImageEditScope } from '../../platform/image-tools/types';

export type BatchItemStatus = 'ready' | 'processing' | 'done' | 'error';
export type BatchSettingsOrigin = 'shared' | 'custom';

export interface BatchImageItem<TSettings> {
  id: string;
  file: File;
  width: number;
  height: number;
  previewUrl: string;
  settings?: TSettings;
  settingsOrigin: BatchSettingsOrigin;
  status: BatchItemStatus;
  result?: Blob;
  error?: string;
}

export interface BatchEditorState<TSettings> {
  mode: ImageEditScope;
  sharedSettings: TSettings;
  items: BatchImageItem<TSettings>[];
  selectedImageId?: string;
}

export interface ImageToolResult {
  blob: Blob;
  width?: number;
  height?: number;
  filename?: string;
}

export interface ImageToolAdapter<TSettings> {
  defaultSettings: TSettings;
  normalizeSettings?: (settings: TSettings, item: BatchImageItem<TSettings>) => TSettings;
  validateSettings?: (settings: TSettings, item: BatchImageItem<TSettings>) => string | null;
  process: (item: BatchImageItem<TSettings>, settings: TSettings, signal?: AbortSignal) => Promise<ImageToolResult>;
}
