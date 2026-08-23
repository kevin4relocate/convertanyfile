import { createZipBlob, downloadBlob } from '../core/download';
import { encodeCanvas, extensionForOutput, type ImageOutputFormat } from '../core/output-encoder';
import { renderToolCanvas, sourceExtension, sourceMime } from '../deterministic/operations';
import { inspectImageMetadata, type MetadataReport } from './metadata-inspector';

type OutputChoice = 'source' | 'jpg' | 'webp' | 'png';
type Item = {
  id: string;
  file: File;
  width: number;
  height: number;
  url: string;
  report?: MetadataReport;
  scanStatus: 'scanning' | 'done' | 'error';
  format?: OutputChoice;
  quality?: number;
  result?: Blob;
  outputName?: string;
  processing?: boolean;
  error?: string;
};

const q = <T extends Element>(root: ParentNode, selector: string): T => {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Metadata cleaner is missing ${selector}`);
  return element;
};
const ext = (name: string): string => name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '';
const base = (name: string): string => name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'image';
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

function mimeFor(file: File, output: OutputChoice): ImageOutputFormat {
  if (output === 'source') return sourceMime(file);
  if (output === 'jpg') return 'image/jpeg';
  if (output === 'webp') return 'image/webp';
  return 'image/png';
}

function uniqueLabels(report?: MetadataReport): string[] {
  if (!report) return [];
  const labels: string[] = [];
  for (const detail of report.details) {
    const label = detail.kind === 'gps' ? 'GPS' : detail.kind === 'camera' ? 'Camera' : detail.kind === 'date' ? 'Date' : detail.kind === 'software' ? 'Software' : detail.kind === 'profile' ? 'Profile' : detail.kind === 'text' ? 'XMP/Text' : 'EXIF';
    if (!labels.includes(label)) labels.push(label);
  }
  return labels;
}

export function mountMetadataCleaner(root: HTMLElement): void {
  root.dataset.platformRuntime = 'metadata-v1';
  root.dataset.platformScope = 'shared';

  const notice = q<HTMLElement>(root, '[data-role="notice"]');
  const input = q<HTMLInputElement>(root, '[data-role="file-input"]');
  const drop = q<HTMLElement>(root, '[data-role="batch-dropzone"]');
  const workspace = q<HTMLElement>(root, '[data-role="metadata-workspace"]');
  const list = q<HTMLElement>(root, '[data-role="batch-list"]');
  const count = q<HTMLElement>(root, '[data-role="batch-count"]');
  const scanSummary = q<HTMLElement>(root, '[data-role="scan-summary"]');
  const add = q<HTMLButtonElement>(root, '[data-role="add-more"]');
  const clear = q<HTMLButtonElement>(root, '[data-role="clear-all"]');
  const sharedFormat = q<HTMLSelectElement>(root, '[data-role="shared-format"]');
  const sharedQuality = q<HTMLInputElement>(root, '[data-role="shared-quality"]');
  const sharedQualityValue = q<HTMLOutputElement>(root, '[data-role="shared-quality-value"]');
  const itemFormat = q<HTMLSelectElement>(root, '[data-role="item-format"]');
  const itemQuality = q<HTMLInputElement>(root, '[data-role="item-quality"]');
  const itemQualityValue = q<HTMLOutputElement>(root, '[data-role="item-quality-value"]');
  const resetItem = q<HTMLButtonElement>(root, '[data-role="reset-item"]');
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
  const suffix = root.dataset.downloadSuffix || 'metadata-clean';

  let items: Item[] = [];
  let activeId: string | undefined;
  let processing = false;
  let cancelled = false;

  const active = (): Item | undefined => items.find((item) => item.id === activeId);
  const hideNotice = (): void => { notice.hidden = true; notice.textContent = ''; delete notice.dataset.type; };
  const showNotice = (text: string, type: 'info' | 'error' = 'info'): void => { notice.hidden = false; notice.textContent = text; notice.dataset.type = type; };

  function outputFor(item: Item): { format: OutputChoice; quality: number } {
    return { format: item.format ?? sharedFormat.value as OutputChoice, quality: clamp(item.quality ?? Number(sharedQuality.value), 1, 100) };
  }

  function invalidateResults(): void {
    for (const item of items) { item.result = undefined; item.outputName = undefined; item.error = undefined; }
    downloadButton.disabled = true;
    updateActions();
  }

  function renderAdvanced(): void {
    const item = active();
    const enabled = Boolean(item) && !processing;
    itemFormat.disabled = !enabled;
    itemQuality.disabled = !enabled;
    resetItem.disabled = !enabled || (!item?.format && item?.quality === undefined);
    if (!item) {
      itemFormat.value = 'source';
      itemQuality.value = sharedQuality.value;
      itemQualityValue.textContent = sharedQuality.value;
      return;
    }
    itemFormat.value = item.format ?? 'source';
    itemQuality.value = String(item.quality ?? Number(sharedQuality.value));
    itemQualityValue.textContent = itemQuality.value;
  }

  function renderSummary(): void {
    const scanning = items.filter((item) => item.scanStatus === 'scanning').length;
    const found = items.filter((item) => item.report?.detected).length;
    if (scanning) scanSummary.textContent = `Scanning ${scanning}…`;
    else if (!items.length) scanSummary.textContent = '';
    else if (!found) scanSummary.textContent = 'No supported metadata detected';
    else scanSummary.textContent = `${found} of ${items.length} contain supported metadata`;
  }

  function renderList(): void {
    list.replaceChildren();
    count.textContent = String(items.length);
    root.dataset.hasItems = String(items.length > 0);
    workspace.hidden = items.length === 0;
    for (const item of items) {
      const card = document.createElement('div');
      card.className = `metadata-file${item.id === activeId ? ' is-active' : ''}`;
      card.tabIndex = processing ? -1 : 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `Configure ${item.file.name}`);
      const image = document.createElement('img'); image.src = item.url; image.alt = '';
      const copy = document.createElement('div'); copy.className = 'metadata-file__copy';
      const name = document.createElement('strong'); name.textContent = item.file.name;
      const meta = document.createElement('small');
      if (item.processing) meta.textContent = 'Creating clean copy…';
      else if (item.error) meta.textContent = item.error;
      else if (item.scanStatus === 'scanning') meta.textContent = 'Scanning metadata…';
      else if (item.report?.detected) meta.textContent = `${uniqueLabels(item.report).join(', ')} found`;
      else meta.textContent = 'No supported metadata detected';
      const tags = document.createElement('div'); tags.className = 'metadata-tags';
      if (item.scanStatus === 'done') {
        const labels = uniqueLabels(item.report);
        if (labels.length) for (const label of labels.slice(0, 5)) { const tag = document.createElement('span'); tag.className = 'metadata-tag metadata-tag--warn'; tag.textContent = label; tags.append(tag); }
        else { const tag = document.createElement('span'); tag.className = 'metadata-tag metadata-tag--safe'; tag.textContent = 'Clean scan'; tags.append(tag); }
      }
      if (item.format || item.quality !== undefined) { const tag = document.createElement('span'); tag.className = 'metadata-tag'; tag.textContent = 'CUSTOM OUTPUT'; tags.append(tag); }
      copy.append(name, meta, tags);
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.title = 'Remove image'; remove.disabled = processing;
      remove.addEventListener('click', (event) => { event.stopPropagation(); removeItem(item.id); });
      const select = (): void => { if (!processing) { activeId = item.id; renderList(); renderAdvanced(); } };
      card.addEventListener('click', select);
      card.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
      card.append(image, copy, remove);
      list.append(card);
    }
    renderSummary();
    renderAdvanced();
    updateActions();
  }

  function updateActions(): void {
    const done = items.filter((item) => item.result).length;
    readyCount.textContent = `${items.length} image${items.length === 1 ? '' : 's'} ready`;
    processButton.disabled = processing || !items.length;
    downloadButton.disabled = processing || !done;
    add.disabled = processing;
    clear.disabled = processing;
    sharedFormat.disabled = processing;
    sharedQuality.disabled = processing;
    input.disabled = processing;
  }

  async function scan(item: Item): Promise<void> {
    try { item.report = await inspectImageMetadata(item.file); item.scanStatus = 'done'; }
    catch { item.scanStatus = 'error'; item.report = { detected: false, details: [] }; }
    renderList();
  }

  async function addFiles(files: readonly File[]): Promise<void> {
    if (!files.length || processing) return;
    hideNotice();
    let totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
    let rejected = 0, limited = 0;
    for (const file of files) {
      if (items.length >= maxFiles || totalBytes + file.size > maxTotalBytes) { limited += 1; continue; }
      if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext(file.name)) || file.size > maxFileBytes) { rejected += 1; continue; }
      try {
        const bitmap = await createImageBitmap(file), width = bitmap.width, height = bitmap.height; bitmap.close();
        if (width > maxDimension || height > maxDimension || width * height > maxPixels) { rejected += 1; continue; }
        const item: Item = { id: crypto.randomUUID(), file, width, height, url: URL.createObjectURL(file), scanStatus: 'scanning' };
        items.push(item); totalBytes += file.size;
        if (!activeId) activeId = item.id;
        void scan(item);
      } catch { rejected += 1; }
    }
    input.value = '';
    renderList();
    if (rejected || limited) showNotice(`${rejected ? `${rejected} skipped by format or size limits` : ''}${rejected && limited ? ' · ' : ''}${limited ? `${limited} skipped by batch limits` : ''}`);
  }

  function removeItem(id: string): void {
    if (processing) return;
    const index = items.findIndex((item) => item.id === id); if (index < 0) return;
    const [removed] = items.splice(index, 1); if (removed) URL.revokeObjectURL(removed.url);
    if (activeId === id) activeId = items[Math.min(index, items.length - 1)]?.id;
    renderList();
  }

  function clearAll(): void {
    if (processing) return;
    items.forEach((item) => URL.revokeObjectURL(item.url));
    items = []; activeId = undefined; input.value = ''; hideNotice();
    progress.hidden = true; renderList();
  }

  async function processBatch(): Promise<void> {
    if (processing || !items.length) return;
    processing = true; cancelled = false; hideNotice(); progress.hidden = false; progressLabel.textContent = 'Removing metadata…'; progressBar.max = 100; cancel.disabled = false; updateActions();
    let completed = 0, failed = 0;
    for (const item of items) {
      if (cancelled) break;
      item.processing = true; item.error = undefined; renderList();
      try {
        const bitmap = await createImageBitmap(item.file);
        try {
          const canvas = renderToolCanvas(bitmap, 'remove-image-metadata', { format: 'source', quality: 92 });
          const output = outputFor(item), mime = mimeFor(item.file, output.format);
          item.result = await encodeCanvas(canvas, { type: mime, quality: mime === 'image/png' ? undefined : output.quality / 100 });
          const extension = output.format === 'source' ? sourceExtension(item.file) : extensionForOutput(mime);
          item.outputName = `${base(item.file.name)}-${suffix}.${extension}`;
          completed += 1;
        } finally { bitmap.close(); }
      } catch (error) { item.error = error instanceof Error ? error.message : 'Unable to create clean copy.'; failed += 1; }
      item.processing = false;
      const finished = completed + failed; progressCount.textContent = `${finished} / ${items.length}`; progressBar.value = Math.round(finished / items.length * 100); renderList();
    }
    processing = false; cancel.disabled = true; progressLabel.textContent = cancelled ? `Stopped · ${completed} completed` : failed ? `${completed} completed · ${failed} failed` : `${completed} cleaned`; updateActions(); renderAdvanced();
    if (failed) showNotice(`${failed} image${failed === 1 ? '' : 's'} failed. Successful cleaned files remain available.`, 'error');
  }

  async function downloadResults(): Promise<void> {
    const files = items.filter((item): item is Item & { result: Blob; outputName: string } => Boolean(item.result && item.outputName)).map((item) => ({ filename: item.outputName, blob: item.result }));
    if (!files.length) return;
    if (files.length === 1) { downloadBlob(files[0].blob, files[0].filename); return; }
    downloadBlob(await createZipBlob(files), 'cleaned-images.zip');
  }

  sharedQuality.addEventListener('input', () => { sharedQualityValue.textContent = sharedQuality.value; invalidateResults(); renderAdvanced(); });
  sharedFormat.addEventListener('change', invalidateResults);
  itemFormat.addEventListener('change', () => { const item = active(); if (!item) return; item.format = itemFormat.value === 'source' ? undefined : itemFormat.value as OutputChoice; invalidateResults(); renderList(); });
  itemQuality.addEventListener('input', () => { const item = active(); if (!item) return; item.quality = Number(itemQuality.value); itemQualityValue.textContent = itemQuality.value; invalidateResults(); renderList(); });
  resetItem.addEventListener('click', () => { const item = active(); if (!item) return; item.format = undefined; item.quality = undefined; invalidateResults(); renderList(); });
  add.addEventListener('click', () => input.click());
  clear.addEventListener('click', clearAll);
  input.addEventListener('change', () => void addFiles([...(input.files ?? [])]));
  processButton.addEventListener('click', () => void processBatch());
  downloadButton.addEventListener('click', () => void downloadResults());
  cancel.addEventListener('click', () => { cancelled = true; cancel.disabled = true; });
  ['dragenter', 'dragover'].forEach((type) => drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach((type) => drop.addEventListener(type, (event) => { event.preventDefault(); drop.classList.remove('is-dragging'); }));
  drop.addEventListener('drop', (event) => { const drag = event as DragEvent; void addFiles([...(drag.dataTransfer?.files ?? [])]); });

  sharedQualityValue.textContent = sharedQuality.value;
  renderList();
}
