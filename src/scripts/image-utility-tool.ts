import JSZip from 'jszip';
import { ImageWorkerClient } from '../engines/image/worker-client';
import type { ImageTransformOptions } from '../engines/image/protocol';

type UtilityMode = 'resize' | 'compress' | 'rotate' | 'crop' | 'background' | 'blur';
type ItemStatus = 'ready' | 'processing' | 'success' | 'error';

interface UtilityItem {
  id: string;
  file: File;
  width: number;
  height: number;
  status: ItemStatus;
  error?: string;
  result?: Blob;
  resultName?: string;
  resultWidth?: number;
  resultHeight?: number;
}

const MAX_FILES = 50;
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const MAX_DIMENSION = 12_000;
const MAX_PIXELS = 20_000_000;
const ACCEPTED = new Set(['jpg', 'jpeg', 'png', 'webp']);
const MODE_LABEL: Record<UtilityMode, string> = {
  resize: 'Resizing', compress: 'Compressing', rotate: 'Rotating', crop: 'Cropping', background: 'Processing', blur: 'Blurring',
};
const RESULT_SUFFIX: Record<UtilityMode, string> = {
  resize: 'resized', compress: 'compressed', rotate: 'rotated', crop: 'cropped', background: 'background', blur: 'blurred',
};

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
const extensionOf = (name: string): string => { const index = name.lastIndexOf('.'); return index < 0 ? '' : name.slice(index + 1).toLowerCase(); };
const normalizedFormat = (file: File): string => extensionOf(file.name) === 'jpeg' ? 'jpg' : extensionOf(file.name);
const mimeFor = (format: string): string => format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
const baseName = (name: string): string => name.replace(/\.[^.]+$/, '') || 'image';
const fingerprint = (file: File): string => `${file.name}\u0000${file.size}\u0000${file.lastModified}`;

async function readDimensions(file: File): Promise<{ width: number; height: number }> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { const value = { width: image.naturalWidth, height: image.naturalHeight }; URL.revokeObjectURL(url); resolve(value); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Unable to read image dimensions')); };
    image.src = url;
  });
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}

function targetDimensions(item: UtilityItem, root: HTMLElement): { width: number; height: number } {
  const resizeMode = root.querySelector<HTMLSelectElement>('[data-role="resize-mode"]')?.value ?? 'box';
  if (resizeMode === 'percent') {
    const percent = Number(root.querySelector<HTMLInputElement>('[data-role="percent"]')?.value ?? 50);
    if (!Number.isFinite(percent) || percent < 1 || percent > 400) throw new Error('Scale must be between 1% and 400%');
    const width = Math.max(1, Math.round(item.width * percent / 100));
    const height = Math.max(1, Math.round(item.height * percent / 100));
    if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) throw new Error('Target dimensions exceed the browser safety limit');
    return { width, height };
  }
  const width = Number(root.querySelector<HTMLInputElement>('[data-role="width"]')?.value ?? 0);
  const height = Number(root.querySelector<HTMLInputElement>('[data-role="height"]')?.value ?? 0);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > MAX_DIMENSION || height > MAX_DIMENSION) throw new Error('Width and height must be between 1 and 12,000 px');
  const locked = root.querySelector<HTMLInputElement>('[data-role="lock"]')?.checked ?? true;
  if (!locked) {
    const exact = { width: Math.round(width), height: Math.round(height) };
    if (exact.width * exact.height > MAX_PIXELS) throw new Error('Target dimensions exceed 20 megapixels');
    return exact;
  }
  const scale = Math.min(width / item.width, height / item.height);
  const target = { width: Math.max(1, Math.round(item.width * scale)), height: Math.max(1, Math.round(item.height * scale)) };
  if (target.width * target.height > MAX_PIXELS) throw new Error('Target dimensions exceed 20 megapixels');
  return target;
}

