import { createZipBlob, downloadBlob } from '../core/download';
import { BackgroundRemovalWorkerClient } from './worker-client';

type Settings = {
  threshold: number;
  feather: number;
  background: 'transparent' | 'white' | 'black' | 'custom';
  color: string;
};
type Status = 'ready' | 'processing' | 'done' | 'error';
type Item = {
  id: string;
  file: File;
  width: number;
  height: number;
  url: string;
  settings?: Settings;
  settingsOrigin: 'shared' | 'custom';
  status: Status;
  mask?: Float32Array;
  maskPromise?: Promise<Float32Array>;
  result?: Blob;
  outputName?: string;
  error?: string;
};
type State = {
  mode: 'shared' | 'individual';
  shared: Settings;
  items: Item[];
  activeId?: string;
  processing: boolean;
  cancel: boolean;
  previewGeneration: number;
  previewTimer?: number;
};

const INPUT_SIZE = 320;
const DEFAULT_SETTINGS: Settings = { threshold: 50, feather: 8, background: 'transparent', color: '#ffffff' };
const q = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Background remover is missing ${selector}`);
  return element;
};
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const ext = (name: string): string => name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
const baseName = (name: string): string => name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'image';
const cloneSettings = (settings: Settings): Settings => ({ ...settings });
const smoothstep = (edge0: number, edge1: number, value: number): number => {
  if (edge1 <= edge0) return value >= edge1 ? 1 : 0;
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};

function preprocess(bitmap: ImageBitmap): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas preprocessing is unavailable in this browser.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
  context.drawImage(bitmap, 0, 0, INPUT_SIZE, INPUT_SIZE);
  const rgba = context.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE).data;
  const plane = INPUT_SIZE * INPUT_SIZE;
  const tensor = new Float32Array(plane * 3);
  const means = [0.485, 0.456, 0.406];
  const stds = [0.229, 0.224, 0.225];
  for (let index = 0; index < plane; index += 1) {
    const source = index * 4;
    tensor[index] = ((rgba[source] ?? 0) / 255 - means[0]) / stds[0];
    tensor[plane + index] = ((rgba[source + 1] ?? 0) / 255 - means[1]) / stds[1];
    tensor[plane * 2 + index] = ((rgba[source + 2] ?? 0) / 255 - means[2]) / stds[2];
  }
  return tensor;
}

function buildMaskCanvas(mask: Float32Array, settings: Settings): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Mask rendering is unavailable in this browser.');
  const image = context.createImageData(INPUT_SIZE, INPUT_SIZE);
  const threshold = clamp(settings.threshold, 1, 99) / 100;
  const halfWidth = clamp(settings.feather, 0, 30) / 200;
  for (let index = 0; index < INPUT_SIZE * INPUT_SIZE; index += 1) {
    const value = clamp(mask[index] ?? 0, 0, 1);
    const alpha = halfWidth <= 0
      ? (value >= threshold ? 1 : 0)
      : smoothstep(threshold - halfWidth, threshold + halfWidth, value);
    const target = index * 4;
    image.data[target] = 255;
    image.data[target + 1] = 255;
    image.data[target + 2] = 255;
    image.data[target + 3] = Math.round(alpha * 255);
  }
  context.putImageData(image, 0, 0);
  return canvas;
}

function outputDimensions(width: number, height: number, maxDimension?: number): { width: number; height: number } {
  if (!maxDimension || Math.max(width, height) <= maxDimension) return { width, height };
  const scale = maxDimension / Math.max(width, height);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

function renderCutout(bitmap: ImageBitmap, mask: Float32Array, settings: Settings, maxDimension?: number): HTMLCanvasElement {
  const size = outputDimensions(bitmap.width, bitmap.height, maxDimension);
  const cutout = document.createElement('canvas');
  cutout.width = size.width;
  cutout.height = size.height;
  const cutoutContext = cutout.getContext('2d');
  if (!cutoutContext) throw new Error('Canvas output is unavailable in this browser.');
  cutoutContext.imageSmoothingEnabled = true;
  cutoutContext.imageSmoothingQuality = 'high';
  cutoutContext.drawImage(bitmap, 0, 0, size.width, size.height);
  cutoutContext.globalCompositeOperation = 'destination-in';
  cutoutContext.drawImage(buildMaskCanvas(mask, settings), 0, 0, size.width, size.height);
  cutoutContext.globalCompositeOperation = 'source-over';
  if (settings.background === 'transparent') return cutout;

  const output = document.createElement('canvas');
  output.width = size.width;
  output.height = size.height;
  const context = output.getContext('2d');
  if (!context) throw new Error('Canvas output is unavailable in this browser.');
  context.fillStyle = settings.background === 'white' ? '#ffffff' : settings.background === 'black' ? '#000000' : settings.color;
  context.fillRect(0, 0, size.width, size.height);
  context.drawImage(cutout, 0, 0);
  return output;
}

function toPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to encode PNG output.')), 'image/png'));
}

export function mountBackgroundRemovalEditor(root: HTMLElement): void {
  root.dataset.platformRuntime = 'background-v1';
  root.dataset.platformScope = 'shared';
  const notice = q<HTMLElement>(root, '[data-role="notice"]');
  const input = q<HTMLInputElement>(root, '[data-role="file-input"]');
  const drop = q<HTMLElement>(root, '[data-role="batch-dropzone"]');
  const list = q<HTMLElement>(root, '[data-role="batch-list"]');
  const count = q<HTMLElement>(root, '[data-role="batch-count"]');
  const modeSummary = q<HTMLElement>(root, '[data-role="mode-summary"]');
  const add = q<HTMLButtonElement>(root, '[data-role="add-more"]');
  const clear = q<HTMLButtonElement>(root, '[data-role="clear-all"]');
  const scopeButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-edit-scope]')];
  const useShared = q<HTMLButtonElement>(root, '[data-role="use-shared-settings"]');
  const applyAll = q<HTMLButtonElement>(root, '[data-role="apply-current-to-all"]');
  const threshold = q<HTMLInputElement>(root, '[data-setting="threshold"]');
  const thresholdValue = q<HTMLOutputElement>(root, '[data-output-for="threshold"]');
  const feather = q<HTMLInputElement>(root, '[data-setting="feather"]');
  const featherValue = q<HTMLOutputElement>(root, '[data-output-for="feather"]');
  const background = q<HTMLSelectElement>(root, '[data-setting="background"]');
  const color = q<HTMLInputElement>(root, '[data-setting="color"]');
  const colorWrap = q<HTMLElement>(root, '[data-role="custom-color-wrap"]');
  const modelStatus = q<HTMLElement>(root, '[data-role="model-status"]');
  const sourcePreview = q<HTMLImageElement>(root, '[data-role="source-preview"]');
  const sourceEmpty = q<HTMLElement>(root, '[data-role="source-empty"]');
  const resultPreview = q<HTMLImageElement>(root, '[data-role="result-preview"]');
  const resultEmpty = q<HTMLElement>(root, '[data-role="result-empty"]');
  const sourceMeta = q<HTMLElement>(root, '[data-role="source-meta"]');
  const previewMeta = q<HTMLElement>(root, '[data-role="preview-meta"]');
  const progress = q<HTMLElement>(root, '[data-role="batch-progress"]');
  const progressLabel = q<HTMLElement>(root, '[data-role="progress-label"]');
  const progressCount = q<HTMLElement>(root, '[data-role="progress-count"]');
  const progressBar = q<HTMLProgressElement>(root, '[data-role="progress-bar"]');
  const cancel = q<HTMLButtonElement>(root, '[data-role="cancel-batch"]');
  const readyCount = q<HTMLElement>(root, '[data-role="ready-count"]');
  const processButton = q<HTMLButtonElement>(root, '[data-role="process-batch"]');
  const downloadButton = q<HTMLButtonElement>(root, '[data-role="download-batch"]');
  const maxFiles = Number(root.dataset.maxFiles || 50);
  const maxFileBytes = Number(root.dataset.maxFileBytes || 10 * 1024 * 1024);
  const maxPixels = Number(root.dataset.maxPixels || 20_000_000);
  const maxDimension = Number(root.dataset.maxDimension || 12_000);
  const maxTotalBytes = 200 * 1024 * 1024;
  const client = new BackgroundRemovalWorkerClient();
  const state: State = { mode: 'shared', shared: cloneSettings(DEFAULT_SETTINGS), items: [], processing: false, cancel: false, previewGeneration: 0 };

  const active = (): Item | undefined => state.items.find((item) => item.id === state.activeId);
  const effective = (item: Item): Settings => state.mode === 'individual' && item.settings ? item.settings : state.shared;
  const showNotice = (message: string, type: 'info' | 'error' = 'info'): void => { notice.hidden = false; notice.dataset.type = type; notice.textContent = message; };
  const hideNotice = (): void => { notice.hidden = true; notice.textContent = ''; delete notice.dataset.type; };

  function invalidateResults(): void {
    for (const item of state.items) { item.status = 'ready'; item.result = undefined; item.outputName = undefined; item.error = undefined; }
    downloadButton.disabled = true;
    renderQueue();
    updateActions();
  }

  function renderSettings(): void {
    const item = active();
    const settings = item ? effective(item) : state.shared;
    threshold.value = String(settings.threshold);
    thresholdValue.value = `${settings.threshold}%`;
    feather.value = String(settings.feather);
    featherValue.value = `${settings.feather}`;
    background.value = settings.background;
    color.value = settings.color;
    colorWrap.hidden = settings.background !== 'custom';
    useShared.hidden = state.mode !== 'individual' || !item || item.settingsOrigin !== 'custom';
    applyAll.hidden = state.mode !== 'individual' || !item;
  }

  function readSettings(base: Settings): Settings {
    return {
      threshold: clamp(Number(threshold.value), 1, 99),
      feather: clamp(Number(feather.value), 0, 30),
      background: background.value as Settings['background'],
      color: color.value || base.color,
    };
  }

  function changeSettings(): void {
    const item = active();
    const current = item ? effective(item) : state.shared;
    const next = readSettings(current);
    if (state.mode === 'individual' && item) { item.settings = next; item.settingsOrigin = 'custom'; }
    else state.shared = next;
    invalidateResults();
    renderSettings();
    schedulePreview(false);
  }

  function setMode(mode: State['mode']): void {
    if (state.processing || mode === state.mode) return;
    state.mode = mode;
    root.dataset.platformScope = mode;
    scopeButtons.forEach((button) => {
      const selected = button.dataset.editScope === mode;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-checked', String(selected));
    });
    modeSummary.textContent = mode === 'shared' ? `One cutout setup applies to all ${state.items.length} images.` : 'Each image can override cutout and background settings.';
    renderSettings();
    renderQueue();
    schedulePreview(false);
  }

  function statusText(item: Item): string {
    if (item.status === 'processing') return 'Removing background…';
    if (item.status === 'done') return 'Done';
    if (item.status === 'error') return item.error || 'Failed';
    return `${item.width} × ${item.height}${item.mask ? ' · mask ready' : ''}`;
  }

  function renderQueue(): void {
    list.replaceChildren();
    count.textContent = String(state.items.length);
    root.dataset.hasItems = String(state.items.length > 0);
    for (const item of state.items) {
      const card = document.createElement('div');
      card.className = `background-file-card${item.id === state.activeId ? ' is-active' : ''}`;
      card.tabIndex = state.processing ? -1 : 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Edit ${item.file.name}`);
      const image = document.createElement('img'); image.src = item.url; image.alt = '';
      const copy = document.createElement('div'); copy.className = 'background-file-card__copy';
      const name = document.createElement('strong'); name.textContent = item.file.name;
      const meta = document.createElement('small'); meta.textContent = statusText(item);
      const badge = document.createElement('span'); badge.className = `background-badge${item.settingsOrigin === 'custom' ? ' custom' : ''}`; badge.textContent = item.settingsOrigin.toUpperCase();
      copy.append(name, meta, badge);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'background-file-remove'; remove.textContent = '×'; remove.title = 'Remove image'; remove.disabled = state.processing;
      remove.addEventListener('click', (event) => { event.stopPropagation(); removeItem(item.id); });
      const select = (): void => { if (!state.processing) { state.activeId = item.id; renderSettings(); renderQueue(); schedulePreview(true); } };
      card.addEventListener('click', select);
      card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
      card.append(image, copy, remove);
      list.append(card);
    }
    updateActions();
  }

  function clearPreview(): void {
    sourcePreview.hidden = true; sourcePreview.removeAttribute('src'); sourceEmpty.hidden = false;
    resultPreview.hidden = true; resultPreview.removeAttribute('src'); resultEmpty.hidden = false;
    sourceMeta.textContent = ''; previewMeta.textContent = '';
  }

  async function ensureMask(item: Item, reportProgress: boolean): Promise<Float32Array> {
    if (item.mask) return item.mask;
    if (item.maskPromise) return item.maskPromise;
    item.maskPromise = (async () => {
      const bitmap = await createImageBitmap(item.file);
      try {
        const tensor = preprocess(bitmap);
        if (reportProgress) modelStatus.textContent = 'Loading local AI runtime and model…';
        const mask = await client.segment(tensor, (loaded, total) => {
          if (!reportProgress) return;
          modelStatus.textContent = total > 0 ? `Loading local model… ${Math.round(loaded / total * 100)}%` : `Loading local model… ${(loaded / (1024 * 1024)).toFixed(1)} MB`;
        });
        item.mask = mask;
        if (reportProgress) modelStatus.textContent = 'Local AI model ready · cached for this page.';
        return mask;
      } finally { bitmap.close(); }
    })();
    try { return await item.maskPromise; }
    finally { item.maskPromise = undefined; renderQueue(); }
  }

  async function renderPreview(loadMask: boolean): Promise<void> {
    const item = active();
    if (!item) { clearPreview(); return; }
    const generation = ++state.previewGeneration;
    sourcePreview.src = item.url; sourcePreview.hidden = false; sourceEmpty.hidden = true;
    sourceMeta.textContent = `${item.width.toLocaleString()} × ${item.height.toLocaleString()}`;
    resultEmpty.hidden = false; resultEmpty.textContent = loadMask && !item.mask ? 'Preparing local AI cutout…' : 'Rendering preview…';
    try {
      const mask = item.mask ?? (loadMask ? await ensureMask(item, true) : undefined);
      if (!mask || generation !== state.previewGeneration) { if (!mask) resultEmpty.textContent = 'Select this image to generate its local AI mask.'; return; }
      const bitmap = await createImageBitmap(item.file);
      try {
        const canvas = renderCutout(bitmap, mask, effective(item), 1100);
        if (generation !== state.previewGeneration) return;
        resultPreview.src = canvas.toDataURL('image/png'); resultPreview.hidden = false; resultEmpty.hidden = true;
        previewMeta.textContent = `${canvas.width.toLocaleString()} × ${canvas.height.toLocaleString()} preview · PNG output`;
      } finally { bitmap.close(); }
    } catch (error) {
      if (generation !== state.previewGeneration) return;
      resultPreview.hidden = true; resultEmpty.hidden = false; resultEmpty.textContent = 'Preview unavailable';
      previewMeta.textContent = error instanceof Error ? error.message : 'Unable to generate cutout preview.';
      showNotice(previewMeta.textContent, 'error');
    }
  }

  function schedulePreview(loadMask: boolean): void {
    if (state.previewTimer) window.clearTimeout(state.previewTimer);
    state.previewTimer = window.setTimeout(() => void renderPreview(loadMask), 90);
  }

  function updateActions(): void {
    const done = state.items.filter((item) => item.status === 'done' && item.result).length;
    readyCount.textContent = `${state.items.length} image${state.items.length === 1 ? '' : 's'} ready`;
    processButton.disabled = state.processing || !state.items.length;
    downloadButton.disabled = state.processing || !done;
    add.disabled = state.processing; clear.disabled = state.processing;
    scopeButtons.forEach((button) => { button.disabled = state.processing; });
  }

  async function addFiles(files: readonly File[]): Promise<void> {
    if (!files.length || state.processing) return;
    hideNotice();
    let totalBytes = state.items.reduce((sum, item) => sum + item.file.size, 0);
    let rejected = 0, limited = 0;
    for (const file of files) {
      if (state.items.length >= maxFiles || totalBytes + file.size > maxTotalBytes) { limited += 1; continue; }
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext(file.name)) || file.size > maxFileBytes) { rejected += 1; continue; }
      try {
        const bitmap = await createImageBitmap(file); const width = bitmap.width, height = bitmap.height; bitmap.close();
        if (width > maxDimension || height > maxDimension || width * height > maxPixels) { rejected += 1; continue; }
        state.items.push({ id: crypto.randomUUID(), file, width, height, url: URL.createObjectURL(file), settingsOrigin: 'shared', status: 'ready' });
        totalBytes += file.size;
      } catch { rejected += 1; }
    }
    input.value = '';
    if (!state.activeId && state.items[0]) state.activeId = state.items[0].id;
    renderSettings(); renderQueue(); schedulePreview(true);
    if (rejected || limited) showNotice(`${rejected ? `${rejected} skipped by format or size limits` : ''}${rejected && limited ? ' · ' : ''}${limited ? `${limited} skipped by batch limits` : ''}`);
  }

  function removeItem(id: string): void {
    if (state.processing) return;
    const index = state.items.findIndex((item) => item.id === id); if (index < 0) return;
    const [removed] = state.items.splice(index, 1); if (removed) URL.revokeObjectURL(removed.url);
    if (state.activeId === id) state.activeId = state.items[Math.min(index, state.items.length - 1)]?.id;
    renderSettings(); renderQueue(); schedulePreview(true);
  }

  function resetAll(): void {
    if (state.processing) return;
    state.previewGeneration += 1; if (state.previewTimer) window.clearTimeout(state.previewTimer);
    state.items.forEach((item) => URL.revokeObjectURL(item.url));
    state.items = []; state.activeId = undefined; state.mode = 'shared'; state.shared = cloneSettings(DEFAULT_SETTINGS); input.value = '';
    progress.hidden = true; hideNotice(); clearPreview(); client.reset('Batch cleared'); modelStatus.textContent = 'Local AI runtime loads on first use (~18 MB) and is cached by the browser.';
    renderSettings(); renderQueue();
  }

  async function processBatch(): Promise<void> {
    if (state.processing || !state.items.length) return;
    state.processing = true; state.cancel = false; hideNotice();
    progress.hidden = false; progressLabel.textContent = 'Removing backgrounds…'; progressBar.max = 100; progressBar.value = 0; cancel.disabled = false; updateActions();
    let completed = 0, failed = 0;
    for (const item of state.items) {
      if (state.cancel) break;
      item.status = 'processing'; item.error = undefined; renderQueue();
      try {
        const mask = await ensureMask(item, item.id === state.activeId);
        if (state.cancel) { item.status = 'ready'; break; }
        const bitmap = await createImageBitmap(item.file);
        try {
          const canvas = renderCutout(bitmap, mask, effective(item));
          item.result = await toPng(canvas);
          item.outputName = `${baseName(item.file.name)}-background-removed.png`;
          item.status = 'done'; completed += 1;
        } finally { bitmap.close(); }
      } catch (error) {
        if (state.cancel) { item.status = 'ready'; item.error = undefined; break; }
        item.status = 'error'; item.error = error instanceof Error ? error.message : 'Unable to remove background.'; failed += 1;
      }
      const finished = completed + failed;
      progressCount.textContent = `${finished} / ${state.items.length}`;
      progressBar.value = Math.round(finished / state.items.length * 100);
      renderQueue();
    }
    state.processing = false; cancel.disabled = true;
    progressLabel.textContent = state.cancel ? `Stopped · ${completed} completed` : failed ? `${completed} completed · ${failed} failed` : `${completed} completed`;
    updateActions();
    if (active()?.mask) schedulePreview(false);
    if (failed) showNotice(`${failed} image${failed === 1 ? '' : 's'} failed. Successful cutouts are still available.`);
  }

  async function downloadResults(): Promise<void> {
    const used = new Map<string, number>();
    const files = state.items.filter((item): item is Item & { result: Blob; outputName: string } => Boolean(item.result && item.outputName && item.status === 'done')).map((item) => {
      const count = used.get(item.outputName) ?? 0; used.set(item.outputName, count + 1);
      if (!count) return { filename: item.outputName, blob: item.result };
      return { filename: item.outputName.replace(/\.png$/i, `-${count + 1}.png`), blob: item.result };
    });
    if (!files.length) return;
    if (files.length === 1) { downloadBlob(files[0].blob, files[0].filename); return; }
    downloadBlob(await createZipBlob(files), `background-removed-${files.length}-images.zip`);
  }

  for (const control of [threshold, feather, background, color]) {
    control.addEventListener(control instanceof HTMLInputElement && control.type === 'range' ? 'input' : 'change', changeSettings);
  }
  scopeButtons.forEach((button) => button.addEventListener('click', () => { const mode = button.dataset.editScope; if (mode === 'shared' || mode === 'individual') setMode(mode); }));
  useShared.addEventListener('click', () => { const item = active(); if (!item || state.processing) return; item.settings = undefined; item.settingsOrigin = 'shared'; invalidateResults(); renderSettings(); renderQueue(); schedulePreview(false); });
  applyAll.addEventListener('click', () => { const item = active(); if (!item || state.processing) return; state.shared = cloneSettings(effective(item)); state.items.forEach((candidate) => { candidate.settings = undefined; candidate.settingsOrigin = 'shared'; }); invalidateResults(); renderSettings(); renderQueue(); schedulePreview(false); });
  drop.addEventListener('dragover', (event) => { event.preventDefault(); drop.classList.add('is-dragging'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-dragging'));
  drop.addEventListener('drop', (event) => { event.preventDefault(); drop.classList.remove('is-dragging'); void addFiles([...event.dataTransfer!.files]); });
  input.addEventListener('change', () => void addFiles([...input.files ?? []]));
  add.addEventListener('click', () => input.click()); clear.addEventListener('click', resetAll);
  processButton.addEventListener('click', () => void processBatch()); downloadButton.addEventListener('click', () => void downloadResults());
  cancel.addEventListener('click', () => { if (!state.processing) return; state.cancel = true; cancel.disabled = true; progressLabel.textContent = 'Stopping…'; client.reset('Batch cancelled'); });

  modelStatus.textContent = 'Local AI runtime loads on first use (~18 MB) and is cached by the browser.';
  renderSettings(); renderQueue(); clearPreview();
}
