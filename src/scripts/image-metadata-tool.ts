import { ImageWorkerClient } from '../engines/image/worker-client';
import type { ImageMetadataSnapshot } from '../engines/image/protocol';

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const ACCEPTED = new Set(['jpg', 'jpeg', 'png', 'webp']);

const extensionOf = (name: string): string => { const dot = name.lastIndexOf('.'); return dot < 0 ? '' : name.slice(dot + 1).toLowerCase(); };
const normalizedFormat = (file: File): string => extensionOf(file.name) === 'jpeg' ? 'jpg' : extensionOf(file.name);
const mimeFor = (format: string): string => format === 'jpg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
const baseName = (name: string): string => name.replace(/\.[^.]+$/, '') || 'image';
const formatBytes = (bytes: number): string => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

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

function initMetadataTool(root: HTMLElement): void {
  if (root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';
  const client = new ImageWorkerClient();
  const input = root.querySelector<HTMLInputElement>('[data-role="file-input"]')!;
  const choose = root.querySelector<HTMLButtonElement>('[data-role="choose"]')!;
  const clear = root.querySelector<HTMLButtonElement>('[data-role="clear"]')!;
  const dropzone = root.querySelector<HTMLElement>('[data-role="dropzone"]')!;
  const workspace = root.querySelector<HTMLElement>('[data-role="workspace"]')!;
  const filename = root.querySelector<HTMLElement>('[data-role="filename"]')!;
  const filemeta = root.querySelector<HTMLElement>('[data-role="filemeta"]')!;
  const profileCount = root.querySelector<HTMLElement>('[data-role="profile-count"]')!;
  const attributeCount = root.querySelector<HTMLElement>('[data-role="attribute-count"]')!;
  const dimensions = root.querySelector<HTMLElement>('[data-role="dimensions"]')!;
  const profiles = root.querySelector<HTMLElement>('[data-role="profiles"]')!;
  const attributes = root.querySelector<HTMLElement>('[data-role="attributes"]')!;
  const preserveColor = root.querySelector<HTMLInputElement>('[data-role="preserve-color"]')!;
  const clean = root.querySelector<HTMLButtonElement>('[data-role="clean"]')!;
  const result = root.querySelector<HTMLElement>('[data-role="result"]')!;
  const resultSummary = root.querySelector<HTMLElement>('[data-role="result-summary"]')!;
  const download = root.querySelector<HTMLButtonElement>('[data-role="download"]')!;
  let currentFile: File | undefined;
  let cleanedBlob: Blob | undefined;
  let cleanedName = '';
  let inspecting = false;
  let cleaning = false;

  const setControls = (): void => {
    const locked = inspecting || cleaning;
    clear.disabled = locked;
    preserveColor.disabled = locked;
    clean.disabled = locked || !currentFile || inspecting;
  };

  const renderEntries = (container: HTMLElement, entries: Array<{ name: string; value?: string }>): void => {
    container.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement('div');
      empty.className = 'metadata-empty';
      empty.textContent = 'None detected';
      container.append(empty);
      return;
    }
    for (const entry of entries) {
      const row = document.createElement('div');
      row.className = 'metadata-entry';
      const name = document.createElement('strong');
      name.textContent = entry.name;
      row.append(name);
      if (entry.value) {
        const value = document.createElement('span');
        value.textContent = entry.value;
        row.append(value);
      }
      container.append(row);
    }
  };

  const renderMetadata = (metadata: ImageMetadataSnapshot): void => {
    profileCount.textContent = String(metadata.profiles.length);
    attributeCount.textContent = String(metadata.attributes.length);
    dimensions.textContent = `${metadata.width}×${metadata.height}`;
    renderEntries(profiles, metadata.profiles.map((name) => ({ name })));
    renderEntries(attributes, metadata.attributes);
  };

  const resetResult = (): void => {
    cleanedBlob = undefined;
    cleanedName = '';
    result.hidden = true;
    download.hidden = true;
    resultSummary.textContent = '';
  };

  const reset = (): void => {
    if (inspecting || cleaning) return;
    currentFile = undefined;
    input.value = '';
    workspace.hidden = true;
    dropzone.hidden = false;
    resetResult();
    renderEntries(profiles, []);
    renderEntries(attributes, []);
    setControls();
  };

  const loadFile = async (file: File): Promise<void> => {
    const ext = extensionOf(file.name);
    if (!ACCEPTED.has(ext) || file.size > MAX_FILE_BYTES || inspecting || cleaning) return;
    currentFile = file;
    resetResult();
    filename.textContent = file.name;
    filemeta.textContent = `${formatBytes(file.size)} · ${ext.toUpperCase()}`;
    dropzone.hidden = true;
    workspace.hidden = false;
    inspecting = true;
    setControls();
    profileCount.textContent = '…';
    attributeCount.textContent = '…';
    dimensions.textContent = '…';
    renderEntries(profiles, [{ name: 'Inspecting…' }]);
    renderEntries(attributes, [{ name: 'Inspecting…' }]);
    try {
      const metadata = await client.inspect(await file.arrayBuffer(), normalizedFormat(file));
      if (currentFile !== file) return;
      renderMetadata(metadata);
    } catch (error) {
      if (currentFile !== file) return;
      renderEntries(profiles, []);
      renderEntries(attributes, [{ name: error instanceof Error ? error.message : 'Unable to inspect this image' }]);
    } finally {
      if (currentFile === file) {
        inspecting = false;
        setControls();
      }
    }
  };

  choose.addEventListener('click', (event) => { event.stopPropagation(); if (!inspecting && !cleaning) input.click(); });
  dropzone.addEventListener('click', () => { if (!inspecting && !cleaning) input.click(); });
  dropzone.addEventListener('keydown', (event) => { if ((event.key === 'Enter' || event.key === ' ') && !inspecting && !cleaning) { event.preventDefault(); input.click(); } });
  input.addEventListener('change', () => { const file = input.files?.[0]; if (file) void loadFile(file); input.value = ''; });
  dropzone.addEventListener('dragover', (event) => event.preventDefault());
  dropzone.addEventListener('drop', (event) => { event.preventDefault(); const file = event.dataTransfer?.files?.[0]; if (file) void loadFile(file); });
  clear.addEventListener('click', reset);
  clean.addEventListener('click', async () => {
    const file = currentFile;
    if (!file || inspecting || cleaning) return;
    cleaning = true;
    resetResult();
    clean.textContent = 'Cleaning…';
    setControls();
    try {
      const format = normalizedFormat(file);
      const output = await client.convert(await file.arrayBuffer(), format, format, 95, { stripMetadata: true, preserveColorProfile: preserveColor.checked });
      const blob = new Blob([output], { type: mimeFor(format) });
      const after = await client.inspect(await blob.arrayBuffer(), format);
      if (currentFile !== file) return;
      cleanedBlob = blob;
      cleanedName = `${baseName(file.name)}-metadata-cleaned.${format}`;
      resultSummary.textContent = `${formatBytes(file.size)} → ${formatBytes(blob.size)} · remaining: ${after.profiles.length} profiles, ${after.attributes.length} attributes`;
      download.hidden = false;
      result.hidden = false;
    } catch (error) {
      if (currentFile === file) {
        cleanedBlob = undefined;
        cleanedName = '';
        resultSummary.textContent = error instanceof Error ? error.message : 'Unable to clean metadata';
        download.hidden = true;
        result.hidden = false;
      }
    } finally {
      if (currentFile === file) {
        cleaning = false;
        clean.textContent = 'Remove metadata';
        setControls();
      }
    }
  });
  download.addEventListener('click', () => { if (cleanedBlob && cleanedName) downloadBlob(cleanedBlob, cleanedName); });
  download.hidden = true;
  setControls();
}

document.querySelectorAll<HTMLElement>('[data-image-metadata]').forEach(initMetadataTool);
