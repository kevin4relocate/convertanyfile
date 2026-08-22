import JSZip from 'jszip';
import { ImageWorkerClient } from '../engines/image/worker-client';

type UtilityMode = 'resize' | 'compress';
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
const ACCEPTED = new Set(['jpg', 'jpeg', 'png', 'webp']);

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const extensionOf = (name: string): string => {
  const index = name.lastIndexOf('.');
  return index < 0 ? '' : name.slice(index + 1).toLowerCase();
};

const normalizedFormat = (file: File): string => {
  const ext = extensionOf(file.name);
  return ext === 'jpeg' ? 'jpg' : ext;
};

const mimeFor = (format: string): string => format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
const baseName = (name: string): string => name.replace(/\.[^.]+$/, '') || 'image';

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
    return { width: Math.max(1, Math.round(item.width * percent / 100)), height: Math.max(1, Math.round(item.height * percent / 100)) };
  }

  const width = Number(root.querySelector<HTMLInputElement>('[data-role="width"]')?.value ?? 0);
  const height = Number(root.querySelector<HTMLInputElement>('[data-role="height"]')?.value ?? 0);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width > 12_000 || height > 12_000) throw new Error('Width and height must be between 1 and 12,000 px');
  const locked = root.querySelector<HTMLInputElement>('[data-role="lock"]')?.checked ?? true;
  if (!locked) return { width: Math.round(width), height: Math.round(height) };
  const scale = Math.min(width / item.width, height / item.height);
  return { width: Math.max(1, Math.round(item.width * scale)), height: Math.max(1, Math.round(item.height * scale)) };
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
  const progress = root.querySelector<HTMLElement>('[data-role="progress"]')!;
  const progressText = root.querySelector<HTMLElement>('[data-role="progress-text"]')!;
  const progressBar = root.querySelector<HTMLElement>('[data-role="progress-bar"]')!;
  const downloads = root.querySelector<HTMLElement>('[data-role="downloads"]')!;
  const resultSummary = root.querySelector<HTMLElement>('[data-role="result-summary"]')!;
  const runButton = root.querySelector<HTMLButtonElement>('[data-role="run"]')!;
  const chooseButton = root.querySelector<HTMLButtonElement>('[data-role="choose"]')!;
  const addButton = root.querySelector<HTMLButtonElement>('[data-role="add"]')!;
  const clearButton = root.querySelector<HTMLButtonElement>('[data-role="clear"]')!;
  const downloadAllButton = root.querySelector<HTMLButtonElement>('[data-role="download-all"]')!;
  const quality = root.querySelector<HTMLInputElement>('[data-role="quality"]');
  const qualityValue = root.querySelector<HTMLElement>('[data-role="quality-value"]');
  const resizeMode = root.querySelector<HTMLSelectElement>('[data-role="resize-mode"]');
  const dimensionControls = root.querySelector<HTMLElement>('[data-role="dimension-controls"]');
  const lockControl = root.querySelector<HTMLElement>('[data-role="lock-control"]');
  const percentControl = root.querySelector<HTMLElement>('[data-role="percent-control"]');
  let items: UtilityItem[] = [];
  let busy = false;

  const successful = (): UtilityItem[] => items.filter((item) => item.status === 'success' && item.result && item.resultName);

  const updateSummary = (): void => {
    const bytes = items.reduce((sum, item) => sum + item.file.size, 0);
    summary.textContent = `${items.length} ${items.length === 1 ? 'image' : 'images'} · ${formatBytes(bytes)}`;
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

      const action = document.createElement('button');
      action.type = 'button';
      if (item.status === 'success' && item.result && item.resultName) {
        action.textContent = 'Download';
        action.addEventListener('click', () => downloadBlob(item.result!, item.resultName!));
      } else {
        action.textContent = 'Remove';
        action.disabled = busy;
        action.addEventListener('click', () => {
          items = items.filter((candidate) => candidate.id !== item.id);
          if (!items.length) reset(); else { updateSummary(); render(); }
        });
      }
      row.append(copy, status, action);
      list.append(row);
    });

    const done = successful();
    downloads.hidden = done.length === 0;
    if (done.length) {
      const originalBytes = done.reduce((sum, item) => sum + item.file.size, 0);
      const resultBytes = done.reduce((sum, item) => sum + (item.result?.size ?? 0), 0);
      const delta = originalBytes > 0 ? Math.round((1 - resultBytes / originalBytes) * 100) : 0;
      resultSummary.textContent = mode === 'compress'
        ? `${done.length} completed · ${formatBytes(originalBytes)} → ${formatBytes(resultBytes)}${delta > 0 ? ` · ${delta}% smaller` : ''}`
        : `${done.length} completed · ready to download`;
      downloadAllButton.hidden = done.length < 2;
    }
  };

  const reset = (): void => {
    if (busy) client.reset('Image utility reset');
    busy = false;
    items = [];
    input.value = '';
    dropzone.hidden = false;
    workspace.hidden = true;
    progress.hidden = true;
    downloads.hidden = true;
    runButton.disabled = false;
    render();
  };

  const addFiles = async (files: File[]): Promise<void> => {
    if (busy) return;
    const available = Math.max(0, MAX_FILES - items.length);
    const candidates = files.slice(0, available).filter((file) => ACCEPTED.has(extensionOf(file.name)) && file.size <= MAX_FILE_BYTES);
    for (const file of candidates) {
      try {
        const dimensions = await readDimensions(file);
        if (!dimensions.width || !dimensions.height || dimensions.width > 12_000 || dimensions.height > 12_000 || dimensions.width * dimensions.height > 20_000_000) continue;
        items.push({ id: crypto.randomUUID(), file, width: dimensions.width, height: dimensions.height, status: 'ready' });
      } catch { /* Unsupported or corrupt browser-readable image. */ }
    }
    if (!items.length) return;
    dropzone.hidden = true;
    workspace.hidden = false;
    updateSummary();
    render();
  };

  const run = async (): Promise<void> => {
    if (busy || !items.length) return;
    busy = true;
    runButton.disabled = true;
    downloads.hidden = true;
    progress.hidden = false;
    const outputChoice = root.querySelector<HTMLSelectElement>('[data-role="output"]')?.value ?? 'same';
    const compressionQuality = Number(quality?.value ?? 90);
    let completed = 0;

    for (const item of items) {
      item.status = 'processing'; item.error = undefined; item.result = undefined; item.resultName = undefined;
      render();
      progressText.textContent = `${mode === 'resize' ? 'Resizing' : 'Compressing'} ${completed + 1} of ${items.length}…`;
      progressBar.style.width = `${Math.round(completed / items.length * 100)}%`;
      try {
        const sourceFormat = normalizedFormat(item.file);
        const outputFormat = mode === 'compress' && outputChoice !== 'same' ? outputChoice : sourceFormat;
        const resize = mode === 'resize' ? targetDimensions(item, root) : undefined;
        if (resize && resize.width * resize.height > 20_000_000) throw new Error('Target dimensions exceed 20 megapixels');
        const output = await client.convert(await item.file.arrayBuffer(), sourceFormat, outputFormat, mode === 'compress' ? compressionQuality : 90, resize);
        item.result = new Blob([output], { type: mimeFor(outputFormat) });
        item.resultName = `${baseName(item.file.name)}-${mode === 'resize' ? 'resized' : 'compressed'}.${outputFormat}`;
        item.resultWidth = resize?.width ?? item.width;
        item.resultHeight = resize?.height ?? item.height;
        item.status = 'success';
      } catch (error) {
        item.status = 'error';
        item.error = error instanceof Error ? error.message : 'Processing failed';
      }
      completed += 1;
      progressBar.style.width = `${Math.round(completed / items.length * 100)}%`;
      render();
    }

    busy = false;
    runButton.disabled = false;
    progressText.textContent = `Finished ${completed} ${completed === 1 ? 'image' : 'images'}`;
    window.setTimeout(() => { if (!busy) progress.hidden = true; }, 1200);
    render();
  };

  chooseButton.addEventListener('click', (event) => { event.stopPropagation(); input.click(); });
  addButton.addEventListener('click', () => input.click());
  clearButton.addEventListener('click', reset);
  dropzone.addEventListener('click', () => input.click());
  dropzone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
  dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('is-dragging'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragging'));
  dropzone.addEventListener('drop', (event) => { event.preventDefault(); dropzone.classList.remove('is-dragging'); void addFiles(Array.from(event.dataTransfer?.files ?? [])); });
  input.addEventListener('change', () => { void addFiles(Array.from(input.files ?? [])); input.value = ''; });
  runButton.addEventListener('click', () => { void run(); });
  quality?.addEventListener('input', () => { if (qualityValue) qualityValue.textContent = quality.value; });
  resizeMode?.addEventListener('change', () => {
    const percent = resizeMode.value === 'percent';
    if (dimensionControls) dimensionControls.hidden = percent;
    if (lockControl) lockControl.hidden = percent;
    if (percentControl) percentControl.hidden = !percent;
  });
  downloadAllButton.addEventListener('click', async () => {
    const done = successful();
    if (done.length < 2) return;
    downloadAllButton.disabled = true;
    try {
      const zip = new JSZip();
      const used = new Set<string>();
      done.forEach((item, index) => {
        let name = item.resultName!;
        if (used.has(name)) name = `${index + 1}-${name}`;
        used.add(name);
        zip.file(name, item.result!);
      });
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      downloadBlob(blob, `${mode}-images.zip`);
    } finally { downloadAllButton.disabled = false; }
  });
}

document.querySelectorAll<HTMLElement>('[data-image-utility]').forEach(initImageUtility);
