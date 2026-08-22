import { RegionBlurWorkerClient } from '../image-tools/region-blur/worker-client';
import type { RegionBlurShape } from '../image-tools/region-blur/protocol';

type Selection = { x: number; y: number; width: number; height: number };
type Handle = 'nw' | 'ne' | 'sw' | 'se';
type Interaction = { type: 'move' | 'resize'; startX: number; startY: number; before: Selection; handle?: Handle };

const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PIXELS = 12_000_000;
const MAX_REGION_PIXELS = 4_000_000;
const MAX_DIMENSION = 12_000;
const ACCEPTED = new Set(['jpg', 'jpeg', 'png', 'webp']);
const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
const extensionOf = (name: string): string => { const dot = name.lastIndexOf('.'); return dot < 0 ? '' : name.slice(dot + 1).toLowerCase(); };
const sourceFormat = (file: File): 'jpg' | 'png' | 'webp' => { const ext = extensionOf(file.name); return ext === 'jpg' || ext === 'jpeg' ? 'jpg' : ext === 'webp' ? 'webp' : 'png'; };
const baseName = (name: string): string => name.replace(/\.[^.]+$/, '') || 'image';
const formatBytes = (bytes: number): string => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const mimeFor = (format: string): string => format === 'jpg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';

function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to encode blurred image')), mime, quality));
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

