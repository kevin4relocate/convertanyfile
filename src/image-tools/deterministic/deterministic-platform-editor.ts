import { createZipBlob, downloadBlob } from '../core/download';
import { encodeCanvas, extensionForOutput, type ImageOutputFormat } from '../core/output-encoder';
import { renderToolCanvas, resizeDimensions, sourceExtension, sourceMime } from './operations';
import {
  defaultSettingsFor,
  type DeterministicSettings,
  type DeterministicToolId,
  type OutputChoice,
  type ResizeSettings,
} from './types';

type Status = 'ready' | 'processing' | 'done' | 'error';
type Item = {
  id: string;
  file: File;
  width: number;
  height: number;
  url: string;
  settings?: DeterministicSettings;
  settingsOrigin: 'shared' | 'custom';
  status: Status;
  result?: Blob;
  outputName?: string;
  error?: string;
};

type State = {
  mode: 'shared' | 'individual';
  sharedSettings: DeterministicSettings;
  items: Item[];
  activeId?: string;
  processing: boolean;
  cancel: boolean;
  previewGeneration: number;
  previewTimer?: number;
};

const VALID_TOOL_IDS = new Set<DeterministicToolId>([
  'resize-image',
  'compress-image',
  'rotate-flip-image',
  'crop-image',
  'blur-image',
]);

