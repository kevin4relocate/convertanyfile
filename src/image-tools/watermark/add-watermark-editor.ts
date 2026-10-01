import { createZipBlob, downloadBlob } from '../core/download';
import { encodeCanvas, extensionForOutput, type ImageOutputFormat } from '../core/output-encoder';
import { defaultQualityForImageOutput } from '../core/output-quality';

type WatermarkMode = 'text' | 'logo';
type OutputChoice = 'source' | 'png' | 'jpg' | 'webp';
type Scope = 'shared' | 'individual';

interface WatermarkSettings {
  mode: WatermarkMode;
  text: string;
  color: string;
  opacity: number;
  textSize: number;
  logoSize: number;
  x: number;
  y: number;
}

interface WatermarkItem {
  id: string;
  file: File;
  url: string;
  settings?: WatermarkSettings;
  result?: Blob;
  resultName?: string;
}

interface Bounds { x: number; y: number; width: number; height: number; }

const ACCEPTED = new Set(['image/png', 'image/jpeg', 'image/webp']);

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function cloneSettings(settings: WatermarkSettings): WatermarkSettings {
  return { ...settings };
}

function sourceMime(file: File): ImageOutputFormat {
  if (file.type === 'image/jpeg') return 'image/jpeg';
  if (file.type === 'image/webp') return 'image/webp';
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  return 'image/png';
}

function outputMime(choice: OutputChoice, file: File): ImageOutputFormat {
  if (choice === 'jpg') return 'image/jpeg';
  if (choice === 'webp') return 'image/webp';
  if (choice === 'png') return 'image/png';
  return sourceMime(file);
}

function outputName(file: File, type: ImageOutputFormat): string {
  const dot = file.name.lastIndexOf('.');
  const stem = dot > 0 ? file.name.slice(0, dot) : file.name;
  return `${stem}-watermarked.${extensionForOutput(type)}`;
}

function canvas2d(width: number, height: number): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable in this browser.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

function textGeometry(context: CanvasRenderingContext2D, width: number, settings: WatermarkSettings): { text: string; fontPx: number; bounds: Bounds } {
  const text = settings.text.trim() || 'Watermark';
  const fontPx = Math.max(12, width * clamp(settings.textSize, 2, 20) / 100);
  context.font = `700 ${fontPx}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  const metrics = context.measureText(text);
  const boxWidth = Math.max(fontPx, metrics.width);
  const boxHeight = fontPx * 1.2;
  const cx = width * clamp(settings.x, 0, 100) / 100;
  return {
    text,
    fontPx,
    bounds: { x: cx - boxWidth / 2, y: 0, width: boxWidth, height: boxHeight },
  };
}

function logoBounds(width: number, height: number, settings: WatermarkSettings, logo: ImageBitmap): Bounds {
  const targetWidth = Math.max(8, width * clamp(settings.logoSize, 5, 60) / 100);
  const targetHeight = targetWidth * logo.height / Math.max(1, logo.width);
  const cx = width * clamp(settings.x, 0, 100) / 100;
  const cy = height * clamp(settings.y, 0, 100) / 100;
  return { x: cx - targetWidth / 2, y: cy - targetHeight / 2, width: targetWidth, height: targetHeight };
}

function drawWatermark(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: WatermarkSettings,
  logo?: ImageBitmap,
): Bounds | undefined {
  context.save();
  context.globalAlpha = clamp(settings.opacity, 10, 100) / 100;

  if (settings.mode === 'logo') {
    if (!logo) {
      context.restore();
      return undefined;
    }
    const bounds = logoBounds(width, height, settings, logo);
    context.drawImage(logo, bounds.x, bounds.y, bounds.width, bounds.height);
    context.restore();
    return bounds;
  }

  const geometry = textGeometry(context, width, settings);
  const cx = width * clamp(settings.x, 0, 100) / 100;
  const cy = height * clamp(settings.y, 0, 100) / 100;
  const bounds = { ...geometry.bounds, x: cx - geometry.bounds.width / 2, y: cy - geometry.bounds.height / 2 };
  context.font = `700 ${geometry.fontPx}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = settings.color || '#ffffff';
  context.shadowColor = 'rgba(0,0,0,.22)';
  context.shadowBlur = Math.max(1, geometry.fontPx * 0.06);
  context.fillText(geometry.text, cx, cy);
  context.restore();
  return bounds;
}

