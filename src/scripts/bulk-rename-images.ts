import JSZip from 'jszip';

interface RenameItem { id: string; file: File; outputName: string; }
const MAX_FILES = 100;
const MAX_TOTAL_BYTES = 200 * 1024 * 1024;
const ACCEPTED = new Set(['jpg', 'jpeg', 'png', 'webp']);

const extensionOf = (name: string): string => { const dot = name.lastIndexOf('.'); return dot < 0 ? '' : name.slice(dot + 1).toLowerCase(); };
const baseName = (name: string): string => name.replace(/\.[^.]+$/, '') || 'image';
const formatBytes = (bytes: number): string => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const fingerprint = (file: File): string => `${file.name}\u0000${file.size}\u0000${file.lastModified}`;

function sanitizeStem(value: string): string {
  const cleaned = value
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .trim();
  return cleaned || 'image';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function uniqueFilename(stem: string, extension: string, used: Set<string>): string {
  let suffix = 1;
  let candidate = `${stem}.${extension}`;
  while (used.has(candidate.toLowerCase())) {
    suffix += 1;
    candidate = `${stem}-${suffix}.${extension}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function initBulkRename(root: HTMLElement): void {
  if (root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';
  const input = root.querySelector<HTMLInputElement>('[data-role="file-input"]')!;
  const choose = root.querySelector<HTMLButtonElement>('[data-role="choose"]')!;
  const clear = root.querySelector<HTMLButtonElement>('[data-role="clear"]')!;
  const dropzone = root.querySelector<HTMLElement>('[data-role="dropzone"]')!;
  const workspace = root.querySelector<HTMLElement>('[data-role="workspace"]')!;
  const notice = root.querySelector<HTMLElement>('[data-role="notice"]')!;
  const summary = root.querySelector<HTMLElement>('[data-role="summary"]')!;
  const list = root.querySelector<HTMLElement>('[data-role="list"]')!;
  const previewSummary = root.querySelector<HTMLElement>('[data-role="preview-summary"]')!;
  const downloadAll = root.querySelector<HTMLButtonElement>('[data-role="download-all"]')!;
  const pattern = root.querySelector<HTMLInputElement>('[data-role="pattern"]')!;
  const start = root.querySelector<HTMLInputElement>('[data-role="start"]')!;
  const padding = root.querySelector<HTMLSelectElement>('[data-role="padding"]')!;
  const lowercase = root.querySelector<HTMLInputElement>('[data-role="lowercase"]')!;
  let items: RenameItem[] = [];

  const showNotice = (message: string): void => { notice.textContent = message; notice.hidden = false; };
  const hideNotice = (): void => { notice.hidden = true; notice.textContent = ''; };

  const computeNames = (): void => {
    const requestedStart = Math.max(0, Math.min(999999, Math.round(Number(start.value) || 0)));
    const digits = Math.max(1, Math.min(4, Number(padding.value) || 1));
    const template = pattern.value.trim() || '{name}-{n}';
    const used = new Set<string>();
    items.forEach((item, index) => {
      const sourceExt = extensionOf(item.file.name) || 'jpg';
      const ext = lowercase.checked ? sourceExt.toLowerCase() : sourceExt;
      const number = String(requestedStart + index).padStart(digits, '0');
      let stem = template.replaceAll('{name}', baseName(item.file.name)).replaceAll('{n}', number);
      stem = sanitizeStem(stem);
      if (lowercase.checked) stem = stem.toLowerCase();
      item.outputName = uniqueFilename(stem, ext, used);
    });
  };

  const render = (): void => {
    computeNames();
    list.replaceChildren();
    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'rename-row';
      const copy = document.createElement('div');
      copy.className = 'rename-row-copy';
      const source = document.createElement('strong');
      source.textContent = `${String(index + 1).padStart(2, '0')}  ${item.file.name}`;
      const output = document.createElement('span');
      output.textContent = `→ ${item.outputName}`;
      copy.append(source, output);
      const download = document.createElement('button');
      download.type = 'button';
      download.textContent = 'Download';
      download.addEventListener('click', () => downloadBlob(item.file, item.outputName));
      row.append(copy, download);
      list.append(row);
    });
    const bytes = items.reduce((sum, item) => sum + item.file.size, 0);
    summary.textContent = `${items.length} ${items.length === 1 ? 'image' : 'images'} · ${formatBytes(bytes)}`;
    previewSummary.textContent = `${items.length} renamed preview${items.length === 1 ? '' : 's'} · original file bytes are unchanged`;
    downloadAll.disabled = items.length === 0;
  };

  const reset = (): void => {
    items = [];
    input.value = '';
    workspace.hidden = true;
    dropzone.hidden = false;
    hideNotice();
    render();
  };

  const addFiles = (files: File[]): void => {
    if (!files.length) return;
    const existing = new Set(items.map((item) => fingerprint(item.file)));
    let totalBytes = items.reduce((sum, item) => sum + item.file.size, 0);
    let added = 0;
    let skipped = 0;
    for (const file of files) {
      if (items.length >= MAX_FILES || totalBytes + file.size > MAX_TOTAL_BYTES || !ACCEPTED.has(extensionOf(file.name)) || existing.has(fingerprint(file))) { skipped += 1; continue; }
      items.push({ id: crypto.randomUUID(), file, outputName: file.name });
      existing.add(fingerprint(file));
      totalBytes += file.size;
      added += 1;
    }
    if (items.length) { dropzone.hidden = true; workspace.hidden = false; render(); }
    if (skipped) showNotice(`${added ? `${added} added. ` : ''}${skipped} file${skipped === 1 ? '' : 's'} skipped because of type, duplicate, file-count, or 200 MB batch limits.`);
    else hideNotice();
  };

  choose.addEventListener('click', (event) => { event.stopPropagation(); input.click(); });
  dropzone.addEventListener('click', () => input.click());
  dropzone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
  dropzone.addEventListener('dragover', (event) => event.preventDefault());
  dropzone.addEventListener('drop', (event) => { event.preventDefault(); addFiles(Array.from(event.dataTransfer?.files ?? [])); });
  input.addEventListener('change', () => { addFiles(Array.from(input.files ?? [])); input.value = ''; });
  clear.addEventListener('click', reset);
  for (const control of [pattern, start, padding, lowercase]) control.addEventListener('input', render);
  padding.addEventListener('change', render);
  lowercase.addEventListener('change', render);
  downloadAll.addEventListener('click', async () => {
    if (!items.length) return;
    downloadAll.disabled = true;
    try {
      const zip = new JSZip();
      for (const item of items) zip.file(item.outputName, item.file);
      const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
      downloadBlob(blob, 'renamed-images.zip');
    } finally { downloadAll.disabled = false; }
  });
}

document.querySelectorAll<HTMLElement>('[data-bulk-rename]').forEach(initBulkRename);