const q = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Image tool is missing ${selector}`);
  return element;
};
const maybe = <T extends Element>(root: ParentNode, selector: string): T | undefined => root.querySelector<T>(selector) ?? undefined;
const clone = <T>(value: T): T => structuredClone(value);
const extension = (name: string): string => name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
const baseName = (name: string): string => name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'image';
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

function outputMime(file: File, output: OutputChoice): ImageOutputFormat {
  if (output === 'source') return sourceMime(file);
  if (output === 'jpg') return 'image/jpeg';
  if (output === 'webp') return 'image/webp';
  return 'image/png';
}

function outputExtension(file: File, output: OutputChoice): string {
  return output === 'source' ? sourceExtension(file) : output === 'jpg' ? 'jpg' : output;
}

function settingsRecord(settings: DeterministicSettings): Record<string, unknown> {
  return settings as unknown as Record<string, unknown>;
}

export function mountDeterministicImageTool(root: HTMLElement): void {
  const rawToolId = root.dataset.toolId;
  if (!rawToolId || !VALID_TOOL_IDS.has(rawToolId as DeterministicToolId)) {
    throw new Error(`Unsupported deterministic image tool: ${rawToolId ?? 'unknown'}`);
  }
  const toolId = rawToolId as DeterministicToolId;
  root.dataset.platformRuntime = 'batch-v1';

  const notice = q<HTMLElement>(root, '[data-role="notice"]');
  const input = q<HTMLInputElement>(root, '[data-role="file-input"]');
  const dropzone = q<HTMLElement>(root, '[data-role="batch-dropzone"]');
  const list = q<HTMLElement>(root, '[data-role="batch-list"]');
  const count = q<HTMLElement>(root, '[data-role="batch-count"]');
  const modeSummary = q<HTMLElement>(root, '[data-role="mode-summary"]');
  const addMore = q<HTMLButtonElement>(root, '[data-role="add-more"]');
  const clearAll = q<HTMLButtonElement>(root, '[data-role="clear-all"]');
  const scopeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-edit-scope]')];
  const useShared = q<HTMLButtonElement>(root, '[data-role="use-shared-settings"]');
  const applyAll = q<HTMLButtonElement>(root, '[data-role="apply-current-to-all"]');
  const sourcePreview = q<HTMLImageElement>(root, '[data-role="source-preview"]');
  const sourceEmpty = q<HTMLElement>(root, '[data-role="source-empty"]');
  const resultPreview = q<HTMLImageElement>(root, '[data-role="result-preview"]');
  const resultEmpty = q<HTMLElement>(root, '[data-role="result-empty"]');
  const sourceMeta = q<HTMLElement>(root, '[data-role="source-meta"]');
  const previewMeta = q<HTMLElement>(root, '[data-role="preview-meta"]');
  const outputFormat = q<HTMLSelectElement>(root, '[data-role="output-format"]');
  const outputQuality = q<HTMLInputElement>(root, '[data-role="output-quality"]');
  const outputQualityValue = q<HTMLOutputElement>(root, '[data-role="quality-value"]');
  const progress = q<HTMLElement>(root, '[data-role="batch-progress"]');
  const progressLabel = q<HTMLElement>(root, '[data-role="progress-label"]');
  const progressCount = q<HTMLElement>(root, '[data-role="progress-count"]');
  const progressBar = q<HTMLProgressElement>(root, '[data-role="progress-bar"]');
  const cancel = q<HTMLButtonElement>(root, '[data-role="cancel-batch"]');
  const readyCount = q<HTMLElement>(root, '[data-role="ready-count"]');
  const processButton = q<HTMLButtonElement>(root, '[data-role="process-batch"]');
  const downloadButton = q<HTMLButtonElement>(root, '[data-role="download-batch"]');
  const settingInputs = [...root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-setting]')];
  const suffix = root.dataset.downloadSuffix || toolId;
  const maxFiles = Number(root.dataset.maxFiles || 50);
  const maxFileBytes = Number(root.dataset.maxFileBytes || 10 * 1024 * 1024);
  const maxPixels = Number(root.dataset.maxPixels || 20_000_000);
  const maxDimension = Number(root.dataset.maxDimension || 12_000);
  const maxTotalBytes = 200 * 1024 * 1024;

  const state: State = {
    mode: 'shared',
    sharedSettings: defaultSettingsFor(toolId),
    items: [],
    processing: false,
    cancel: false,
    previewGeneration: 0,
  };

  const active = (): Item | undefined => state.items.find((item) => item.id === state.activeId);
  const effectiveSettings = (item: Item): DeterministicSettings => state.mode === 'individual' && item.settings ? item.settings : state.sharedSettings;
  const showNotice = (message: string, tone: 'info' | 'error' = 'info'): void => {
    notice.hidden = false;
    notice.dataset.type = tone;
    notice.textContent = message;
  };
  const hideNotice = (): void => {
    notice.hidden = true;
    notice.textContent = '';
    delete notice.dataset.type;
  };

  function invalidateResults(): void {
    for (const item of state.items) {
      item.status = 'ready';
      item.result = undefined;
      item.outputName = undefined;
      item.error = undefined;
    }
    downloadButton.disabled = true;
    renderQueue();
    updateActions();
  }

  function writeSetting(control: HTMLInputElement | HTMLSelectElement, value: unknown): void {
    if (control instanceof HTMLInputElement && control.type === 'checkbox') {
      control.checked = Boolean(value);
      return;
    }
    control.value = String(value ?? '');
  }

  function readSettings(base: DeterministicSettings): DeterministicSettings {
    const next = clone(base);
    const record = settingsRecord(next);
    for (const control of settingInputs) {
      const key = control.dataset.setting;
      if (!key || !(key in record)) continue;
      if (control instanceof HTMLInputElement && control.type === 'checkbox') record[key] = control.checked;
      else if (typeof record[key] === 'number') record[key] = Number(control.value);
      else record[key] = control.value;
    }
    return next;
  }

  function syncConditionalSettings(settings: DeterministicSettings): void {
    const record = settingsRecord(settings);
    root.querySelectorAll<HTMLElement>('[data-setting-group]').forEach((group) => {
      const name = group.dataset.settingGroup;
      const visible = name === record.mode || name === record.scope;
      group.hidden = !visible;
    });
    root.querySelectorAll<HTMLOutputElement>('[data-output-for]').forEach((output) => {
      const key = output.dataset.outputFor;
      if (!key) return;
      const value = record[key];
      output.textContent = key === 'percent' ? `${value}%` : key === 'radius' ? `${value} px` : String(value ?? '');
    });
  }

  function renderSettings(): void {
    const item = active();
    const settings = item ? effectiveSettings(item) : state.sharedSettings;
    const record = settingsRecord(settings);
    for (const control of settingInputs) {
      const key = control.dataset.setting;
      if (key && key in record) writeSetting(control, record[key]);
    }
    syncConditionalSettings(settings);
    useShared.hidden = state.mode !== 'individual' || !item || item.settingsOrigin !== 'custom';
    applyAll.hidden = state.mode !== 'individual' || !item;
  }

  function setMode(mode: 'shared' | 'individual'): void {
    if (state.processing || state.mode === mode) return;
    state.mode = mode;
    root.dataset.platformScope = mode;
    scopeButtons.forEach((button) => {
      const selected = button.dataset.editScope === mode;
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-checked', String(selected));
      button.classList.toggle('is-active', selected);
    });
    modeSummary.textContent = mode === 'shared'
      ? `One setup applies to all ${state.items.length} images.`
      : 'Each image can override the shared settings.';
    renderSettings();
    renderQueue();
    schedulePreview();
  }

  function changeSettings(): void {
    const item = active();
    const current = item ? effectiveSettings(item) : state.sharedSettings;
    const next = readSettings(current);
    if (state.mode === 'individual' && item) {
      item.settings = next;
      item.settingsOrigin = 'custom';
    } else {
      state.sharedSettings = next;
    }
    syncConditionalSettings(next);
    invalidateResults();
    renderSettings();
    schedulePreview();
  }

  function maintainResizeAspect(changed: HTMLInputElement | HTMLSelectElement): void {
    if (toolId !== 'resize-image' || state.mode === 'individual' && !active()) return;
    if (changed.dataset.setting !== 'width' && changed.dataset.setting !== 'height') return;
    const lock = maybe<HTMLInputElement>(root, '[data-setting="lockAspect"]');
    if (!lock?.checked) return;
    const item = active();
    if (!item) return;
    const width = q<HTMLInputElement>(root, '[data-setting="width"]');
    const height = q<HTMLInputElement>(root, '[data-setting="height"]');
    const ratio = item.width / Math.max(1, item.height);
    if (changed.dataset.setting === 'width') height.value = String(Math.max(1, Math.round(Number(width.value) / ratio)));
    else width.value = String(Math.max(1, Math.round(Number(height.value) * ratio));
  }

  function statusText(item: Item): string {
    if (item.status === 'processing') return 'Processing…';
    if (item.status === 'done') return 'Done';
    if (item.status === 'error') return item.error || 'Failed';
    return `${item.width} × ${item.height}`;
  }

  function renderQueue(): void {
    list.replaceChildren();
    count.textContent = String(state.items.length);
    root.dataset.hasItems = String(state.items.length > 0);
    for (const item of state.items) {
      const card = document.createElement('div');
      card.className = `deterministic-file-card${item.id === state.activeId ? ' is-active' : ''}`;
      card.tabIndex = state.processing ? -1 : 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Edit ${item.file.name}`);
      const image = document.createElement('img');
      image.src = item.url;
      image.alt = '';
      const copy = document.createElement('div');
      copy.className = 'deterministic-file-card__copy';
      const name = document.createElement('strong');
      name.textContent = item.file.name;
      const meta = document.createElement('small');
      meta.textContent = statusText(item);
      const badges = document.createElement('div');
      badges.className = 'deterministic-file-card__badges';
      const origin = document.createElement('span');
      origin.className = `deterministic-badge${item.settingsOrigin === 'custom' ? ' deterministic-badge--custom' : ''}`;
      origin.textContent = item.settingsOrigin.toUpperCase();
      badges.append(origin);
      if (item.status === 'done' || item.status === 'error') {
        const status = document.createElement('span');
        status.className = 'deterministic-badge';
        status.textContent = item.status.toUpperCase();
        badges.append(status);
      }
      copy.append(name, meta, badges);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'deterministic-file-remove';
      remove.textContent = '×';
      remove.title = 'Remove image';
      remove.disabled = state.processing;
      remove.addEventListener('click', (event) => {
        event.stopPropagation();
        removeItem(item.id);
      });
      const select = (): void => {
        if (state.processing) return;
        state.activeId = item.id;
        renderSettings();
        renderQueue();
        schedulePreview();
      };
      card.addEventListener('click', select);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select();
        }
      });
      card.append(image, copy, remove);
      list.append(card);
    }
    updateActions();
  }

  function clearPreview(): void {
    sourcePreview.hidden = true;
    sourcePreview.removeAttribute('src');
    sourceEmpty.hidden = false;
    resultPreview.hidden = true;
    resultPreview.removeAttribute('src');
    resultEmpty.hidden = false;
    sourceMeta.textContent = '';
    previewMeta.textContent = '';
  }

  async function renderPreview(): Promise<void> {
    const item = active();
    if (!item) {
      clearPreview();
      return;
    }
    const generation = ++state.previewGeneration;
    sourcePreview.src = item.url;
    sourcePreview.hidden = false;
    sourceEmpty.hidden = true;
    sourceMeta.textContent = `${item.width.toLocaleString()} × ${item.height.toLocaleString()}`;
    try {
      const bitmap = await createImageBitmap(item.file);
      try {
        const canvas = renderToolCanvas(bitmap, toolId, effectiveSettings(item), 1200);
        if (generation !== state.previewGeneration) return;
        resultPreview.src = canvas.toDataURL('image/png');
        resultPreview.hidden = false;
        resultEmpty.hidden = true;
        previewMeta.textContent = `${canvas.width.toLocaleString()} × ${canvas.height.toLocaleString()} preview`;
      } finally {
        bitmap.close();
      }
    } catch (error) {
      if (generation !== state.previewGeneration) return;
      resultPreview.hidden = true;
      resultEmpty.hidden = false;
      resultEmpty.textContent = 'Preview unavailable';
      previewMeta.textContent = error instanceof Error ? error.message : 'Unable to render preview';
    }
  }

  function schedulePreview(): void {
    if (state.previewTimer) window.clearTimeout(state.previewTimer);
    state.previewTimer = window.setTimeout(() => void renderPreview(), 80);
  }

  function updateActions(): void {
    const done = state.items.filter((item) => item.status === 'done' && item.result).length;
    readyCount.textContent = `${state.items.length} image${state.items.length === 1 ? '' : 's'} ready`;
    processButton.disabled = state.processing || state.items.length === 0;
    downloadButton.disabled = state.processing || done === 0;
    addMore.disabled = state.processing;
    clearAll.disabled = state.processing;
    scopeButtons.forEach((button) => { button.disabled = state.processing; });
  }

  async function addFiles(files: readonly File[]): Promise<void> {
    if (!files.length || state.processing) return;
    hideNotice();
    let total = state.items.reduce((sum, item) => sum + item.file.size, 0);
    let rejected = 0;
    let limited = 0;
    for (const file of files) {
      if (state.items.length >= maxFiles || total + file.size > maxTotalBytes) {
        limited += 1;
        continue;
      }
      const ext = extension(file.name);
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext) || file.size > maxFileBytes) {
        rejected += 1;
        continue;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const width = bitmap.width;
        const height = bitmap.height;
        bitmap.close();
        if (width > maxDimension || height > maxDimension || width * height > maxPixels) {
          rejected += 1;
          continue;
        }
        state.items.push({
          id: crypto.randomUUID(),
          file,
          width,
          height,
          url: URL.createObjectURL(file),
          settingsOrigin: 'shared',
          status: 'ready',
        });
        total += file.size;
      } catch {
        rejected += 1;
      }
    }
    input.value = '';
    if (!state.activeId && state.items[0]) state.activeId = state.items[0].id;
    renderSettings();
    renderQueue();
    schedulePreview();
    if (rejected || limited) {
      const messages = [];
      if (rejected) messages.push(`${rejected} image${rejected === 1 ? '' : 's'} skipped by format, file-size, or decoded-size limits`);
      if (limited) messages.push(`${limited} image${limited === 1 ? '' : 's'} skipped by batch limits`);
      showNotice(messages.join(' · '), 'info');
    }
  }

  function removeItem(id: string): void {
    if (state.processing) return;
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const [removed] = state.items.splice(index, 1);
    if (removed) URL.revokeObjectURL(removed.url);
    if (state.activeId === id) state.activeId = state.items[Math.min(index, state.items.length - 1)]?.id;
    renderSettings();
    renderQueue();
    schedulePreview();
  }

  function resetAll(): void {
    if (state.processing) return;
    state.previewGeneration += 1;
    if (state.previewTimer) window.clearTimeout(state.previewTimer);
    for (const item of state.items) URL.revokeObjectURL(item.url);
    state.items = [];
    state.activeId = undefined;
    state.mode = 'shared';
    state.sharedSettings = defaultSettingsFor(toolId);
    input.value = '';
    progress.hidden = true;
    clearPreview();
    hideNotice();
    renderSettings();
    renderQueue();
  }

  async function processBatch(): Promise<void> {
    if (state.processing || !state.items.length) return;
    state.processing = true;
    state.cancel = false;
    hideNotice();
    progress.hidden = false;
    progressLabel.textContent = 'Processing images…';
    progressBar.max = 100;
    cancel.disabled = false;
    updateActions();
    const quality = clamp(Number(outputQuality.value) / 100, 0.01, 1);
    const output = outputFormat.value as OutputChoice;
    let completed = 0;
    let failed = 0;
    for (const item of state.items) {
      if (state.cancel) break;
      item.status = 'processing';
      item.error = undefined;
      renderQueue();
      try {
        const bitmap = await createImageBitmap(item.file);
        try {
          const canvas = renderToolCanvas(bitmap, toolId, effectiveSettings(item));
          const mime = outputMime(item.file, output);
          item.result = await encodeCanvas(canvas, { type: mime, quality: mime === 'image/png' ? undefined : quality });
          const ext = output === 'source' ? outputExtension(item.file, output) : extensionForOutput(mime);
          item.outputName = `${baseName(item.file.name)}-${suffix}.${ext}`;
          item.status = 'done';
          completed += 1;
        } finally {
          bitmap.close();
        }
      } catch (error) {
        item.status = 'error';
        item.error = error instanceof Error ? error.message : 'Unable to process this image.';
        failed += 1;
      }
      const finished = completed + failed;
      progressCount.textContent = `${finished} / ${state.items.length}`;
      progressBar.value = Math.round(finished / state.items.length * 100);
      renderQueue();
    }
    state.processing = false;
    cancel.disabled = true;
    progressLabel.textContent = state.cancel ? `Stopped · ${completed} completed` : failed ? `${completed} completed · ${failed} failed` : `${completed} completed`;
    updateActions();
    const current = active();
    if (current?.status === 'done') schedulePreview();
    if (failed) showNotice(`${failed} image${failed === 1 ? '' : 's'} could not be processed. Successful results are still available.`, 'info');
  }

  async function downloadResults(): Promise<void> {
    const files = state.items
      .filter((item): item is Item & { result: Blob; outputName: string } => Boolean(item.result && item.outputName && item.status === 'done'))
      .map((item) => ({ filename: item.outputName, blob: item.result }));
    if (!files.length) return;
    if (files.length === 1) {
      downloadBlob(files[0].blob, files[0].filename);
      return;
    }
    const zip = await createZipBlob(files);
    downloadBlob(zip, `${toolId}-results.zip`);
  }

  settingInputs.forEach((control) => {
    const eventName = control instanceof HTMLInputElement && control.type === 'range' ? 'input' : 'change';
    control.addEventListener(eventName, () => {
      maintainResizeAspect(control);
      changeSettings();
    });
    if (control instanceof HTMLInputElement && control.type === 'number') {
      control.addEventListener('input', () => {
        maintainResizeAspect(control);
        changeSettings();
      });
    }
  });

  outputQuality.addEventListener('input', () => {
    outputQualityValue.textContent = outputQuality.value;
    invalidateResults();
  });
  outputFormat.addEventListener('change', invalidateResults);
  scopeButtons.forEach((button) => button.addEventListener('click', () => {
    const requested = button.dataset.editScope;
    if (requested === 'shared' || requested === 'individual') setMode(requested);
  }));
  useShared.addEventListener('click', () => {
    const item = active();
    if (!item || state.processing) return;
    item.settings = undefined;
    item.settingsOrigin = 'shared';
    invalidateResults();
    renderSettings();
    schedulePreview();
  });
  applyAll.addEventListener('click', () => {
    const item = active();
    if (!item || state.processing) return;
    state.sharedSettings = clone(effectiveSettings(item));
    for (const candidate of state.items) {
      candidate.settings = undefined;
      candidate.settingsOrigin = 'shared';
    }
    invalidateResults();
    renderSettings();
    renderQueue();
    schedulePreview();
  });
  dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'));
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    void addFiles([...event.dataTransfer!.files]);
  });
  input.addEventListener('change', () => void addFiles([...input.files ?? []]));
  addMore.addEventListener('click', () => input.click());
  clearAll.addEventListener('click', resetAll);
  processButton.addEventListener('click', () => void processBatch());
  downloadButton.addEventListener('click', () => void downloadResults());
  cancel.addEventListener('click', () => {
    if (!state.processing) return;
    state.cancel = true;
    cancel.disabled = true;
    progressLabel.textContent = 'Stopping after current image…';
  });

  if (toolId === 'resize-image') {
    const resize = state.sharedSettings as ResizeSettings;
    const mode = maybe<HTMLSelectElement>(root, '[data-setting="mode"]');
    if (mode) mode.value = resize.mode;
  }
  outputQualityValue.textContent = outputQuality.value;
  renderSettings();
  renderQueue();
  clearPreview();
}