function cropDimensions(item: UtilityItem, root: HTMLElement): { width: number; height: number } {
  const cropMode = root.querySelector<HTMLSelectElement>('[data-role="crop-mode"]')?.value ?? 'ratio';
  if (cropMode === 'exact') {
    const width = Math.round(Number(root.querySelector<HTMLInputElement>('[data-role="crop-width"]')?.value ?? 0));
    const height = Math.round(Number(root.querySelector<HTMLInputElement>('[data-role="crop-height"]')?.value ?? 0));
    if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) throw new Error('Crop width and height must be positive numbers');
    if (width > item.width || height > item.height) throw new Error(`Crop ${width}×${height} is larger than this ${item.width}×${item.height} image`);
    return { width, height };
  }
  const ratioValue = root.querySelector<HTMLSelectElement>('[data-role="crop-ratio"]')?.value ?? '1:1';
  const [ratioWidth, ratioHeight] = ratioValue.split(':').map(Number);
  const ratio = ratioWidth / ratioHeight;
  if (!Number.isFinite(ratio) || ratio <= 0) throw new Error('Invalid crop ratio');
  const sourceRatio = item.width / item.height;
  if (sourceRatio > ratio) return { width: Math.max(1, Math.round(item.height * ratio)), height: item.height };
  return { width: item.width, height: Math.max(1, Math.round(item.width / ratio)) };
}