export function mountAddWatermarkEditor(root: HTMLElement): void {
  const q = <T extends Element>(selector: string): T | null => root.querySelector<T>(selector);
  const fileInput = q<HTMLInputElement>('[data-role="file-input"]');
  const queue = q<HTMLElement>('[data-role="batch-list"]');
  const batchCount = q<HTMLElement>('[data-role="batch-count"]');
  const notice = q<HTMLElement>('[data-role="notice"]');
  const canvas = q<HTMLCanvasElement>('[data-role="watermark-canvas"]');
  const previewEmpty = q<HTMLElement>('[data-role="preview-empty"]');
  const previewMeta = q<HTMLElement>('[data-role="preview-meta"]');
  const activeName = q<HTMLElement>('[data-role="active-file-name"]');
  const processButton = q<HTMLButtonElement>('[data-role="process-batch"]');
  const downloadButton = q<HTMLButtonElement>('[data-role="download-batch"]');
  const progress = q<HTMLElement>('[data-role="batch-progress"]');
  const progressBar = q<HTMLProgressElement>('[data-role="progress-bar"]');
  const progressCount = q<HTMLElement>('[data-role="progress-count"]');
  const cancelButton = q<HTMLButtonElement>('[data-role="cancel-batch"]');
  const outputFormat = q<HTMLSelectElement>('[data-role="output-format"]');
  const outputQuality = q<HTMLInputElement>('[data-role="output-quality"]');
  const qualityValue = q<HTMLOutputElement>('[data-role="quality-value"]');
  const logoInput = q<HTMLInputElement>('[data-role="logo-input"]');
  const logoName = q<HTMLElement>('[data-role="logo-name"]');
  const removeLogo = q<HTMLButtonElement>('[data-role="remove-logo"]');
  if (!fileInput || !queue || !canvas || !processButton || !downloadButton || !outputFormat || !outputQuality) {
    throw new Error('Add Watermark editor markup is incomplete.');
  }

  const maxFiles = Number(root.dataset.maxFiles || '50');
  const maxFileBytes = Number(root.dataset.maxFileBytes || String(10 * 1024 * 1024));
  const maxPixels = Number(root.dataset.maxPixels || '20000000');
  const maxDimension = Number(root.dataset.maxDimension || '12000');

  const state = {
    items: [] as WatermarkItem[],
    activeId: '' as string,
    scope: 'shared' as Scope,
    shared: {
      mode: 'text',
      text: 'Your watermark',
      color: '#ffffff',
      opacity: 65,
      textSize: 6,
      logoSize: 22,
      x: 84,
      y: 88,
    } as WatermarkSettings,
    format: 'source' as OutputChoice,
    quality: 90,
    qualityTouched: false,
    processing: false,
    cancelled: false,
    logoFile: undefined as File | undefined,
    logoBitmap: undefined as ImageBitmap | undefined,
    previewBitmap: undefined as ImageBitmap | undefined,
    previewItemId: '',
    overlay: undefined as Bounds | undefined,
    renderVersion: 0,
  };

  let previewFrame = 0;
  let dragging = false;

  const activeItem = (): WatermarkItem | undefined => state.items.find((item) => item.id === state.activeId) ?? state.items[0];

  function ensureItemSettings(item: WatermarkItem): WatermarkSettings {
    item.settings ??= cloneSettings(state.shared);
    return item.settings;
  }

  function activeSettings(): WatermarkSettings {
    const item = activeItem();
    return state.scope === 'individual' && item ? ensureItemSettings(item) : state.shared;
  }

  function setNotice(message = '', type: 'error' | 'info' = 'info'): void {
    if (!notice) return;
    notice.hidden = !message;
    notice.dataset.type = type;
    notice.textContent = message;
  }

  function invalidateResults(): void {
    for (const item of state.items) {
      item.result = undefined;
      item.resultName = undefined;
    }
    downloadButton.disabled = true;
    downloadButton.textContent = state.items.length > 1 ? 'Download ZIP' : 'Download image';
  }

  function schedulePreview(): void {
    if (previewFrame) return;
    previewFrame = requestAnimationFrame(() => {
      previewFrame = 0;
      renderPreview().catch((error) => setNotice(error instanceof Error ? error.message : 'Unable to render preview.', 'error'));
    });
  }

  async function ensurePreviewBitmap(item: WatermarkItem): Promise<ImageBitmap> {
    if (state.previewBitmap && state.previewItemId === item.id) return state.previewBitmap;
    state.previewBitmap?.close();
    state.previewBitmap = await createImageBitmap(item.file);
    state.previewItemId = item.id;
    return state.previewBitmap;
  }

  function updateModeGroups(settings: WatermarkSettings): void {
    root.querySelectorAll<HTMLButtonElement>('[data-watermark-mode]').forEach((button) => {
      const active = button.dataset.watermarkMode === settings.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', String(active));
    });
    root.querySelectorAll<HTMLElement>('[data-watermark-group]').forEach((group) => {
      group.hidden = group.dataset.watermarkGroup !== settings.mode;
    });
  }

  function syncControls(): void {
    const settings = activeSettings();
    updateModeGroups(settings);
    const text = q<HTMLInputElement>('[data-setting="watermarkText"]');
    const color = q<HTMLInputElement>('[data-setting="watermarkColor"]');
    const size = q<HTMLInputElement>('[data-setting="watermarkSize"]');
    const logoSize = q<HTMLInputElement>('[data-setting="watermarkLogoSize"]');
    const opacity = q<HTMLInputElement>('[data-setting="watermarkOpacity"]');
    if (text) text.value = settings.text;
    if (color) color.value = settings.color;
    if (size) size.value = String(settings.textSize);
    if (logoSize) logoSize.value = String(settings.logoSize);
    if (opacity) opacity.value = String(settings.opacity);
    const sizeOut = q<HTMLOutputElement>('[data-output-for="watermarkSize"]');
    const logoOut = q<HTMLOutputElement>('[data-output-for="watermarkLogoSize"]');
    const opacityOut = q<HTMLOutputElement>('[data-output-for="watermarkOpacity"]');
    if (sizeOut) sizeOut.value = `${settings.textSize}%`;
    if (logoOut) logoOut.value = `${settings.logoSize}%`;
    if (opacityOut) opacityOut.value = `${settings.opacity}%`;
    if (activeName) activeName.textContent = activeItem()?.file.name ?? 'No image selected';
    if (logoName) logoName.textContent = state.logoFile?.name ?? 'No logo selected';
    if (removeLogo) removeLogo.hidden = !state.logoFile;

    root.querySelectorAll<HTMLButtonElement>('[data-edit-scope]').forEach((button) => {
      const active = button.dataset.editScope === state.scope;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-checked', String(active));
      button.setAttribute('aria-pressed', String(active));
    });

    outputFormat.value = state.format;
    outputQuality.value = String(state.quality);
    if (qualityValue) qualityValue.value = String(state.quality);
    const qualityDisabled = state.format === 'png';
    outputQuality.disabled = qualityDisabled;
    outputQuality.closest('label')?.classList.toggle('is-quality-disabled', qualityDisabled);
  }

  function renderQueue(): void {
    queue.innerHTML = '';
    for (const item of state.items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `watermark-file-card${item.id === state.activeId ? ' is-active' : ''}`;
      button.dataset.itemId = item.id;
      const img = document.createElement('img');
      img.src = item.url;
      img.alt = '';
      const copy = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = item.file.name;
      const small = document.createElement('small');
      small.textContent = item.result ? 'Ready to download' : state.scope === 'individual' && item.settings ? 'Custom setup' : 'Shared setup';
      copy.append(strong, small);
      const remove = document.createElement('span');
      remove.className = 'watermark-file-card__remove';
      remove.dataset.removeItem = item.id;
      remove.setAttribute('aria-label', `Remove ${item.file.name}`);
      remove.textContent = '×';
      button.append(img, copy, remove);
      queue.append(button);
    }
    if (batchCount) batchCount.textContent = String(state.items.length);
    root.dataset.hasItems = state.items.length ? 'true' : 'false';
    processButton.disabled = state.items.length === 0 || state.processing;
    renderActionState();
  }

  function renderActionState(): void {
    const completed = state.items.filter((item) => item.result).length;
    downloadButton.disabled = completed === 0 || state.processing;
    downloadButton.textContent = completed > 1 ? 'Download ZIP' : 'Download image';
    const ready = q<HTMLElement>('[data-role="ready-count"]');
    if (ready) ready.textContent = completed ? `${completed}/${state.items.length} watermarked` : `${state.items.length} image${state.items.length === 1 ? '' : 's'} ready`;
  }

  async function renderPreview(): Promise<void> {
    const item = activeItem();
    const version = ++state.renderVersion;
    if (!item) {
      state.overlay = undefined;
      canvas.hidden = true;
      if (previewEmpty) previewEmpty.hidden = false;
      if (previewMeta) previewMeta.textContent = '';
      return;
    }
    const bitmap = await ensurePreviewBitmap(item);
    if (version !== state.renderVersion) return;
    const scale = Math.min(1, 1100 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas preview is unavailable.');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    state.overlay = drawWatermark(context, canvas.width, canvas.height, activeSettings(), state.logoBitmap);
    canvas.hidden = false;
    if (previewEmpty) previewEmpty.hidden = true;
    if (previewMeta) previewMeta.textContent = `${bitmap.width} × ${bitmap.height}`;
  }

  async function validateAndAdd(files: File[]): Promise<void> {
    setNotice();
    const remaining = Math.max(0, maxFiles - state.items.length);
    const accepted = files.slice(0, remaining);
    let rejected = 0;

    for (const file of accepted) {
      if (!ACCEPTED.has(file.type) || file.size > maxFileBytes) {
        rejected += 1;
        continue;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const invalid = bitmap.width > maxDimension || bitmap.height > maxDimension || bitmap.width * bitmap.height > maxPixels;
        bitmap.close();
        if (invalid) {
          rejected += 1;
          continue;
        }
        state.items.push({ id: crypto.randomUUID(), file, url: URL.createObjectURL(file) });
      } catch {
        rejected += 1;
      }
    }

    if (!state.activeId && state.items[0]) state.activeId = state.items[0].id;
    if (files.length > remaining) rejected += files.length - remaining;
    if (rejected) setNotice(`${rejected} file${rejected === 1 ? '' : 's'} skipped because of format, size, dimension, or batch limits.`, 'info');
    invalidateResults();
    renderQueue();
    syncControls();
    schedulePreview();
  }

  async function setLogo(file?: File): Promise<void> {
    if (!file) return;
    if (!ACCEPTED.has(file.type) || file.size > 5 * 1024 * 1024) {
      setNotice('Logo must be PNG, JPG or WebP and 5 MB or smaller.', 'error');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      state.logoBitmap?.close();
      state.logoBitmap = bitmap;
      state.logoFile = file;
      activeSettings().mode = 'logo';
      invalidateResults();
      syncControls();
      schedulePreview();
      setNotice();
    } catch {
      setNotice('Unable to read this logo image.', 'error');
    }
  }

  function removeItem(id: string): void {
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    const [item] = state.items.splice(index, 1);
    URL.revokeObjectURL(item.url);
    if (state.previewItemId === id) {
      state.previewBitmap?.close();
      state.previewBitmap = undefined;
      state.previewItemId = '';
    }
    if (state.activeId === id) state.activeId = state.items[Math.min(index, state.items.length - 1)]?.id ?? '';
    invalidateResults();
    renderQueue();
    syncControls();
    schedulePreview();
  }

  function applySetting(input: HTMLInputElement): void {
    const settings = activeSettings();
    const key = input.dataset.setting;
    if (key === 'watermarkText') settings.text = input.value;
    else if (key === 'watermarkColor') settings.color = input.value;
    else if (key === 'watermarkSize') settings.textSize = Number(input.value);
    else if (key === 'watermarkLogoSize') settings.logoSize = Number(input.value);
    else if (key === 'watermarkOpacity') settings.opacity = Number(input.value);
    else return;
    invalidateResults();
    syncControls();
    schedulePreview();
  }

  async function renderOutput(item: WatermarkItem, settings: WatermarkSettings): Promise<{ blob: Blob; name: string }> {
    const bitmap = await createImageBitmap(item.file);
    try {
      const { canvas: output, context } = canvas2d(bitmap.width, bitmap.height);
      context.drawImage(bitmap, 0, 0);
      drawWatermark(context, output.width, output.height, settings, state.logoBitmap);
      const type = outputMime(state.format, item.file);
      const quality = state.qualityTouched ? state.quality : defaultQualityForImageOutput(type, 90);
      const blob = await encodeCanvas(output, { type, quality: quality / 100 });
      return { blob, name: outputName(item.file, type) };
    } finally {
      bitmap.close();
    }
  }

  function updateProgress(completed: number, total: number): void {
    if (!progress) return;
    progress.hidden = total === 0;
    if (progressBar) progressBar.value = total ? Math.round(completed / total * 100) : 0;
    if (progressCount) progressCount.textContent = `${completed} / ${total}`;
  }

  async function processBatch(): Promise<void> {
    if (state.processing || !state.items.length) return;
    const current = activeSettings();
    if (current.mode === 'text' && !current.text.trim()) {
      setNotice('Enter watermark text before processing.', 'error');
      return;
    }
    if (current.mode === 'logo' && !state.logoBitmap) {
      setNotice('Choose a logo image before processing.', 'error');
      return;
    }

    state.processing = true;
    state.cancelled = false;
    processButton.disabled = true;
    processButton.textContent = 'Adding watermark…';
    if (cancelButton) cancelButton.disabled = false;
    downloadButton.disabled = true;
    updateProgress(0, state.items.length);
    setNotice();

    let completed = 0;
    for (const item of state.items) {
      if (state.cancelled) break;
      try {
        const settings = state.scope === 'individual' ? ensureItemSettings(item) : state.shared;
        if (settings.mode === 'logo' && !state.logoBitmap) throw new Error('Logo image is missing.');
        if (settings.mode === 'text' && !settings.text.trim()) throw new Error('Watermark text is empty.');
        const result = await renderOutput(item, settings);
        item.result = result.blob;
        item.resultName = result.name;
      } catch (error) {
        item.result = undefined;
        item.resultName = undefined;
        setNotice(error instanceof Error ? error.message : 'One image could not be processed.', 'error');
      }
      completed += 1;
      updateProgress(completed, state.items.length);
      renderQueue();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    state.processing = false;
    processButton.disabled = state.items.length === 0;
    processButton.textContent = 'Add watermark';
    if (cancelButton) cancelButton.disabled = true;
    if (progress) progress.hidden = true;
    renderQueue();
  }

  async function downloadResults(): Promise<void> {
    const results = state.items.filter((item): item is WatermarkItem & { result: Blob; resultName: string } => Boolean(item.result && item.resultName));
    if (!results.length) return;
    if (results.length === 1) {
      downloadBlob(results[0].result, results[0].resultName);
      return;
    }
    const zip = await createZipBlob(results.map((item) => ({ filename: item.resultName, blob: item.result })));
    downloadBlob(zip, `watermarked-images-${results.length}.zip`);
  }

  function pointerPoint(event: PointerEvent): { x: number; y: number } {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * canvas.width / Math.max(1, rect.width),
      y: (event.clientY - rect.top) * canvas.height / Math.max(1, rect.height),
    };
  }

  function contains(bounds: Bounds | undefined, point: { x: number; y: number }): boolean {
    return Boolean(bounds && point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height);
  }

  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files ?? []);
    fileInput.value = '';
    validateAndAdd(files).catch((error) => setNotice(error instanceof Error ? error.message : 'Unable to add images.', 'error'));
  });

  const dropzone = q<HTMLElement>('[data-role="batch-dropzone"]');
  dropzone?.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropzone.classList.add('is-dragging');
  });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'));
  dropzone?.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('is-dragging');
    validateAndAdd(Array.from(event.dataTransfer?.files ?? [])).catch((error) => setNotice(error instanceof Error ? error.message : 'Unable to add images.', 'error'));
  });

  queue.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const remove = target.closest<HTMLElement>('[data-remove-item]');
    if (remove?.dataset.removeItem) {
      event.stopPropagation();
      removeItem(remove.dataset.removeItem);
      return;
    }
    const card = target.closest<HTMLElement>('[data-item-id]');
    if (!card?.dataset.itemId) return;
    state.activeId = card.dataset.itemId;
    state.previewBitmap?.close();
    state.previewBitmap = undefined;
    state.previewItemId = '';
    renderQueue();
    syncControls();
    schedulePreview();
  });

  root.querySelectorAll<HTMLButtonElement>('[data-watermark-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.watermarkMode as WatermarkMode;
      if (mode !== 'text' && mode !== 'logo') return;
      activeSettings().mode = mode;
      invalidateResults();
      syncControls();
      schedulePreview();
    });
  });

  root.querySelectorAll<HTMLInputElement>('[data-setting^="watermark"]').forEach((input) => {
    input.addEventListener('input', () => applySetting(input));
    input.addEventListener('change', () => applySetting(input));
  });

  root.querySelectorAll<HTMLButtonElement>('[data-edit-scope]').forEach((button) => {
    button.addEventListener('click', () => {
      const scope = button.dataset.editScope as Scope;
      if (scope === state.scope) return;
      if (scope === 'individual') {
        for (const item of state.items) ensureItemSettings(item);
        state.scope = 'individual';
      } else if (scope === 'shared') {
        const current = activeItem();
        if (current) state.shared = cloneSettings(ensureItemSettings(current));
        state.scope = 'shared';
      }
      invalidateResults();
      syncControls();
      renderQueue();
      schedulePreview();
    });
  });

  logoInput?.addEventListener('change', () => {
    const file = logoInput.files?.[0];
    logoInput.value = '';
    setLogo(file).catch((error) => setNotice(error instanceof Error ? error.message : 'Unable to load logo.', 'error'));
  });

  removeLogo?.addEventListener('click', () => {
    state.logoBitmap?.close();
    state.logoBitmap = undefined;
    state.logoFile = undefined;
    if (activeSettings().mode === 'logo') activeSettings().mode = 'text';
    invalidateResults();
    syncControls();
    schedulePreview();
  });

  outputFormat.addEventListener('change', () => {
    state.format = outputFormat.value as OutputChoice;
    state.qualityTouched = false;
    if (state.format === 'webp') state.quality = defaultQualityForImageOutput('webp');
    else if (state.format === 'jpg') state.quality = defaultQualityForImageOutput('jpg');
    else state.quality = 90;
    invalidateResults();
    syncControls();
  });

  outputQuality.addEventListener('input', () => {
    state.quality = Number(outputQuality.value);
    state.qualityTouched = true;
    invalidateResults();
    syncControls();
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (!contains(state.overlay, pointerPoint(event))) return;
    dragging = true;
    canvas.classList.add('is-dragging');
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    const point = pointerPoint(event);
    const settings = activeSettings();
    const halfX = state.overlay ? state.overlay.width / 2 / canvas.width * 100 : 0;
    const halfY = state.overlay ? state.overlay.height / 2 / canvas.height * 100 : 0;
    settings.x = clamp(point.x / canvas.width * 100, halfX, 100 - halfX);
    settings.y = clamp(point.y / canvas.height * 100, halfY, 100 - halfY);
    invalidateResults();
    schedulePreview();
  });

  const stopDrag = (event: PointerEvent): void => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);

  processButton.addEventListener('click', () => {
    processBatch().catch((error) => {
      state.processing = false;
      processButton.textContent = 'Add watermark';
      processButton.disabled = state.items.length === 0;
      setNotice(error instanceof Error ? error.message : 'Unable to process images.', 'error');
    });
  });
  downloadButton.addEventListener('click', () => {
    downloadResults().catch((error) => setNotice(error instanceof Error ? error.message : 'Unable to prepare download.', 'error'));
  });
  cancelButton?.addEventListener('click', () => {
    state.cancelled = true;
    cancelButton.disabled = true;
  });

  window.addEventListener('pagehide', () => {
    if (previewFrame) cancelAnimationFrame(previewFrame);
    state.previewBitmap?.close();
    state.logoBitmap?.close();
    for (const item of state.items) URL.revokeObjectURL(item.url);
  }, { once: true });

  syncControls();
  renderQueue();
  schedulePreview();
}