function initRegionBlur(root: HTMLElement): void {
  if (root.dataset.ready === 'true') return;
  root.dataset.ready = 'true';
  const client = new RegionBlurWorkerClient();
  const input = root.querySelector<HTMLInputElement>('[data-role="file-input"]')!;
  const upload = root.querySelector<HTMLElement>('[data-role="upload-view"]')!;
  const drop = root.querySelector<HTMLButtonElement>('[data-role="drop-zone"]')!;
  const workspace = root.querySelector<HTMLElement>('[data-role="workspace"]')!;
  const notice = root.querySelector<HTMLElement>('[data-role="notice"]')!;
  const filename = root.querySelector<HTMLElement>('[data-role="filename"]')!;
  const filemeta = root.querySelector<HTMLElement>('[data-role="filemeta"]')!;
  const replace = root.querySelector<HTMLButtonElement>('[data-role="replace"]')!;
  const clear = root.querySelector<HTMLButtonElement>('[data-role="clear"]')!;
  const shape = root.querySelector<HTMLSelectElement>('[data-role="shape"]')!;
  const strength = root.querySelector<HTMLInputElement>('[data-role="strength"]')!;
  const strengthValue = root.querySelector<HTMLElement>('[data-role="strength-value"]')!;
  const output = root.querySelector<HTMLSelectElement>('[data-role="output"]')!;
  const quality = root.querySelector<HTMLInputElement>('[data-role="quality"]')!;
  const qualityValue = root.querySelector<HTMLElement>('[data-role="quality-value"]')!;
  const resetSelection = root.querySelector<HTMLButtonElement>('[data-role="reset-selection"]')!;
  const sourceCanvas = root.querySelector<HTMLCanvasElement>('[data-role="source-canvas"]')!;
  const overlay = root.querySelector<HTMLCanvasElement>('[data-role="overlay-canvas"]')!;
  const resultCanvas = root.querySelector<HTMLCanvasElement>('[data-role="result-canvas"]')!;
  const resultEmpty = root.querySelector<HTMLElement>('[data-role="result-empty"]')!;
  const selectionMeta = root.querySelector<HTMLElement>('[data-role="selection-meta"]')!;
  const resultMeta = root.querySelector<HTMLElement>('[data-role="result-meta"]')!;
  const status = root.querySelector<HTMLElement>('[data-role="status"]')!;
  const run = root.querySelector<HTMLButtonElement>('[data-role="run"]')!;
  const cancel = root.querySelector<HTMLButtonElement>('[data-role="cancel"]')!;
  const download = root.querySelector<HTMLButtonElement>('[data-role="download"]')!;
  const presetButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-strength]'));

  let file: File | undefined;
  let bitmap: ImageBitmap | undefined;
  let selection: Selection = { x: .3, y: .35, width: .4, height: .3 };
  let interaction: Interaction | undefined;
  let resultBlob: Blob | undefined;
  let resultName = '';
  let busy = false;
  let cancelled = false;

  const showNotice = (message: string): void => { notice.textContent = message; notice.hidden = false; };
  const hideNotice = (): void => { notice.hidden = true; notice.textContent = ''; };
  const resetSelectionValue = (): void => { selection = { x: .3, y: .35, width: .4, height: .3 }; invalidateResult(); renderOverlay(); };

  const syncOverlaySize = (): void => {
    const rect = sourceCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  };

  const selectionPixels = (): Selection => ({
    x: Math.round(selection.x * overlay.width), y: Math.round(selection.y * overlay.height),
    width: Math.max(1, Math.round(selection.width * overlay.width)), height: Math.max(1, Math.round(selection.height * overlay.height)),
  });

  const renderOverlay = (): void => {
    const context = overlay.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, overlay.width, overlay.height);
    const rect = selectionPixels();
    context.save();
    context.fillStyle = 'rgba(117,108,255,.24)';
    context.strokeStyle = '#9f98ff';
    context.lineWidth = Math.max(2, overlay.width / Math.max(300, sourceCanvas.clientWidth || 600) * 2);
    if (shape.value === 'ellipse') {
      context.beginPath();
      context.ellipse(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width / 2, rect.height / 2, 0, 0, Math.PI * 2);
      context.fill(); context.stroke();
    } else { context.fillRect(rect.x, rect.y, rect.width, rect.height); context.strokeRect(rect.x, rect.y, rect.width, rect.height); }
    const handle = Math.max(8, overlay.width / Math.max(300, sourceCanvas.clientWidth || 600) * 8);
    context.fillStyle = '#f1efff';
    for (const [x, y] of [[rect.x, rect.y], [rect.x + rect.width, rect.y], [rect.x, rect.y + rect.height], [rect.x + rect.width, rect.y + rect.height]]) context.fillRect(x - handle / 2, y - handle / 2, handle, handle);
    context.restore();
    const percent = Math.round(selection.width * selection.height * 100);
    selectionMeta.textContent = `${Math.round(rect.width)}×${Math.round(rect.height)} px · about ${percent}% of image area`;
  };

  const invalidateResult = (): void => {
    resultBlob = undefined;
    resultName = '';
    download.disabled = true;
    resultEmpty.hidden = false;
    resultMeta.textContent = 'Run blur to preview';
    resultCanvas.getContext('2d')?.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  };

  const pointerPoint = (event: PointerEvent): { x: number; y: number } => {
    const rect = overlay.getBoundingClientRect();
    return { x: (event.clientX - rect.left) / Math.max(1, rect.width), y: (event.clientY - rect.top) / Math.max(1, rect.height) };
  };

  const handleAt = (point: { x: number; y: number }): Handle | undefined => {
    const tolerance = 14 / Math.max(220, Math.min(overlay.clientWidth || 500, overlay.clientHeight || 500));
    const corners: Array<[Handle, number, number]> = [['nw', selection.x, selection.y], ['ne', selection.x + selection.width, selection.y], ['sw', selection.x, selection.y + selection.height], ['se', selection.x + selection.width, selection.y + selection.height]];
    return corners.find(([, x, y]) => Math.hypot(point.x - x, point.y - y) <= tolerance)?.[0];
  };

  const setBusy = (value: boolean): void => {
    busy = value;
    run.disabled = value || !file;
    cancel.hidden = !value;
    cancel.disabled = !value;
    replace.disabled = value; clear.disabled = value;
    shape.disabled = value; strength.disabled = value; output.disabled = value; quality.disabled = value; resetSelection.disabled = value;
    presetButtons.forEach((button) => { button.disabled = value; });
  };

  const reset = (): void => {
    if (busy) client.reset('Selected region blur reset');
    bitmap?.close(); bitmap = undefined; file = undefined; input.value = '';
    resultBlob = undefined; resultName = ''; busy = false; cancelled = false; interaction = undefined;
    workspace.hidden = true; upload.hidden = false; resultEmpty.hidden = false; download.disabled = true; cancel.hidden = true; hideNotice();
    sourceCanvas.width = sourceCanvas.height = overlay.width = overlay.height = resultCanvas.width = resultCanvas.height = 1;
    setBusy(false);
  };

  const loadFile = async (candidate: File): Promise<void> => {
    const ext = extensionOf(candidate.name);
    if (!ACCEPTED.has(ext)) { showNotice('Choose a JPG, PNG or WebP image.'); return; }
    if (candidate.size > MAX_FILE_BYTES) { showNotice('This image is larger than the 20 MB selected-region limit.'); return; }
    let next: ImageBitmap;
    try { next = await createImageBitmap(candidate); } catch { showNotice('This image could not be decoded in the browser.'); return; }
    if (!next.width || !next.height || next.width > MAX_DIMENSION || next.height > MAX_DIMENSION || next.width * next.height > MAX_PIXELS) { next.close(); showNotice('Selected-region blur supports images up to 12,000 px per side and 12 MP.'); return; }
    bitmap?.close(); bitmap = next; file = candidate; hideNotice(); invalidateResult();
    sourceCanvas.width = overlay.width = resultCanvas.width = next.width;
    sourceCanvas.height = overlay.height = resultCanvas.height = next.height;
    sourceCanvas.getContext('2d')?.drawImage(next, 0, 0);
    filename.textContent = candidate.name;
    filemeta.textContent = `${next.width}×${next.height} · ${formatBytes(candidate.size)}`;
    selection = { x: .3, y: .35, width: .4, height: .3 };
    upload.hidden = true; workspace.hidden = false; setBusy(false);
    requestAnimationFrame(() => { syncOverlaySize(); renderOverlay(); });
  };

  const encodeResult = async (format: 'jpg' | 'png' | 'webp'): Promise<Blob> => {
    const mime = mimeFor(format);
    if (format !== 'jpg') return toBlob(resultCanvas, mime, Number(quality.value) / 100);
    const canvas = document.createElement('canvas'); canvas.width = resultCanvas.width; canvas.height = resultCanvas.height;
    const context = canvas.getContext('2d')!; context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(resultCanvas, 0, 0);
    return toBlob(canvas, mime, Number(quality.value) / 100);
  };

  const process = async (): Promise<void> => {
    if (!file || busy) return;
    const context = sourceCanvas.getContext('2d');
    if (!context) return;
    const pixelRect = selectionPixels();
    if (pixelRect.width * pixelRect.height > MAX_REGION_PIXELS) { showNotice('Selected region is too large. Reduce the selection below the 4 MP safety limit.'); return; }
    cancelled = false; hideNotice(); setBusy(true); status.textContent = 'Blurring selected pixels locally…'; invalidateResult();
    try {
      const imageData = context.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      const response = await client.blur(imageData.data.buffer as ArrayBuffer, sourceCanvas.width, sourceCanvas.height, pixelRect, shape.value as RegionBlurShape, Number(strength.value));
      if (cancelled) return;
      const resultContext = resultCanvas.getContext('2d')!;
      resultContext.putImageData(new ImageData(new Uint8ClampedArray(response.pixels), resultCanvas.width, resultCanvas.height), 0, 0);
      const format = output.value === 'source' ? sourceFormat(file) : output.value as 'jpg' | 'png' | 'webp';
      resultBlob = await encodeResult(format);
      resultName = `${baseName(file.name)}-region-blurred.${format}`;
      resultEmpty.hidden = true; download.disabled = false;
      resultMeta.textContent = `${response.affectedPixels.toLocaleString()} pixels blurred · ${formatBytes(resultBlob.size)}`;
      status.textContent = 'Selected region blurred. Review the preview before downloading.';
    } catch (error) {
      if (!cancelled) { showNotice(error instanceof Error ? error.message : 'Unable to blur selected region.'); status.textContent = 'Selected-region blur failed.'; }
    } finally { setBusy(false); cancelled = false; }
  };

  drop.addEventListener('click', () => input.click());
  drop.addEventListener('dragover', (event) => event.preventDefault());
  drop.addEventListener('drop', (event) => { event.preventDefault(); const candidate = event.dataTransfer?.files?.[0]; if (candidate) void loadFile(candidate); });
  input.addEventListener('change', () => { const candidate = input.files?.[0]; if (candidate) void loadFile(candidate); input.value = ''; });
  replace.addEventListener('click', () => input.click()); clear.addEventListener('click', reset);
  strength.addEventListener('input', () => { strengthValue.textContent = strength.value; invalidateResult(); });
  quality.addEventListener('input', () => { qualityValue.textContent = quality.value; invalidateResult(); });
  output.addEventListener('change', invalidateResult); shape.addEventListener('change', () => { invalidateResult(); renderOverlay(); });
  resetSelection.addEventListener('click', resetSelectionValue);
  presetButtons.forEach((button) => button.addEventListener('click', () => { strength.value = button.dataset.strength ?? '8'; strengthValue.textContent = strength.value; invalidateResult(); }));
  run.addEventListener('click', () => { void process(); });
  cancel.addEventListener('click', () => { if (!busy) return; cancelled = true; client.reset('Selected region blur cancelled'); cancel.disabled = true; status.textContent = 'Cancelling…'; });
  download.addEventListener('click', () => { if (resultBlob && resultName) downloadBlob(resultBlob, resultName); });

  overlay.addEventListener('pointerdown', (event) => {
    if (busy || !file) return;
    const point = pointerPoint(event); const handle = handleAt(point);
    const inside = point.x >= selection.x && point.x <= selection.x + selection.width && point.y >= selection.y && point.y <= selection.y + selection.height;
    if (!handle && !inside) return;
    interaction = { type: handle ? 'resize' : 'move', handle, startX: point.x, startY: point.y, before: { ...selection } };
    overlay.setPointerCapture(event.pointerId); event.preventDefault();
  });
  overlay.addEventListener('pointermove', (event) => {
    if (!interaction) return;
    const point = pointerPoint(event); const dx = point.x - interaction.startX; const dy = point.y - interaction.startY; const before = interaction.before;
    if (interaction.type === 'move') {
      selection.x = clamp(before.x + dx, 0, 1 - before.width); selection.y = clamp(before.y + dy, 0, 1 - before.height);
    } else {
      const min = .04; let left = before.x; let top = before.y; let right = before.x + before.width; let bottom = before.y + before.height;
      if (interaction.handle?.includes('w')) left = clamp(before.x + dx, 0, right - min);
      if (interaction.handle?.includes('e')) right = clamp(before.x + before.width + dx, left + min, 1);
      if (interaction.handle?.includes('n')) top = clamp(before.y + dy, 0, bottom - min);
      if (interaction.handle?.includes('s')) bottom = clamp(before.y + before.height + dy, top + min, 1);
      selection = { x: left, y: top, width: right - left, height: bottom - top };
    }
    invalidateResult(); renderOverlay(); event.preventDefault();
  });
  const endInteraction = (event: PointerEvent): void => { if (!interaction) return; interaction = undefined; try { overlay.releasePointerCapture(event.pointerId); } catch { /* no-op */ } };
  overlay.addEventListener('pointerup', endInteraction); overlay.addEventListener('pointercancel', endInteraction);
  window.addEventListener('resize', () => { syncOverlaySize(); renderOverlay(); });
}

document.querySelectorAll<HTMLElement>('[data-region-blur]').forEach(initRegionBlur);
