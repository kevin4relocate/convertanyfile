import './background-refine.css';
import { createZipBlob, downloadBlob } from '../core/download';
import { BackgroundRemovalWorkerClient } from './worker-client';

type Settings = {
  threshold: number;
  feather: number;
  background: 'transparent' | 'white' | 'black' | 'custom';
  color: string;
};

type Status = 'ready' | 'processing' | 'done' | 'error';
type RefineMode = 'erase' | 'restore' | 'pan';
type Stroke = { indices: number[]; before: number[]; after: number[] };

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
  manual: Int8Array;
  undo: Stroke[];
  redo: Stroke[];
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
  refineMode: RefineMode;
  brushSize: number;
  showOverlay: boolean;
  zoom: number;
  panX: number;
  panY: number;
  pointerId?: number;
  strokeBefore?: Map<number, number>;
  panning?: { x: number; y: number; startX: number; startY: number };
  hover?: { x: number; y: number };
  spaceHeld: boolean;
};

const INPUT_SIZE = 320;
const DEFAULT_SETTINGS: Settings = { threshold: 50, feather: 8, background: 'transparent', color: '#ffffff' };
const HISTORY_LIMIT = 30;

const q = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Background remover is missing ${selector}`);
  return element;
};
const maybe = <T extends Element>(root: ParentNode, selector: string): T | undefined => root.querySelector<T>(selector) ?? undefined;
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

function effectiveConfidence(mask: Float32Array, manual: Int8Array, index: number): number {
  return clamp((mask[index] ?? 0) + (manual[index] ?? 0) / 127, 0, 1);
}

function alphaFor(mask: Float32Array, manual: Int8Array, settings: Settings, index: number): number {
  const value = effectiveConfidence(mask, manual, index);
  const threshold = clamp(settings.threshold, 1, 99) / 100;
  const halfWidth = clamp(settings.feather, 0, 30) / 200;
  if (halfWidth <= 0) return value >= threshold ? 1 : 0;
  return smoothstep(threshold - halfWidth, threshold + halfWidth, value);
}

function buildMaskCanvas(mask: Float32Array, manual: Int8Array, settings: Settings): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = INPUT_SIZE;
  canvas.height = INPUT_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Mask rendering is unavailable in this browser.');
  const image = context.createImageData(INPUT_SIZE, INPUT_SIZE);
  for (let index = 0; index < INPUT_SIZE * INPUT_SIZE; index += 1) {
    const alpha = alphaFor(mask, manual, settings, index);
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

function renderCutout(bitmap: ImageBitmap, mask: Float32Array, manual: Int8Array, settings: Settings, maxDimension?: number): HTMLCanvasElement {
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
  cutoutContext.drawImage(buildMaskCanvas(mask, manual, settings), 0, 0, size.width, size.height);
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
  root.dataset.platformRuntime = 'background-v2';
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
  const workspace = q<HTMLElement>(root, '.background-workspace');
  const previewWrap = q<HTMLElement>(root, '.background-preview-wrap');
  const sourceFrame = sourcePreview.parentElement as HTMLElement;

  const maxFiles = Number(root.dataset.maxFiles || 50);
  const maxFileBytes = Number(root.dataset.maxFileBytes || 10 * 1024 * 1024);
  const maxPixels = Number(root.dataset.maxPixels || 20_000_000);
  const maxDimension = Number(root.dataset.maxDimension || 12_000);
  const maxTotalBytes = 200 * 1024 * 1024;
  const client = new BackgroundRemovalWorkerClient();

  const state: State = {
    mode: 'shared', shared: cloneSettings(DEFAULT_SETTINGS), items: [], processing: false, cancel: false,
    previewGeneration: 0, refineMode: 'erase', brushSize: 44, showOverlay: true,
    zoom: 1, panX: 0, panY: 0, spaceHeld: false,
  };

  const overlay = document.createElement('canvas');
  overlay.width = INPUT_SIZE;
  overlay.height = INPUT_SIZE;
  overlay.className = 'background-refine-overlay is-brush';
  overlay.hidden = true;
  sourceFrame.append(overlay);

  const refinePanel = document.createElement('section');
  refinePanel.className = 'background-refine-panel';
  refinePanel.innerHTML = `
    <div class="background-refine-panel__head">
      <div><span>Manual refine</span><strong>Fix the AI cutout where needed</strong></div>
      <div class="background-refine-actions">
        <button type="button" data-refine-undo disabled>Undo</button>
        <button type="button" data-refine-redo disabled>Redo</button>
        <button type="button" data-refine-reset disabled>Reset to AI mask</button>
      </div>
    </div>
    <div class="background-refine-controls">
      <div><span>Tool</span><div class="background-refine-modes" role="group" aria-label="Manual background refinement tool">
        <button class="is-active" type="button" data-refine-mode="erase" aria-pressed="true">Erase</button>
        <button type="button" data-refine-mode="restore" aria-pressed="false">Restore</button>
        <button type="button" data-refine-mode="pan" aria-pressed="false">Pan</button>
      </div></div>
      <label><span>Brush size</span><div class="background-refine-range"><input type="range" min="10" max="140" value="44" data-refine-brush /><output data-refine-brush-value>44 px</output></div></label>
      <div><span>Canvas</span><div class="background-refine-zoom"><button type="button" data-refine-zoom-out>−</button><output data-refine-zoom-value>100%</output><button type="button" data-refine-zoom-in>+</button><button type="button" data-refine-fit>Fit</button></div></div>
    </div>
    <label class="background-refine-mask-toggle"><input type="checkbox" data-refine-overlay checked /><span>Show AI mask overlay while editing</span></label>
    <p class="background-refine-help"><strong>Erase</strong> removes leftover background. <strong>Restore</strong> brings back subject pixels the AI removed. Brush edits apply only to the selected image. Hold <strong>Space</strong> and drag to pan while zoomed.</p>`;
  workspace.insertBefore(refinePanel, previewWrap);

  const quickBackground = document.createElement('div');
  quickBackground.className = 'background-quick-bg';
  quickBackground.innerHTML = `<span>Preview background</span><div class="background-quick-bg__buttons">
    <button type="button" data-background-choice="transparent">Transparent</button>
    <button type="button" data-background-choice="white"><i class="background-quick-bg__swatch" style="background:#fff"></i>White</button>
    <button type="button" data-background-choice="black"><i class="background-quick-bg__swatch" style="background:#000"></i>Black</button>
    <button type="button" data-background-choice="custom">Custom</button>
  </div>`;
  const backgroundLabel = background.closest('label');
  if (backgroundLabel) backgroundLabel.hidden = true;
  colorWrap.before(quickBackground);

  const refineModeButtons = [...refinePanel.querySelectorAll<HTMLButtonElement>('[data-refine-mode]')];
  const undoButton = q<HTMLButtonElement>(refinePanel, '[data-refine-undo]');
  const redoButton = q<HTMLButtonElement>(refinePanel, '[data-refine-redo]');
  const resetButton = q<HTMLButtonElement>(refinePanel, '[data-refine-reset]');
  const brush = q<HTMLInputElement>(refinePanel, '[data-refine-brush]');
  const brushValue = q<HTMLOutputElement>(refinePanel, '[data-refine-brush-value]');
  const zoomOut = q<HTMLButtonElement>(refinePanel, '[data-refine-zoom-out]');
  const zoomIn = q<HTMLButtonElement>(refinePanel, '[data-refine-zoom-in]');
  const fitButton = q<HTMLButtonElement>(refinePanel, '[data-refine-fit]');
  const zoomValue = q<HTMLOutputElement>(refinePanel, '[data-refine-zoom-value]');
  const overlayToggle = q<HTMLInputElement>(refinePanel, '[data-refine-overlay]');
  const backgroundButtons = [...quickBackground.querySelectorAll<HTMLButtonElement>('[data-background-choice]')];

  const active = (): Item | undefined => state.items.find((item) => item.id === state.activeId);
  const effective = (item: Item): Settings => state.mode === 'individual' && item.settings ? item.settings : state.shared;
  const showNotice = (message: string, type: 'info' | 'error' = 'info'): void => { notice.hidden = false; notice.dataset.type = type; notice.textContent = message; };
  const hideNotice = (): void => { notice.hidden = true; notice.textContent = ''; delete notice.dataset.type; };

  function invalidateResults(): void {
    for (const item of state.items) { item.status = 'ready'; item.result = undefined; item.outputName = undefined; item.error = undefined; }
    downloadButton.disabled = true;
    progress.hidden = true;
    renderQueue();
    updateActions();
  }

  function updateBackgroundButtons(settings: Settings): void {
    backgroundButtons.forEach((button) => {
      const selected = button.dataset.backgroundChoice === settings.background;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
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
    updateBackgroundButtons(settings);
    renderOverlay();
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
    const edited = item.manual.some((value) => value !== 0);
    return `${item.width} × ${item.height}${item.mask ? ' · mask ready' : ''}${edited ? ' · refined' : ''}`;
  }

  function resetView(): void {
    state.zoom = 1; state.panX = 0; state.panY = 0;
    applyViewTransform();
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
      const select = (): void => {
        if (state.processing) return;
        state.activeId = item.id;
        resetView();
        renderSettings();
        renderQueue();
        schedulePreview(true);
      };
      card.addEventListener('click', select);
      card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
      card.append(image, copy, remove);
      list.append(card);
    }
    updateActions();
    updateRefineControls();
  }

  function clearPreview(): void {
    sourcePreview.hidden = true; sourcePreview.removeAttribute('src'); sourceEmpty.hidden = false;
    resultPreview.hidden = true; resultPreview.removeAttribute('src'); resultEmpty.hidden = false;
    sourceMeta.textContent = ''; previewMeta.textContent = '';
    overlay.hidden = true;
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
          modelStatus.textContent = total > 0 ? `Loading local AI model… ${Math.round((loaded / total) * 100)}%` : 'Loading local AI model…';
        });
        item.mask = mask;
        modelStatus.textContent = 'AI mask ready. Use Erase or Restore for any edge fixes.';
        return mask;
      } finally { bitmap.close(); }
    })();
    try { return await item.maskPromise; }
    finally { item.maskPromise = undefined; updateRefineControls(); renderOverlay(); }
  }

  async function renderPreview(reportProgress: boolean): Promise<void> {
    const item = active();
    if (!item) { clearPreview(); return; }
    const generation = ++state.previewGeneration;
    sourcePreview.src = item.url; sourcePreview.hidden = false; sourceEmpty.hidden = true;
    sourceMeta.textContent = `${item.width.toLocaleString()} × ${item.height.toLocaleString()}`;
    try {
      const mask = await ensureMask(item, reportProgress);
      const bitmap = await createImageBitmap(item.file);
      try {
        const canvas = renderCutout(bitmap, mask, item.manual, effective(item), 1200);
        if (generation !== state.previewGeneration) return;
        resultPreview.src = canvas.toDataURL('image/png'); resultPreview.hidden = false; resultEmpty.hidden = true;
        previewMeta.textContent = `${canvas.width.toLocaleString()} × ${canvas.height.toLocaleString()} preview`;
      } finally { bitmap.close(); }
      requestAnimationFrame(() => { syncOverlayGeometry(); renderOverlay(); });
    } catch (error) {
      if (generation !== state.previewGeneration) return;
      resultPreview.hidden = true; resultEmpty.hidden = false; resultEmpty.textContent = 'Preview unavailable';
      previewMeta.textContent = error instanceof Error ? error.message : 'Unable to render preview';
    }
  }

  function schedulePreview(reportProgress: boolean): void {
    if (state.previewTimer) window.clearTimeout(state.previewTimer);
    state.previewTimer = window.setTimeout(() => void renderPreview(reportProgress), 70);
  }

  function updateActions(): void {
    const done = state.items.filter((item) => item.status === 'done' && item.result).length;
    readyCount.textContent = `${state.items.length} image${state.items.length === 1 ? '' : 's'} ready`;
    processButton.disabled = state.processing || !state.items.length;
    downloadButton.disabled = state.processing || !done;
    add.disabled = state.processing; clear.disabled = state.processing;
    scopeButtons.forEach((button) => { button.disabled = state.processing; });
    updateRefineControls();
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
        state.items.push({ id: crypto.randomUUID(), file, width, height, url: URL.createObjectURL(file), settingsOrigin: 'shared', status: 'ready', manual: new Int8Array(INPUT_SIZE * INPUT_SIZE), undo: [], redo: [] });
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
    resetView(); renderSettings(); renderQueue(); schedulePreview(true);
  }

  function resetAll(): void {
    if (state.processing) return;
    state.previewGeneration += 1; if (state.previewTimer) window.clearTimeout(state.previewTimer);
    state.items.forEach((item) => URL.revokeObjectURL(item.url));
    state.items = []; state.activeId = undefined; state.mode = 'shared'; state.shared = cloneSettings(DEFAULT_SETTINGS); input.value = '';
    progress.hidden = true; hideNotice(); clearPreview(); client.reset('Batch cleared'); modelStatus.textContent = 'Local AI runtime loads on first use (~18 MB) and is cached by the browser.';
    resetView(); renderSettings(); renderQueue();
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
          const canvas = renderCutout(bitmap, mask, item.manual, effective(item));
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
    schedulePreview(false);
    if (failed) showNotice(`${failed} image${failed === 1 ? '' : 's'} failed. Successful cutouts are still available.`);
  }

  async function downloadResults(): Promise<void> {
    const used = new Map<string, number>();
    const files = state.items.filter((item): item is Item & { result: Blob; outputName: string } => Boolean(item.result && item.outputName && item.status === 'done')).map((item) => {
      const occurrence = used.get(item.outputName) ?? 0; used.set(item.outputName, occurrence + 1);
      if (!occurrence) return { filename: item.outputName, blob: item.result };
      return { filename: item.outputName.replace(/\.png$/i, `-${occurrence + 1}.png`), blob: item.result };
    });
    if (!files.length) return;
    if (files.length === 1) { downloadBlob(files[0].blob, files[0].filename); return; }
    downloadBlob(await createZipBlob(files), `background-removed-${files.length}-images.zip`);
  }

  function syncOverlayGeometry(): void {
    if (sourcePreview.hidden || !sourcePreview.complete || !sourcePreview.naturalWidth) { overlay.hidden = true; return; }
    overlay.hidden = false;
    overlay.style.left = `${sourcePreview.offsetLeft}px`;
    overlay.style.top = `${sourcePreview.offsetTop}px`;
    overlay.style.width = `${sourcePreview.offsetWidth}px`;
    overlay.style.height = `${sourcePreview.offsetHeight}px`;
    applyViewTransform();
  }

  function applyViewTransform(): void {
    const transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    sourcePreview.style.transform = transform;
    overlay.style.transform = transform;
    zoomValue.value = `${Math.round(state.zoom * 100)}%`;
  }

  function updateRefineControls(): void {
    const item = active();
    const ready = Boolean(item?.mask) && !state.processing;
    refineModeButtons.forEach((button) => { button.disabled = !ready; });
    brush.disabled = !ready || state.refineMode === 'pan';
    zoomIn.disabled = !item; zoomOut.disabled = !item; fitButton.disabled = !item;
    undoButton.disabled = !ready || !item?.undo.length;
    redoButton.disabled = !ready || !item?.redo.length;
    resetButton.disabled = !ready || !item?.manual.some((value) => value !== 0);
    overlay.classList.toggle('is-pan', state.refineMode === 'pan');
    overlay.classList.toggle('is-brush', state.refineMode !== 'pan');
    refineModeButtons.forEach((button) => {
      const activeMode = button.dataset.refineMode === state.refineMode;
      button.classList.toggle('is-active', activeMode);
      button.setAttribute('aria-pressed', String(activeMode));
    });
  }

  function renderOverlay(): void {
    const item = active();
    const context = overlay.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    if (!item?.mask) { overlay.hidden = true; updateRefineControls(); return; }
    syncOverlayGeometry();
    const settings = effective(item);
    if (state.showOverlay) {
      const image = context.createImageData(INPUT_SIZE, INPUT_SIZE);
      for (let index = 0; index < INPUT_SIZE * INPUT_SIZE; index += 1) {
        const manual = item.manual[index] ?? 0;
        const alpha = alphaFor(item.mask, item.manual, settings, index);
        const target = index * 4;
        if (manual > 0) { image.data[target] = 55; image.data[target + 1] = 230; image.data[target + 2] = 155; image.data[target + 3] = 112; }
        else if (manual < 0) { image.data[target] = 255; image.data[target + 1] = 80; image.data[target + 2] = 90; image.data[target + 3] = 112; }
        else if (alpha > 0.5) { image.data[target] = 112; image.data[target + 1] = 96; image.data[target + 2] = 255; image.data[target + 3] = 34; }
      }
      context.putImageData(image, 0, 0);
    }
    if (state.hover && state.refineMode !== 'pan') {
      const rect = overlay.getBoundingClientRect();
      const rx = (state.brushSize / 2) / Math.max(1, rect.width) * INPUT_SIZE;
      const ry = (state.brushSize / 2) / Math.max(1, rect.height) * INPUT_SIZE;
      context.save();
      context.strokeStyle = '#ffffff'; context.lineWidth = 1.5; context.setLineDash([4, 3]);
      context.beginPath(); context.ellipse(state.hover.x, state.hover.y, rx, ry, 0, 0, Math.PI * 2); context.stroke(); context.restore();
    }
    updateRefineControls();
  }

  function pointerToMask(event: PointerEvent): { x: number; y: number } {
    const rect = overlay.getBoundingClientRect();
    return { x: clamp((event.clientX - rect.left) / Math.max(1, rect.width) * INPUT_SIZE, 0, INPUT_SIZE - 1), y: clamp((event.clientY - rect.top) / Math.max(1, rect.height) * INPUT_SIZE, 0, INPUT_SIZE - 1) };
  }

  function applyBrushPoint(item: Item, point: { x: number; y: number }): void {
    const rect = overlay.getBoundingClientRect();
    const rx = Math.max(1, (state.brushSize / 2) / Math.max(1, rect.width) * INPUT_SIZE);
    const ry = Math.max(1, (state.brushSize / 2) / Math.max(1, rect.height) * INPUT_SIZE);
    const minX = Math.max(0, Math.floor(point.x - rx)), maxX = Math.min(INPUT_SIZE - 1, Math.ceil(point.x + rx));
    const minY = Math.max(0, Math.floor(point.y - ry)), maxY = Math.min(INPUT_SIZE - 1, Math.ceil(point.y + ry));
    const sign = state.refineMode === 'restore' ? 1 : -1;
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const distance = Math.sqrt(((x - point.x) / rx) ** 2 + ((y - point.y) / ry) ** 2);
        if (distance > 1) continue;
        const weight = distance <= 0.72 ? 1 : clamp((1 - distance) / 0.28, 0, 1);
        const target = Math.round(sign * 127 * weight);
        const index = y * INPUT_SIZE + x;
        const current = item.manual[index] ?? 0;
        if (!state.strokeBefore?.has(index)) state.strokeBefore?.set(index, current);
        if (Math.sign(current) === Math.sign(target) && Math.abs(current) > Math.abs(target)) continue;
        item.manual[index] = target;
      }
    }
  }

  function finishStroke(item: Item): void {
    const beforeMap = state.strokeBefore; state.strokeBefore = undefined;
    if (!beforeMap?.size) return;
    const indices: number[] = [], before: number[] = [], after: number[] = [];
    for (const [index, previous] of beforeMap) {
      const next = item.manual[index] ?? 0;
      if (next === previous) continue;
      indices.push(index); before.push(previous); after.push(next);
    }
    if (!indices.length) return;
    item.undo.push({ indices, before, after });
    if (item.undo.length > HISTORY_LIMIT) item.undo.shift();
    item.redo = [];
    renderQueue(); updateRefineControls(); renderOverlay(); schedulePreview(false);
  }

  function applyStrokeValues(item: Item, stroke: Stroke, values: number[]): void {
    stroke.indices.forEach((index, offset) => { item.manual[index] = values[offset] ?? 0; });
  }

  function undoRefine(): void {
    const item = active(); const stroke = item?.undo.pop(); if (!item || !stroke) return;
    invalidateResults(); applyStrokeValues(item, stroke, stroke.before); item.redo.push(stroke); renderQueue(); renderOverlay(); schedulePreview(false);
  }

  function redoRefine(): void {
    const item = active(); const stroke = item?.redo.pop(); if (!item || !stroke) return;
    invalidateResults(); applyStrokeValues(item, stroke, stroke.after); item.undo.push(stroke); renderQueue(); renderOverlay(); schedulePreview(false);
  }

  function resetRefine(): void {
    const item = active(); if (!item) return;
    invalidateResults(); item.manual.fill(0); item.undo = []; item.redo = []; renderQueue(); renderOverlay(); schedulePreview(false);
  }

  function setRefineMode(mode: RefineMode): void { state.refineMode = mode; updateRefineControls(); renderOverlay(); }
  function setZoom(next: number): void { state.zoom = clamp(next, 1, 4); if (state.zoom === 1) { state.panX = 0; state.panY = 0; } applyViewTransform(); renderOverlay(); }

  overlay.addEventListener('pointerdown', (event) => {
    const item = active(); if (!item?.mask || state.processing) return;
    state.pointerId = event.pointerId; overlay.setPointerCapture(event.pointerId);
    const panMode = state.refineMode === 'pan' || state.spaceHeld;
    if (panMode) {
      state.panning = { x: event.clientX, y: event.clientY, startX: state.panX, startY: state.panY };
      overlay.classList.add('is-panning'); return;
    }
    invalidateResults(); state.strokeBefore = new Map<number, number>();
    const point = pointerToMask(event); state.hover = point; applyBrushPoint(item, point); renderOverlay(); schedulePreview(false);
  });

  overlay.addEventListener('pointermove', (event) => {
    const item = active(); if (!item?.mask) return;
    const point = pointerToMask(event); state.hover = point;
    if (state.panning && state.pointerId === event.pointerId) {
      state.panX = state.panning.startX + event.clientX - state.panning.x;
      state.panY = state.panning.startY + event.clientY - state.panning.y;
      applyViewTransform(); renderOverlay(); return;
    }
    if (state.pointerId === event.pointerId && state.strokeBefore) { applyBrushPoint(item, point); renderOverlay(); schedulePreview(false); }
    else renderOverlay();
  });

  const endPointer = (event: PointerEvent): void => {
    if (state.pointerId !== event.pointerId) return;
    const item = active();
    if (item && state.strokeBefore) finishStroke(item);
    state.pointerId = undefined; state.panning = undefined; overlay.classList.remove('is-panning');
    try { overlay.releasePointerCapture(event.pointerId); } catch { /* already released */ }
  };
  overlay.addEventListener('pointerup', endPointer); overlay.addEventListener('pointercancel', endPointer);
  overlay.addEventListener('pointerleave', () => { if (!state.pointerId) { state.hover = undefined; renderOverlay(); } });

  refineModeButtons.forEach((button) => button.addEventListener('click', () => {
    const mode = button.dataset.refineMode as RefineMode | undefined; if (mode) setRefineMode(mode);
  }));
  brush.addEventListener('input', () => { state.brushSize = Number(brush.value); brushValue.value = `${state.brushSize} px`; renderOverlay(); });
  overlayToggle.addEventListener('change', () => { state.showOverlay = overlayToggle.checked; renderOverlay(); });
  undoButton.addEventListener('click', undoRefine); redoButton.addEventListener('click', redoRefine); resetButton.addEventListener('click', resetRefine);
  zoomIn.addEventListener('click', () => setZoom(state.zoom + 0.25)); zoomOut.addEventListener('click', () => setZoom(state.zoom - 0.25)); fitButton.addEventListener('click', resetView);

  window.addEventListener('keydown', (event) => { if (event.code === 'Space' && !['INPUT', 'SELECT', 'TEXTAREA'].includes((event.target as HTMLElement | null)?.tagName ?? '')) { state.spaceHeld = true; } });
  window.addEventListener('keyup', (event) => { if (event.code === 'Space') state.spaceHeld = false; });

  backgroundButtons.forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.backgroundChoice as Settings['background'] | undefined; if (!value) return;
    background.value = value; changeSettings();
  }));

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
  sourcePreview.addEventListener('load', () => requestAnimationFrame(() => { syncOverlayGeometry(); renderOverlay(); }));
  new ResizeObserver(() => { syncOverlayGeometry(); renderOverlay(); }).observe(sourceFrame);

  modelStatus.textContent = 'Local AI runtime loads on first use (~18 MB) and is cached by the browser.';
  renderSettings(); renderQueue(); clearPreview(); updateRefineControls();
}