function initImageUtility(root: HTMLElement): void {
  if (root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';

  const mode = (root.dataset.mode ?? 'resize') as UtilityMode;
  const client = new ImageWorkerClient();
  const input = root.querySelector<HTMLInputElement>('[data-role="file-input"]')!;
  const dropzone = root.querySelector<HTMLElement>('[data-role="dropzone"]')!;
  const workspace = root.querySelector<HTMLElement>('[data-role="workspace"]')!;
  const list = root.querySelector<HTMLElement>('[data-role="list"]')!;
  const summary = root.querySelector<HTMLElement>('[data-role="summary"]')!;
  const notice = root.querySelector<HTMLElement>('[data-role="notice"]')!;
  const progress = root.querySelector<HTMLElement>('[data-role="progress"]')!;
  const progressText = root.querySelector<HTMLElement>('[data-role="progress-text"]')!;
  const progressBar = root.querySelector<HTMLElement>('[data-role="progress-bar"]')!;
  const downloads = root.querySelector<HTMLElement>('[data-role="downloads"]')!;
  const resultSummary = root.querySelector<HTMLElement>('[data-role="result-summary"]')!;
  const runButton = root.querySelector<HTMLButtonElement>('[data-role="run"]')!;
  const cancelButton = root.querySelector<HTMLButtonElement>('[data-role="cancel"]')!;
  const chooseButton = root.querySelector<HTMLButtonElement>('[data-role="choose"]')!;
  const addButton = root.querySelector<HTMLButtonElement>('[data-role="add"]')!;
  const clearButton = root.querySelector<HTMLButtonElement>('[data-role="clear"]')!;
  const downloadAllButton = root.querySelector<HTMLButtonElement>('[data-role="download-all"]')!;
  const quality = root.querySelector<HTMLInputElement>('[data-role="quality"]');
  const qualityValue = root.querySelector<HTMLElement>('[data-role="quality-value"]');
  const blurStrength = root.querySelector<HTMLInputElement>('[data-role="blur-strength"]');
  const blurValue = root.querySelector<HTMLElement>('[data-role="blur-value"]');
  const resizeMode = root.querySelector<HTMLSelectElement>('[data-role="resize-mode"]');
  const dimensionControls = root.querySelector<HTMLElement>('[data-role="dimension-controls"]');
  const lockControl = root.querySelector<HTMLElement>('[data-role="lock-control"]');
  const percentControl = root.querySelector<HTMLElement>('[data-role="percent-control"]');
  const cropMode = root.querySelector<HTMLSelectElement>('[data-role="crop-mode"]');
  const cropRatioControl = root.querySelector<HTMLElement>('[data-role="crop-ratio-control"]');
  const cropExactControl = root.querySelector<HTMLElement>('[data-role="crop-exact-control"]');
  const cropInteractive = root.querySelector<HTMLElement>('[data-role="crop-interactive"]');
  const cropPreview = root.querySelector<HTMLElement>('[data-role="crop-preview"]');
  const cropPreviewImage = root.querySelector<HTMLImageElement>('[data-role="crop-preview-image"]');
  const cropWindow = root.querySelector<HTMLElement>('[data-role="crop-window"]');
  const cropPositionLabel = root.querySelector<HTMLElement>('[data-role="crop-position-label"]');
  const backgroundMode = root.querySelector<HTMLSelectElement>('[data-role="background-mode"]');
  const backgroundColorControl = root.querySelector<HTMLElement>('[data-role="background-color-control"]');
  const backgroundColor = root.querySelector<HTMLInputElement>('[data-role="background-color"]');
  const backgroundHex = root.querySelector<HTMLInputElement>('[data-role="background-hex"]');
  const backgroundHint = root.querySelector<HTMLElement>('[data-role="background-hint"]');
  const outputSelect = root.querySelector<HTMLSelectElement>('[data-role="output"]');
  const settingInputs = Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-role="settings"] input, [data-role="settings"] select'));
  const presetButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('.utility-presets button'));
  let items: UtilityItem[] = [];
  let busy = false;
  let cancelRequested = false;
  let cropOffsetX = 0.5;
  let cropOffsetY = 0.5;
  let cropPreviewUrl: string | undefined;
  let cropPreviewItemId: string | undefined;
  let dragActive = false;
  let dragDx = 0;
  let dragDy = 0;

  const successful = (): UtilityItem[] => items.filter((item) => item.status === 'success' && item.result && item.resultName);
  const pendingItems = (): UtilityItem[] => items.filter((item) => item.status === 'ready' || item.status === 'error');
  const showNotice = (message: string, tone: 'info' | 'warning' | 'success' = 'info'): void => {
    notice.textContent = message;
    notice.hidden = false;
    notice.classList.toggle('is-warning', tone === 'warning');
    notice.classList.toggle('is-success', tone === 'success');
  };
  const hideNotice = (): void => { notice.hidden = true; notice.textContent = ''; notice.classList.remove('is-warning', 'is-success'); };
  const updateSummary = (): void => {
    const bytes = items.reduce((sum, item) => sum + item.file.size, 0);
    summary.textContent = `${items.length} ${items.length === 1 ? 'image' : 'images'} · ${formatBytes(bytes)}`;
  };

  const revokeCropPreview = (): void => {
    if (cropPreviewUrl) URL.revokeObjectURL(cropPreviewUrl);
    cropPreviewUrl = undefined;
    cropPreviewItemId = undefined;
  };

  const cropPositionName = (): string => {
    const horizontal = cropOffsetX < 0.2 ? 'Left' : cropOffsetX > 0.8 ? 'Right' : 'Center';
    const vertical = cropOffsetY < 0.2 ? 'Top' : cropOffsetY > 0.8 ? 'Bottom' : 'Center';
    if (horizontal === 'Center' && vertical === 'Center') return 'Center';
    if (horizontal === 'Center') return vertical;
    if (vertical === 'Center') return horizontal;
    return `${vertical} ${horizontal}`;
  };

  const updateCropPreview = (): void => {
    if (mode !== 'crop' || !cropInteractive || !cropPreview || !cropPreviewImage || !cropWindow) return;
    const item = items[0];
    if (!item) { cropInteractive.hidden = true; revokeCropPreview(); return; }
    cropInteractive.hidden = false;
    if (cropPreviewItemId !== item.id) {
      revokeCropPreview();
      cropPreviewUrl = URL.createObjectURL(item.file);
      cropPreviewItemId = item.id;
      cropPreviewImage.src = cropPreviewUrl;
    }
    cropPreview.style.aspectRatio = `${item.width} / ${item.height}`;
    try {
      const crop = cropDimensions(item, root);
      const widthRatio = crop.width / item.width;
      const heightRatio = crop.height / item.height;
      const leftRatio = (1 - widthRatio) * cropOffsetX;
      const topRatio = (1 - heightRatio) * cropOffsetY;
      cropWindow.style.width = `${widthRatio * 100}%`;
      cropWindow.style.height = `${heightRatio * 100}%`;
      cropWindow.style.left = `${leftRatio * 100}%`;
      cropWindow.style.top = `${topRatio * 100}%`;
      if (cropPositionLabel) cropPositionLabel.textContent = `${cropPositionName()} · ${crop.width}×${crop.height}`;
    } catch (error) {
      cropWindow.style.width = '0';
      cropWindow.style.height = '0';
      if (cropPositionLabel) cropPositionLabel.textContent = error instanceof Error ? error.message : 'Invalid crop';
    }
  };

  const syncBackgroundMode = (): void => {
    if (!backgroundMode || !outputSelect) return;
    const preserve = backgroundMode.value === 'preserve';
    if (backgroundColorControl) backgroundColorControl.hidden = preserve;
    const jpg = Array.from(outputSelect.options).find((option) => option.value === 'jpg');
    if (jpg) jpg.disabled = preserve;
    if (preserve && outputSelect.value === 'jpg') outputSelect.value = 'png';
    if (backgroundHint) backgroundHint.textContent = preserve
      ? 'PNG and WebP can preserve existing transparency. This does not remove an existing opaque background.'
      : 'Fill mode composites transparent pixels onto the selected color. Existing opaque pixels are not recolored.';
  };

  const invalidateResults = (): void => {
    if (busy) return;
    let changed = false;
    for (const item of items) {
      if (item.status === 'success' || item.status === 'error') {
        item.status = 'ready'; item.error = undefined; item.result = undefined; item.resultName = undefined; item.resultWidth = undefined; item.resultHeight = undefined; changed = true;
      }
    }
    if (changed) {
      downloads.hidden = true;
      showNotice('Settings changed. Process the batch again to create updated results.');
      render();
    }
  };

  const removeItem = (id: string): void => {
    if (busy) return;
    items = items.filter((candidate) => candidate.id !== id);
    if (!items.length) reset();
    else { updateSummary(); render(); updateCropPreview(); }
  };

  const render = (): void => {
    list.replaceChildren();
    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'image-utility-row';
      const copy = document.createElement('div');
      copy.className = 'image-utility-row-copy';
      const name = document.createElement('strong');
      name.textContent = `${String(index + 1).padStart(2, '0')}  ${item.file.name}`;
      const meta = document.createElement('span');
      const resultMeta = item.result ? ` → ${item.resultWidth ?? item.width}×${item.resultHeight ?? item.height} · ${formatBytes(item.result.size)}` : '';
      meta.textContent = `${item.width}×${item.height} · ${formatBytes(item.file.size)}${resultMeta}`;
      copy.append(name, meta);
      const status = document.createElement('span');
      status.className = `image-utility-row-status${item.status === 'success' ? ' is-success' : item.status === 'error' ? ' is-error' : ''}`;
      status.textContent = item.status === 'processing' ? 'Processing…' : item.status === 'success' ? 'Done' : item.status === 'error' ? (item.error ?? 'Failed') : 'Ready';
      const actions = document.createElement('div');
      actions.className = 'image-utility-row-actions';
      if (item.status === 'success' && item.result && item.resultName) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Download'; button.addEventListener('click', () => downloadBlob(item.result!, item.resultName!)); actions.append(button);
      } else if (item.status === 'error') {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Retry'; button.disabled = busy; button.addEventListener('click', () => { void run([item]); }); actions.append(button);
      }
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = 'Remove'; remove.className = 'is-muted'; remove.disabled = busy; remove.addEventListener('click', () => removeItem(item.id)); actions.append(remove);
      row.append(copy, status, actions); list.append(row);
    });
    const done = successful();
    downloads.hidden = done.length === 0 || busy;
    if (done.length) {
      const originalBytes = done.reduce((sum, item) => sum + item.file.size, 0);
      const resultBytes = done.reduce((sum, item) => sum + (item.result?.size ?? 0), 0);
      const delta = originalBytes > 0 ? Math.round((1 - resultBytes / originalBytes) * 100) : 0;
      resultSummary.textContent = mode === 'compress'
        ? `${done.length} completed · ${formatBytes(originalBytes)} → ${formatBytes(resultBytes)}${delta > 0 ? ` · ${delta}% smaller` : delta < 0 ? ` · ${Math.abs(delta)}% larger` : ''}`
        : `${done.length} completed · ready to download`;
      downloadAllButton.hidden = done.length < 2;
    }
    runButton.disabled = busy || pendingItems().length === 0;
  };

  const setBusy = (value: boolean): void => {
    busy = value;
    runButton.disabled = value || pendingItems().length === 0;
    cancelButton.hidden = !value; cancelButton.disabled = !value; addButton.disabled = value; clearButton.disabled = value;
    for (const element of settingInputs) element.disabled = value;
    for (const button of presetButtons) button.disabled = value;
  };

  const reset = (): void => {
    if (busy) client.reset('Image utility reset');
    busy = false; cancelRequested = false; items = []; input.value = ''; dropzone.hidden = false; workspace.hidden = true; progress.hidden = true; downloads.hidden = true; cancelButton.hidden = true;
    cropOffsetX = 0.5; cropOffsetY = 0.5; revokeCropPreview(); hideNotice(); setBusy(false); render(); updateCropPreview();
  };

  const addFiles = async (files: File[]): Promise<void> => {
    if (busy || !files.length) return;
    const existing = new Set(items.map((item) => fingerprint(item.file)));
    let totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
    const skipped = { duplicate: 0, unsupported: 0, tooLarge: 0, batchLimit: 0, totalLimit: 0, dimensions: 0, unreadable: 0 };
    let added = 0;
    for (const file of files) {
      if (items.length >= MAX_FILES) { skipped.batchLimit += 1; continue; }
      if (existing.has(fingerprint(file))) { skipped.duplicate += 1; continue; }
      if (!ACCEPTED.has(extensionOf(file.name))) { skipped.unsupported += 1; continue; }
      if (file.size > MAX_FILE_BYTES) { skipped.tooLarge += 1; continue; }
      if (totalBytes + file.size > MAX_TOTAL_BYTES) { skipped.totalLimit += 1; continue; }
      try {
        const dimensions = await readDimensions(file);
        if (!dimensions.width || !dimensions.height || dimensions.width > MAX_DIMENSION || dimensions.height > MAX_DIMENSION || dimensions.width * dimensions.height > MAX_PIXELS) { skipped.dimensions += 1; continue; }
        items.push({ id: crypto.randomUUID(), file, width: dimensions.width, height: dimensions.height, status: 'ready' });
        existing.add(fingerprint(file)); totalBytes += file.size; added += 1;
      } catch { skipped.unreadable += 1; }
    }
    if (items.length) { dropzone.hidden = true; workspace.hidden = false; updateSummary(); render(); updateCropPreview(); }
    const skippedTotal = Object.values(skipped).reduce((sum, value) => sum + value, 0);
    if (skippedTotal) {
      const reasons: string[] = [];
      if (skipped.unsupported) reasons.push(`${skipped.unsupported} unsupported`);
      if (skipped.tooLarge) reasons.push(`${skipped.tooLarge} over 20 MB`);
      if (skipped.totalLimit) reasons.push(`${skipped.totalLimit} over the 200 MB batch limit`);
      if (skipped.batchLimit) reasons.push(`${skipped.batchLimit} over the 50-file limit`);
      if (skipped.dimensions) reasons.push(`${skipped.dimensions} over image safety limits`);
      if (skipped.unreadable) reasons.push(`${skipped.unreadable} unreadable`);
      if (skipped.duplicate) reasons.push(`${skipped.duplicate} duplicate`);
      showNotice(`${added ? `${added} added. ` : ''}${skippedTotal} skipped: ${reasons.join(', ')}.`, 'warning');
    } else if (added) showNotice(`${added} ${added === 1 ? 'image' : 'images'} added and ready to process.`, 'success');
  };

  const run = async (requested?: UtilityItem[]): Promise<void> => {
    const targets = (requested ?? pendingItems()).filter((item) => item.status === 'ready' || item.status === 'error');
    if (busy || !targets.length) return;
    cancelRequested = false; setBusy(true); downloads.hidden = true; progress.hidden = false; hideNotice();
    const outputChoice = outputSelect?.value ?? 'same';
    const compressionQuality = Number(quality?.value ?? 80);
    let completed = 0;
    for (const item of targets) {
      if (cancelRequested) break;
      item.status = 'processing'; item.error = undefined; item.result = undefined; item.resultName = undefined; item.resultWidth = undefined; item.resultHeight = undefined; render();
      progressText.textContent = `${MODE_LABEL[mode]} ${completed + 1} of ${targets.length}…`;
      progressBar.style.width = `${Math.round(completed / targets.length * 100)}%`;
      try {
        const sourceFormat = normalizedFormat(item.file);
        const outputFormat = outputChoice !== 'same' ? outputChoice : sourceFormat;
        const options: ImageTransformOptions = {};
        let resultWidth = item.width;
        let resultHeight = item.height;
        if (mode === 'resize') {
          const resize = targetDimensions(item, root); options.resize = resize; resultWidth = resize.width; resultHeight = resize.height;
        } else if (mode === 'rotate') {
          const degrees = Number(root.querySelector<HTMLSelectElement>('[data-role="rotation"]')?.value ?? 90);
          options.rotate = { degrees, flipHorizontal: root.querySelector<HTMLInputElement>('[data-role="flip-horizontal"]')?.checked ?? false, flipVertical: root.querySelector<HTMLInputElement>('[data-role="flip-vertical"]')?.checked ?? false };
          if (Math.abs(degrees) % 180 === 90) { resultWidth = item.height; resultHeight = item.width; }
        } else if (mode === 'crop') {
          const crop = cropDimensions(item, root); options.crop = { ...crop, offsetX: cropOffsetX, offsetY: cropOffsetY }; resultWidth = crop.width; resultHeight = crop.height;
        } else if (mode === 'background') {
          if ((backgroundMode?.value ?? 'fill') === 'fill') {
            const color = (backgroundHex?.value || backgroundColor?.value || '#ffffff').trim();
            if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error('Use a valid 6-digit hex background color');
            options.background = { color, flatten: true };
          }
        } else if (mode === 'blur') {
          const sigma = Number(blurStrength?.value ?? 6);
          if (!Number.isFinite(sigma) || sigma < 0.5 || sigma > 20) throw new Error('Blur strength must be between 0.5 and 20');
          options.blur = { radius: 0, sigma };
        }
        const output = await client.convert(await item.file.arrayBuffer(), sourceFormat, outputFormat, mode === 'compress' ? compressionQuality : 92, options);
        if (cancelRequested) { item.status = 'ready'; break; }
        item.result = new Blob([output], { type: mimeFor(outputFormat) });
        item.resultName = `${baseName(item.file.name)}-${RESULT_SUFFIX[mode]}.${outputFormat}`;
        item.resultWidth = resultWidth; item.resultHeight = resultHeight; item.status = 'success';
      } catch (error) {
        if (cancelRequested) { item.status = 'ready'; item.error = undefined; break; }
        item.status = 'error'; item.error = error instanceof Error ? error.message : 'Processing failed';
      }
      completed += 1; progressBar.style.width = `${Math.round(completed / targets.length * 100)}%`; render();
    }
    setBusy(false);
    if (cancelRequested) {
      progressText.textContent = 'Cancelled. Completed results were kept.';
      showNotice('Processing cancelled. Completed downloads were kept; remaining images are ready to run again.', 'warning');
    } else {
      progressText.textContent = `Finished ${completed} ${completed === 1 ? 'image' : 'images'}`;
      const failed = targets.filter((item) => item.status === 'error').length;
      showNotice(failed ? `${completed - failed} completed, ${failed} failed. Retry failed files individually or adjust settings.` : `${completed} ${completed === 1 ? 'image' : 'images'} completed.`, failed ? 'warning' : 'success');
    }
    window.setTimeout(() => { if (!busy) progress.hidden = true; }, 1400); cancelRequested = false; render();
  };

  const uniqueZipName = (name: string, counts: Map<string, number>): string => {
    const count = counts.get(name) ?? 0; counts.set(name, count + 1); if (count === 0) return name;
    const dot = name.lastIndexOf('.'); const stem = dot > 0 ? name.slice(0, dot) : name; const extension = dot > 0 ? name.slice(dot) : ''; return `${stem}-${count + 1}${extension}`;
  };

  chooseButton.addEventListener('click', (event) => { event.stopPropagation(); input.click(); });
  addButton.addEventListener('click', () => input.click());
  clearButton.addEventListener('click', reset);
  cancelButton.addEventListener('click', () => { if (!busy) return; cancelRequested = true; cancelButton.disabled = true; progressText.textContent = 'Cancelling…'; client.reset('Image processing cancelled'); });
  dropzone.addEventListener('click', () => input.click());
  dropzone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
  dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'));
  dropzone.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('is-dragging'); void addFiles(Array.from(event.dataTransfer?.files ?? [])); });
  input.addEventListener('change', () => { void addFiles(Array.from(input.files ?? [])); input.value = ''; });
  runButton.addEventListener('click', () => { void run(); });

  quality?.addEventListener('input', () => { if (qualityValue) qualityValue.textContent = quality.value; });
  blurStrength?.addEventListener('input', () => { if (blurValue) blurValue.textContent = blurStrength.value; });
  resizeMode?.addEventListener('change', () => {
    const percent = resizeMode.value === 'percent'; if (dimensionControls) dimensionControls.hidden = percent; if (lockControl) lockControl.hidden = percent; if (percentControl) percentControl.hidden = !percent;
  });
  cropMode?.addEventListener('change', () => {
    const exact = cropMode.value === 'exact'; if (cropRatioControl) cropRatioControl.hidden = exact; if (cropExactControl) cropExactControl.hidden = !exact; updateCropPreview();
  });
  backgroundMode?.addEventListener('change', () => { syncBackgroundMode(); invalidateResults(); });
  backgroundColor?.addEventListener('input', () => { if (backgroundHex) backgroundHex.value = backgroundColor.value.toLowerCase(); });
  backgroundHex?.addEventListener('input', () => { if (/^#[0-9a-f]{6}$/i.test(backgroundHex.value) && backgroundColor) backgroundColor.value = backgroundHex.value; });

  for (const element of settingInputs) {
    element.addEventListener('change', () => { if (mode === 'crop') updateCropPreview(); if (mode === 'background') syncBackgroundMode(); invalidateResults(); });
  }

  for (const button of presetButtons) {
    button.addEventListener('click', () => {
      const width = button.dataset.presetWidth; const height = button.dataset.presetHeight; const percent = button.dataset.presetPercent; const presetQuality = button.dataset.presetQuality; const rotation = button.dataset.presetRotation; const flip = button.dataset.presetFlip; const presetBackground = button.dataset.presetBackground; const presetBlur = button.dataset.presetBlur;
      if (width && height) {
        if (resizeMode) resizeMode.value = 'box'; const widthInput = root.querySelector<HTMLInputElement>('[data-role="width"]'); const heightInput = root.querySelector<HTMLInputElement>('[data-role="height"]'); if (widthInput) widthInput.value = width; if (heightInput) heightInput.value = height; if (dimensionControls) dimensionControls.hidden = false; if (lockControl) lockControl.hidden = false; if (percentControl) percentControl.hidden = true;
      }
      if (percent) {
        if (resizeMode) resizeMode.value = 'percent'; const percentInput = root.querySelector<HTMLInputElement>('[data-role="percent"]'); if (percentInput) percentInput.value = percent; if (dimensionControls) dimensionControls.hidden = true; if (lockControl) lockControl.hidden = true; if (percentControl) percentControl.hidden = false;
      }
      if (presetQuality && quality) { quality.value = presetQuality; if (qualityValue) qualityValue.textContent = presetQuality; }
      if (rotation) { const select = root.querySelector<HTMLSelectElement>('[data-role="rotation"]'); if (select) select.value = rotation; }
      if (flip) { const checkbox = root.querySelector<HTMLInputElement>(`[data-role="flip-${flip}"]`); if (checkbox) checkbox.checked = !checkbox.checked; }
      if (presetBackground) { if (backgroundColor) backgroundColor.value = presetBackground; if (backgroundHex) backgroundHex.value = presetBackground; }
      if (presetBlur && blurStrength) { blurStrength.value = presetBlur; if (blurValue) blurValue.textContent = presetBlur; }
      invalidateResults(); updateCropPreview();
    });
  }

  root.querySelectorAll<HTMLButtonElement>('[data-crop-anchor]').forEach((button) => {
    button.addEventListener('click', () => {
      const anchor = button.dataset.cropAnchor ?? 'center';
      const map: Record<string, [number, number]> = { 'top-left':[0,0], top:[0.5,0], 'top-right':[1,0], left:[0,0.5], center:[0.5,0.5], right:[1,0.5], 'bottom-left':[0,1], bottom:[0.5,1], 'bottom-right':[1,1] };
      [cropOffsetX, cropOffsetY] = map[anchor] ?? map.center; updateCropPreview(); invalidateResults();
    });
  });

  cropWindow?.addEventListener('pointerdown', (event) => {
    if (busy || !cropPreview || !cropWindow) return;
    event.preventDefault(); dragActive = true; cropWindow.setPointerCapture(event.pointerId);
    const windowRect = cropWindow.getBoundingClientRect(); dragDx = event.clientX - windowRect.left; dragDy = event.clientY - windowRect.top;
  });
  cropWindow?.addEventListener('pointermove', (event) => {
    if (!dragActive || !cropPreview || !cropWindow) return;
    const previewRect = cropPreview.getBoundingClientRect(); const windowRect = cropWindow.getBoundingClientRect(); const travelX = Math.max(0, previewRect.width - windowRect.width); const travelY = Math.max(0, previewRect.height - windowRect.height);
    const left = clamp(event.clientX - previewRect.left - dragDx, 0, travelX); const top = clamp(event.clientY - previewRect.top - dragDy, 0, travelY);
    cropOffsetX = travelX > 0 ? left / travelX : 0.5; cropOffsetY = travelY > 0 ? top / travelY : 0.5; updateCropPreview();
  });
  const endCropDrag = (): void => { if (!dragActive) return; dragActive = false; invalidateResults(); };
  cropWindow?.addEventListener('pointerup', endCropDrag); cropWindow?.addEventListener('pointercancel', endCropDrag);

  downloadAllButton.addEventListener('click', async () => {
    const done = successful(); if (done.length < 2) return; downloadAllButton.disabled = true;
    try { const zip = new JSZip(); const counts = new Map<string, number>(); for (const item of done) zip.file(uniqueZipName(item.resultName!, counts), item.result!); const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' }); downloadBlob(blob, `${mode}-images.zip`); }
    finally { downloadAllButton.disabled = false; }
  });

  syncBackgroundMode(); render(); updateCropPreview();
}

document.querySelectorAll<HTMLElement>('[data-image-utility]').forEach(initImageUtility);
