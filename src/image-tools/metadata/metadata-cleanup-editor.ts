import { downloadResultBatch } from '../core/download';
import { createImageFileAdmission, imageDimensionsWithinLimits } from '../core/file-admission';
import { runSequentialBatch } from '../core/batch-execution';
import { defaultQualityForImageOutput } from '../core/output-quality';
import { encodeCanvas, extensionForOutput, type ImageOutputFormat } from '../core/output-encoder';
import { renderToolCanvas, sourceExtension, sourceMime } from '../deterministic/operations';
import type { MetadataSettings, OutputChoice } from '../deterministic/types';

type Status = 'ready' | 'processing' | 'done' | 'error';
type Item = {
  id: string;
  file: File;
  width: number;
  height: number;
  status: Status;
  result?: Blob;
  outputName?: string;
  error?: string;
};

const q = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Metadata cleanup is missing ${selector}`);
  return element;
};
const ext = (name: string): string => name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
const base = (name: string): string => name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'image';
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
const formatBytes = (bytes: number): string => bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

function mimeFor(file: File, output: OutputChoice): ImageOutputFormat {
  if (output === 'source') return sourceMime(file);
  if (output === 'jpg') return 'image/jpeg';
  if (output === 'webp') return 'image/webp';
  return 'image/png';
}

export function mountMetadataCleanup(root: HTMLElement): void {
  const notice = q<HTMLElement>(root, '[data-role="notice"]');
  const upload = q<HTMLElement>(root, '[data-role="upload-view"]');
  const input = q<HTMLInputElement>(root, '[data-role="file-input"]');
  const drop = q<HTMLElement>(root, '[data-role="batch-dropzone"]');
  const editor = q<HTMLElement>(root, '[data-role="editor"]');
  const list = q<HTMLElement>(root, '[data-role="batch-list"]');
  const count = q<HTMLElement>(root, '[data-role="batch-count"]');
  const add = q<HTMLButtonElement>(root, '[data-role="add-more"]');
  const clear = q<HTMLButtonElement>(root, '[data-role="clear-all"]');
  const format = q<HTMLSelectElement>(root, '[data-setting="format"]');
  const quality = q<HTMLInputElement>(root, '[data-setting="quality"]');
  const qualityValue = q<HTMLOutputElement>(root, '[data-role="metadata-quality-value"]');
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
  const suffix = root.dataset.downloadSuffix || 'metadata-removed';

  const state = { items: [] as Item[], processing: false, cancel: false };

  const hideNotice = (): void => {
    notice.hidden = true;
    notice.textContent = '';
    delete notice.dataset.type;
  };
  const showNotice = (text: string, type: 'info' | 'error' = 'info'): void => {
    notice.hidden = false;
    notice.textContent = text;
    notice.dataset.type = type;
  };
  const settings = (): MetadataSettings => ({ format: format.value as OutputChoice, quality: clamp(Number(quality.value), 1, 100) });

  function statusText(item: Item): string {
    if (item.status === 'processing') return 'Cleaning…';
    if (item.status === 'done') return 'Clean copy ready';
    if (item.status === 'error') return item.error || 'Failed';
    return 'Ready';
  }

  function invalidate(): void {
    for (const item of state.items) {
      item.status = 'ready';
      item.result = undefined;
      item.outputName = undefined;
      item.error = undefined;
    }
    downloadButton.disabled = true;
    renderList();
  }

  function updateActions(): void {
    const done = state.items.filter((item) => item.status === 'done' && item.result).length;
    const downloadCount = done || state.items.length;
    readyCount.textContent = done
      ? `${done} clean file${done === 1 ? '' : 's'} ready`
      : `${state.items.length} file${state.items.length === 1 ? '' : 's'} ready`;
    downloadButton.textContent = downloadCount > 1 ? 'Download ZIP' : 'Download image';
    processButton.disabled = state.processing || !state.items.length;
    downloadButton.disabled = state.processing || !done;
    add.disabled = state.processing;
    clear.disabled = state.processing;
    input.disabled = state.processing;
    format.disabled = state.processing;
    quality.disabled = state.processing || format.value === 'png';
  }

  function renderList(): void {
    list.replaceChildren();
    count.textContent = String(state.items.length);
    root.dataset.hasItems = String(state.items.length > 0);
    upload.hidden = state.items.length > 0;
    editor.hidden = state.items.length === 0;

    for (const item of state.items) {
      const row = document.createElement('div');
      row.className = 'metadata-file-row';

      const icon = document.createElement('span');
      icon.className = 'metadata-file-row__icon';
      icon.textContent = ext(item.file.name).toUpperCase() || 'IMG';

      const copy = document.createElement('div');
      copy.className = 'metadata-file-row__copy';
      const name = document.createElement('strong');
      name.textContent = item.file.name;
      name.title = item.file.name;
      const meta = document.createElement('small');
      meta.textContent = `${item.width.toLocaleString()} × ${item.height.toLocaleString()} · ${formatBytes(item.file.size)}`;
      copy.append(name, meta);

      const status = document.createElement('span');
      status.className = 'metadata-file-row__status';
      status.dataset.state = item.status;
      status.textContent = statusText(item);
      status.title = item.error || status.textContent;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'metadata-file-row__remove';
      remove.textContent = '×';
      remove.title = 'Remove file';
      remove.disabled = state.processing;
      remove.addEventListener('click', () => removeItem(item.id));

      row.append(icon, copy, status, remove);
      list.append(row);
    }
    updateActions();
  }

  async function addFiles(files: readonly File[]): Promise<void> {
    if (!files.length || state.processing) return;
    hideNotice();

    const admission = createImageFileAdmission(state.items, {
      maxFiles, maxFileBytes, maxTotalBytes, acceptedExtensions: ['jpg', 'jpeg', 'png', 'webp'],
    });
    let rejected = 0;
    let limited = 0;

    for (const file of files) {
      const reason = admission.check(file);
      if (reason) {
        if (reason === 'file-count' || reason === 'total-size') limited++;
        else rejected++;
        continue;
      }
      try {
        const bitmap = await createImageBitmap(file);
        const width = bitmap.width;
        const height = bitmap.height;
        bitmap.close();
        if (!imageDimensionsWithinLimits(width, height, { maxDimension, maxPixels })) {
          rejected++;
          continue;
        }
        admission.accept(file);
        state.items.push({ id: crypto.randomUUID(), file, width, height, status: 'ready' });
      } catch {
        rejected++;
      }
    }

    input.value = '';
    renderList();
    if (rejected || limited) {
      const parts = [];
      if (rejected) parts.push(`${rejected} skipped by format or size limits`);
      if (limited) parts.push(`${limited} skipped by batch limits`);
      showNotice(parts.join(' · '));
    }
  }

  function removeItem(id: string): void {
    if (state.processing) return;
    const index = state.items.findIndex((item) => item.id === id);
    if (index < 0) return;
    state.items.splice(index, 1);
    renderList();
  }

  function clearAll(): void {
    if (state.processing) return;
    state.items = [];
    state.cancel = false;
    input.value = '';
    progress.hidden = true;
    hideNotice();
    renderList();
  }

  function syncQuality(): void {
    qualityValue.textContent = quality.value;
    quality.disabled = state.processing || format.value === 'png';
    const label = quality.closest<HTMLElement>('label');
    label?.classList.toggle('is-quality-disabled', format.value === 'png');
  }

  async function processBatch(): Promise<void> {
    if (state.processing || !state.items.length) return;
    state.processing = true;
    state.cancel = false;
    hideNotice();
    progress.hidden = false;
    progressLabel.textContent = 'Removing metadata…';
    progressCount.textContent = `0 / ${state.items.length}`;
    progressBar.max = 100;
    progressBar.value = 0;
    cancel.disabled = false;
    updateActions();
    const currentSettings = settings();

    const { completed, failed } = await runSequentialBatch(state.items, {
      cancelled: () => state.cancel,
      process: async (item) => {
        item.status = 'processing';
        item.error = undefined;
        renderList();
        const bitmap = await createImageBitmap(item.file);
        try {
          const canvas = renderToolCanvas(bitmap, 'remove-image-metadata', currentSettings);
          const mime = mimeFor(item.file, currentSettings.format);
          item.result = await encodeCanvas(canvas, {
            type: mime, quality: mime === 'image/png' ? undefined : currentSettings.quality / 100,
          });
          const extension = currentSettings.format === 'source' ? sourceExtension(item.file) : extensionForOutput(mime);
          item.outputName = `${base(item.file.name)}-${suffix}.${extension}`;
          item.status = 'done';
        } finally {
          bitmap.close();
        }
      },
      failed: (item, error) => {
        item.status = 'error';
        item.error = error instanceof Error ? error.message : 'Unable to create a clean copy.';
      },
      progress: ({ finished, total }) => {
        progressCount.textContent = `${finished} / ${total}`;
        progressBar.value = Math.round(finished / total * 100);
        renderList();
      },
    });

    state.processing = false;
    cancel.disabled = true;
    progressLabel.textContent = state.cancel
      ? `Stopped · ${completed} completed`
      : failed
        ? `${completed} completed · ${failed} failed`
        : `${completed} clean ${completed === 1 ? 'copy' : 'copies'} ready`;
    updateActions();
    syncQuality();
    if (failed) showNotice(`${failed} file${failed === 1 ? '' : 's'} failed. Successful clean copies remain available.`);
  }

  async function downloadResults(): Promise<void> {
    const files = state.items
      .filter((item): item is Item & { result: Blob; outputName: string } => Boolean(item.result && item.outputName && item.status === 'done'))
      .map((item) => ({ filename: item.outputName, blob: item.result }));
    await downloadResultBatch(files, `metadata-clean-${files.length}-images.zip`);
  }

  drop.addEventListener('dragover', (event) => {
    event.preventDefault();
    drop.classList.add('is-dragging');
  });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-dragging'));
  drop.addEventListener('drop', (event) => {
    event.preventDefault();
    drop.classList.remove('is-dragging');
    void addFiles([...event.dataTransfer!.files]);
  });
  input.addEventListener('change', () => void addFiles([...input.files ?? []]));
  add.addEventListener('click', () => input.click());
  clear.addEventListener('click', clearAll);
  format.addEventListener('change', () => { if (format.value === 'webp' || format.value === 'jpg') quality.value = String(defaultQualityForImageOutput(format.value)); syncQuality(); invalidate(); });
  quality.addEventListener('input', () => { syncQuality(); invalidate(); });
  processButton.addEventListener('click', () => void processBatch());
  downloadButton.addEventListener('click', () => void downloadResults());
  cancel.addEventListener('click', () => {
    if (!state.processing) return;
    state.cancel = true;
    cancel.disabled = true;
    progressLabel.textContent = 'Stopping after current file…';
  });

  syncQuality();
  renderList();
}
