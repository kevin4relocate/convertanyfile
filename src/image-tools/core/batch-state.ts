import type { ImageEditScope } from '../../platform/image-tools/types';
import type { BatchEditorState, BatchImageItem } from './batch-types';

export function getEffectiveSettings<TSettings>(
  state: BatchEditorState<TSettings>,
  item: BatchImageItem<TSettings>
): TSettings {
  if (state.mode === 'individual' && item.settings !== undefined) return item.settings;
  return state.sharedSettings;
}

export function setEditScope<TSettings>(
  state: BatchEditorState<TSettings>,
  mode: ImageEditScope
): BatchEditorState<TSettings> {
  return { ...state, mode };
}

export function setSharedSettings<TSettings>(
  state: BatchEditorState<TSettings>,
  settings: TSettings
): BatchEditorState<TSettings> {
  return { ...state, sharedSettings: settings };
}

export function setItemSettings<TSettings>(
  state: BatchEditorState<TSettings>,
  itemId: string,
  settings: TSettings
): BatchEditorState<TSettings> {
  return {
    ...state,
    items: state.items.map((item) =>
      item.id === itemId
        ? { ...item, settings, settingsOrigin: 'custom' as const }
        : item
    ),
  };
}

export function resetItemSettings<TSettings>(
  state: BatchEditorState<TSettings>,
  itemId: string
): BatchEditorState<TSettings> {
  return {
    ...state,
    items: state.items.map((item) => {
      if (item.id !== itemId) return item;
      const { settings: _settings, ...rest } = item;
      return { ...rest, settingsOrigin: 'shared' as const };
    }),
  };
}

export function applyItemSettingsToAll<TSettings>(
  state: BatchEditorState<TSettings>,
  itemId: string
): BatchEditorState<TSettings> {
  const item = state.items.find((candidate) => candidate.id === itemId);
  if (!item) return state;
  const settings = item.settings ?? state.sharedSettings;
  return {
    ...state,
    sharedSettings: settings,
    items: state.items.map(({ settings: _settings, ...candidate }) => ({
      ...candidate,
      settingsOrigin: 'shared' as const,
    })),
  };
}
