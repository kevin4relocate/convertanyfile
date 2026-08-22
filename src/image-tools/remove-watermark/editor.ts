import type { AutoSelection, MaskOperation, PixelPoint, PixelRect } from '../../platform/image-tools/types';
import { RemoveWatermarkWorkerClient } from './worker-client';

type ToolMode = 'rect' | 'brush' | 'erase';

type StrokeOperation = Extract<MaskOperation, { type: 'stroke' }>;

interface EditorState {
  file?: File;
  bitmap?: ImageBitmap;
  width: number;
  height: number;
  mode: ToolMode;
  operations: MaskOperation[];
  activeRectStart?: PixelPoint;
  activeRectCurrent?: PixelPoint;
  activeStroke?: StrokeOperation;
  resultBlob?: Blob;
  resultExtension?: string;
  generation: number;
  processing: boolean;
}

function required<T extends Element>(root: ParentNode, selector: string): T {
  const element = root.querySelector<T>(selector);
  if (!element) throw new Error(`Image tool UI is missing ${selector}`);
  return element;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

function sourceMime(file: File): string {
  if (file.type === 'image/jpeg' || file.type === 'image/png' || file.type === 'image/webp') return file.type;
  const extension = fileExtension(file.name);
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'webp') return 'image/webp';
  return 'image/png';
}

function sourceExtension(file: File): string {
  const mime = sourceMime(file);
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

function outputConfig(file: File, value: string): { mime: string; extension: string } {
  if (value === 'png') return { mime: 'image/png', extension: 'png' };
  if (value === 'jpeg') return { mime: 'image/jpeg', extension: 'jpg' };
  if (value === 'webp') return { mime: 'image/webp', extension: 'webp' };
  return { mime: sourceMime(file), extension: sourceExtension(file) };
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('Unable to encode the repaired image in this browser.')), mime, quality);
  });
}

function normalizeRect(start: PixelPoint, end: PixelPoint): PixelRect {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function cloneOperations(operations: readonly MaskOperation[]): MaskOperation[] {
  return operations.map((operation) => operation.type === 'rect'
    ? { type: 'rect', rect: { ...operation.rect } }
    : { type: 'stroke', erase: operation.erase, radius: operation.radius, points: operation.points.map((point) => ({ ...point })) });
}

function flattenForJpeg(pixels: Uint8ClampedArray): void {
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = (pixels[index + 3] ?? 255) / 255;
    if (alpha >= 1) continue;
    pixels[index] = Math.round((pixels[index] ?? 0) * alpha + 255 * (1 - alpha));
    pixels[index + 1] = Math.round((pixels[index + 1] ?? 0) * alpha + 255 * (1 - alpha));
    pixels[index + 2] = Math.round((pixels[index + 2] ?? 0) * alpha + 255 * (1 - alpha));
    pixels[index + 3] = 255;
  }
}

export function mountRemoveWatermarkEditor(root: HTMLElement): void {
  const uploadView = required<HTMLElement>(root, '[data-role="upload-view"]');
  const editor = required<HTMLElement>(root, '[data-role="editor"]');
  const notice = required<HTMLElement>(root, '[data-role="notice"]');
  const dropZone = required<HTMLButtonElement>(root, '[data-role="drop-zone"]');
  const fileInput = required<HTMLInputElement>(root, '[data-role="file-input"]');
  const newImageButton = required<HTMLButtonElement>(root, '[data-role="new-image"]');
  const sourceName = required<HTMLElement>(root, '[data-role="source-name"]');
  const sourceMeta = required<HTMLElement>(root, '[data-role="source-meta"]');
  const autoSelectButton = required<HTMLButtonElement>(root, '[data-role="auto-select"]');
  const modeButtons = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-tool-mode]'));
  const brushSize = required<HTMLInputElement>(root, '[data-role="brush-size"]');
  const brushValue = required<HTMLOutputElement>(root, '[data-role="brush-size-value"]');
  const undoButton = required<HTMLButtonElement>(root, '[data-role="undo"]');
  const resetMaskButton = required<HTMLButtonElement>(root, '[data-role="reset-mask"]');
  const selectionStatus = required<HTMLElement>(root, '[data-role="selection-status"]');
  const originalCanvas = required<HTMLCanvasElement>(root, '[data-role="original-canvas"]');
  const maskCanvas = required<HTMLCanvasElement>(root, '[data-role="mask-canvas"]');
  const resultCanvas = required<HTMLCanvasElement>(root, '[data-role="result-canvas"]');
  const resultEmpty = required<HTMLElement>(root, '[data-role="result-empty"]');
  const resultLabel = required<HTMLElement>(root, '[data-role="result-label"]');
  const outputFormat = required<HTMLSelectElement>(root, '[data-role="output-format"]');
  const quality = required<HTMLInputElement>(root, '[data-role="quality"]');
  const qualityValue = required<HTMLOutputElement>(root, '[data-role="quality-value"]');
  const removeButton = required<HTMLButtonElement>(root, '[data-role="remove"]');
  const downloadButton = required<HTMLButtonElement>(root, '[data-role="download"]');
  const worker = new RemoveWatermarkWorkerClient();

  const state: EditorState = { width: 0, height: 0, mode: 'rect', operations: [], generation: 0, processing: false };
  const maxFileBytes = Number(root.dataset.maxFileBytes || 40 * 1024 * 1024);
  const maxPixels = Number(root.dataset.maxPixels || 20_000_000);
  const maxDimension = Number(root.dataset.maxDimension || 12_000);

  const showNotice = (message: string, type: 'info' | 'success' | 'error' = 'info'): void => {
    notice.textContent = message;
    notice.dataset.type = type;
    notice.hidden = false;
  };
  const hideNotice = (): void => { notice.hidden = true; notice.textContent = ''; delete notice.dataset.type; };

  const previewDimensions = (width: number, height: number): { width: number; height: number } => {
    const scale = Math.min(1, 980 / width, 720 / height);
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
  };

  const setCanvasSize = (width: number, height: number): void => {
    for (const canvas of [originalCanvas, maskCanvas, resultCanvas]) {
      canvas.width = width;
      canvas.height = height;
    }
  };

  const imageToCanvasPoint = (point: PixelPoint): PixelPoint => ({
    x: state.width ? point.x * maskCanvas.width / state.width : 0,
    y: state.height ? point.y * maskCanvas.height / state.height : 0,
  });

  const pointerToImagePoint = (event: PointerEvent): PixelPoint => {
    const bounds = maskCanvas.getBoundingClientRect();
    const canvasX = (event.clientX - bounds.left) * maskCanvas.width / Math.max(1, bounds.width);
    const canvasY = (event.clientY - bounds.top) * maskCanvas.height / Math.max(1, bounds.height);
    return {
      x: Math.min(state.width, Math.max(0, canvasX * state.width / Math.max(1, maskCanvas.width))),
      y: Math.min(state.height, Math.max(0, canvasY * state.height / Math.max(1, maskCanvas.height))),
    };
  };

  const drawOperation = (context: CanvasRenderingContext2D, operation: MaskOperation): void => {
    if (operation.type === 'rect') {
      const start = imageToCanvasPoint({ x: operation.rect.x, y: operation.rect.y });
      const end = imageToCanvasPoint({ x: operation.rect.x + operation.rect.width, y: operation.rect.y + operation.rect.height });
      context.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
      return;
    }
    if (!operation.points.length) return;
    const radiusScale = state.width ? maskCanvas.width / state.width : 1;
    context.lineWidth = Math.max(2, operation.radius * 2 * radiusScale);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalCompositeOperation = operation.erase ? 'destination-out' : 'source-over';
    const first = imageToCanvasPoint(operation.points[0] ?? { x: 0, y: 0 });
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (let index = 1; index < operation.points.length; index += 1) {
      const point = operation.points[index];
      if (!point) continue;
      const canvasPoint = imageToCanvasPoint(point);
      context.lineTo(canvasPoint.x, canvasPoint.y);
    }
    if (operation.points.length === 1) context.lineTo(first.x + 0.01, first.y + 0.01);
    context.stroke();
    context.globalCompositeOperation = 'source-over';
  };

  const renderMask = (): void => {
    const context = maskCanvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    context.fillStyle = 'rgba(124, 115, 255, .34)';
    context.strokeStyle = 'rgba(166, 160, 255, .76)';
    for (const operation of state.operations) drawOperation(context, operation);
    if (state.activeStroke) drawOperation(context, state.activeStroke);
    if (state.activeRectStart && state.activeRectCurrent) {
      const rect = normalizeRect(state.activeRectStart, state.activeRectCurrent);
      const start = imageToCanvasPoint({ x: rect.x, y: rect.y });
      const end = imageToCanvasPoint({ x: rect.x + rect.width, y: rect.y + rect.height });
      context.fillStyle = 'rgba(124, 115, 255, .24)';
      context.strokeStyle = 'rgba(190, 186, 255, .9)';
      context.lineWidth = 2;
      context.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);
      context.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);
    }
  };

  const updateButtons = (): void => {
    const hasMask = state.operations.length > 0;
    undoButton.disabled = !hasMask || state.processing;
    resetMaskButton.disabled = !hasMask || state.processing;
    removeButton.disabled = !hasMask || state.processing || !state.bitmap;
    autoSelectButton.disabled = state.processing || !state.bitmap;
    newImageButton.disabled = state.processing;
    for (const button of modeButtons) button.disabled = state.processing;
  };

  const clearResult = (): void => {
    state.resultBlob = undefined;
    state.resultExtension = undefined;
    downloadButton.disabled = true;
    resultEmpty.hidden = false;
    resultLabel.textContent = 'Run Remove to preview';
    const context = resultCanvas.getContext('2d');
    context?.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
  };

  const maskChanged = (message = 'Mask updated. Run Remove to refresh the result.'): void => {
    clearResult();
    renderMask();
    selectionStatus.textContent = message;
    updateButtons();
  };

  const setMode = (mode: ToolMode): void => {
    state.mode = mode;
    for (const button of modeButtons) {
      const active = button.dataset.toolMode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    maskCanvas.dataset.mode = mode;
  };

  const scaledAutoRect = (selection: AutoSelection, detectWidth: number, detectHeight: number): PixelRect => ({
    x: selection.rect.x * state.width / Math.max(1, detectWidth),
    y: selection.rect.y * state.height / Math.max(1, detectHeight),
    width: selection.rect.width * state.width / Math.max(1, detectWidth),
    height: selection.rect.height * state.height / Math.max(1, detectHeight),
  });

  const runAutoSelect = async (): Promise<void> => {
    if (!state.bitmap || state.processing) return;
    const generation = state.generation;
    autoSelectButton.disabled = true;
    autoSelectButton.textContent = 'Scanning…';
    selectionStatus.textContent = 'Scanning the bottom-right corner locally…';
    try {
      const detectCanvas = document.createElement('canvas');
      const scale = Math.min(1, 720 / state.width, 720 / state.height);
      detectCanvas.width = Math.max(1, Math.round(state.width * scale));
      detectCanvas.height = Math.max(1, Math.round(state.height * scale));
      const context = detectCanvas.getContext('2d', { willReadFrequently: true });
      if (!context) throw new Error('Canvas image analysis is unavailable in this browser.');
      context.drawImage(state.bitmap, 0, 0, detectCanvas.width, detectCanvas.height);
      const imageData = context.getImageData(0, 0, detectCanvas.width, detectCanvas.height);
      const detectWidth = detectCanvas.width;
      const detectHeight = detectCanvas.height;
      detectCanvas.width = 1;
      detectCanvas.height = 1;
      const selection = await worker.detect(imageData.data.buffer as ArrayBuffer, detectWidth, detectHeight);
      if (generation !== state.generation) return;
      state.operations = [{ type: 'rect', rect: scaledAutoRect(selection, detectWidth, detectHeight) }];
      clearResult();
      renderMask();
      const label = selection.confidence === 'high' ? 'Strong match' : selection.confidence === 'medium' ? 'Possible match' : 'Suggested corner area';
      selectionStatus.textContent = `${label}. Adjust the purple mask if it covers important image details.`;
    } catch (error) {
      if (generation === state.generation) showNotice(error instanceof Error ? error.message : 'Auto Select could not analyze this image.', 'error');
    } finally {
      autoSelectButton.textContent = 'Auto Select';
      updateButtons();
    }
  };

  const resetWholeEditor = (): void => {
    state.generation += 1;
    state.bitmap?.close();
    state.file = undefined;
    state.bitmap = undefined;
    state.width = 0;
    state.height = 0;
    state.operations = [];
    state.activeRectStart = undefined;
    state.activeRectCurrent = undefined;
    state.activeStroke = undefined;
    state.processing = false;
    clearResult();
    for (const canvas of [originalCanvas, maskCanvas, resultCanvas]) { canvas.width = 1; canvas.height = 1; }
    fileInput.value = '';
    editor.hidden = true;
    uploadView.hidden = false;
    hideNotice();
    worker.reset('New image selected');
  };

  const loadFile = async (file: File): Promise<void> => {
    const generation = ++state.generation;
    hideNotice();
    if (!['image/jpeg', 'image/png', 'image/webp', ''].includes(file.type) || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension(file.name))) {
      showNotice('Choose a JPG, PNG, or WebP image.', 'error');
      return;
    }
    if (file.size > maxFileBytes) {
      showNotice(`This image is ${formatBytes(file.size)}. Preview limit: ${formatBytes(maxFileBytes)} per image.`, 'error');
      return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      if (generation !== state.generation) { bitmap.close(); return; }
      const pixels = bitmap.width * bitmap.height;
      if (bitmap.width > maxDimension || bitmap.height > maxDimension || pixels > maxPixels) {
        bitmap.close();
        showNotice(`This image is too large for safe local editing. Preview limit: ${maxPixels.toLocaleString('en-US')} pixels and ${maxDimension.toLocaleString('en-US')} px per side.`, 'error');
        return;
      }
      state.bitmap?.close();
      state.file = file;
      state.bitmap = bitmap;
      state.width = bitmap.width;
      state.height = bitmap.height;
      state.operations = [];
      state.processing = false;
      const preview = previewDimensions(bitmap.width, bitmap.height);
      setCanvasSize(preview.width, preview.height);
      const originalContext = originalCanvas.getContext('2d');
      if (!originalContext) throw new Error('Canvas preview is unavailable in this browser.');
      originalContext.clearRect(0, 0, preview.width, preview.height);
      originalContext.drawImage(bitmap, 0, 0, preview.width, preview.height);
      sourceName.textContent = file.name;
      sourceMeta.textContent = `${bitmap.width.toLocaleString('en-US')} × ${bitmap.height.toLocaleString('en-US')} · ${formatBytes(file.size)} · ${sourceExtension(file).toUpperCase()}`;
      uploadView.hidden = true;
      editor.hidden = false;
      selectionStatus.textContent = 'Auto Select will suggest the bottom-right watermark area.';
      clearResult();
      renderMask();
      updateButtons();
      await runAutoSelect();
    } catch (error) {
      showNotice(error instanceof Error ? error.message : 'This image could not be decoded locally.', 'error');
    }
  };

  const createFullResolutionPixels = (): Uint8ClampedArray => {
    if (!state.bitmap) throw new Error('Choose an image first.');
    const canvas = document.createElement('canvas');
    canvas.width = state.width;
    canvas.height = state.height;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('Canvas processing is unavailable in this browser.');
    context.drawImage(state.bitmap, 0, 0, state.width, state.height);
    const pixels = context.getImageData(0, 0, state.width, state.height).data;
    canvas.width = 1;
    canvas.height = 1;
    return pixels;
  };

  const renderAndEncodeResult = async (buffer: ArrayBuffer): Promise<Blob> => {
    if (!state.file) throw new Error('Choose an image first.');
    const config = outputConfig(state.file, outputFormat.value);
    const pixels = new Uint8ClampedArray(buffer);
    if (config.mime === 'image/jpeg') flattenForJpeg(pixels);
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = state.width;
    fullCanvas.height = state.height;
    const context = fullCanvas.getContext('2d');
    if (!context) throw new Error('Canvas output is unavailable in this browser.');
    context.putImageData(new ImageData(pixels, state.width, state.height), 0, 0);
    const previewContext = resultCanvas.getContext('2d');
    previewContext?.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    previewContext?.drawImage(fullCanvas, 0, 0, resultCanvas.width, resultCanvas.height);
    const blob = await canvasToBlob(fullCanvas, config.mime, Number(quality.value) / 100);
    fullCanvas.width = 1;
    fullCanvas.height = 1;
    if (config.mime === 'image/webp' && blob.type !== 'image/webp') throw new Error('This browser cannot export WebP. Choose PNG or JPEG instead.');
    state.resultExtension = config.extension;
    return blob;
  };

  const runRemove = async (): Promise<void> => {
    if (!state.bitmap || !state.file || !state.operations.length || state.processing) return;
    state.processing = true;
    updateButtons();
    removeButton.textContent = 'Repairing locally…';
    resultLabel.textContent = 'Processing full resolution';
    showNotice('Repairing only the selected pixels in a browser worker. Keep this tab open.', 'info');
    const generation = state.generation;
    try {
      const pixels = createFullResolutionPixels();
      const result = await worker.inpaint(pixels.buffer as ArrayBuffer, state.width, state.height, cloneOperations(state.operations));
      if (generation !== state.generation) return;
      state.resultBlob = await renderAndEncodeResult(result.pixels);
      resultEmpty.hidden = true;
      resultLabel.textContent = `${result.repairedPixels.toLocaleString('en-US')} pixels repaired`;
      downloadButton.disabled = false;
      showNotice('Repair complete. Compare the result before downloading; refine the mask and run it again if needed.', 'success');
    } catch (error) {
      if (generation === state.generation) {
        clearResult();
        showNotice(error instanceof Error ? error.message : 'Unable to repair this selection locally.', 'error');
      }
    } finally {
      state.processing = false;
      removeButton.textContent = 'Remove watermark';
      updateButtons();
    }
  };

  const downloadResult = (): void => {
    if (!state.resultBlob || !state.file || !state.resultExtension) return;
    const dot = state.file.name.lastIndexOf('.');
    const base = dot > 0 ? state.file.name.slice(0, dot) : state.file.name;
    const url = URL.createObjectURL(state.resultBlob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${base}-watermark-removed.${state.resultExtension}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (event) => { event.preventDefault(); dropZone.classList.add('is-dragging'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('is-dragging'));
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragging');
    const file = event.dataTransfer?.files[0];
    if (file) void loadFile(file);
  });
  fileInput.addEventListener('change', () => { const file = fileInput.files?.[0]; if (file) void loadFile(file); });
  newImageButton.addEventListener('click', resetWholeEditor);
  autoSelectButton.addEventListener('click', () => { void runAutoSelect(); });

  for (const button of modeButtons) {
    button.addEventListener('click', () => {
      const mode = button.dataset.toolMode;
      if (mode === 'rect' || mode === 'brush' || mode === 'erase') setMode(mode);
    });
  }

  brushSize.addEventListener('input', () => { brushValue.textContent = `${brushSize.value} px`; });
  undoButton.addEventListener('click', () => {
    state.operations.pop();
    maskChanged(state.operations.length ? 'Last mask edit undone.' : 'Mask cleared. Use Auto Select, Rectangle, or Brush to mark the watermark.');
  });
  resetMaskButton.addEventListener('click', () => {
    state.operations = [];
    maskChanged('Mask cleared. Use Auto Select, Rectangle, or Brush to mark the watermark.');
  });

  maskCanvas.addEventListener('pointerdown', (event) => {
    if (state.processing || !state.bitmap) return;
    event.preventDefault();
    maskCanvas.setPointerCapture(event.pointerId);
    const point = pointerToImagePoint(event);
    if (state.mode === 'rect') {
      state.activeRectStart = point;
      state.activeRectCurrent = point;
    } else {
      const previewBrushRadius = Number(brushSize.value) / 2;
      const imageRadius = previewBrushRadius * state.width / Math.max(1, maskCanvas.width);
      state.activeStroke = { type: 'stroke', erase: state.mode === 'erase', radius: Math.max(1, imageRadius), points: [point] };
    }
    renderMask();
  });

  maskCanvas.addEventListener('pointermove', (event) => {
    if (!maskCanvas.hasPointerCapture(event.pointerId)) return;
    const point = pointerToImagePoint(event);
    if (state.mode === 'rect' && state.activeRectStart) state.activeRectCurrent = point;
    else if (state.activeStroke) {
      const last = state.activeStroke.points[state.activeStroke.points.length - 1];
      if (!last || Math.hypot(point.x - last.x, point.y - last.y) > state.activeStroke.radius * 0.3) state.activeStroke.points.push(point);
    }
    renderMask();
  });

  const finishPointer = (event: PointerEvent): void => {
    if (!maskCanvas.hasPointerCapture(event.pointerId)) return;
    maskCanvas.releasePointerCapture(event.pointerId);
    if (state.activeRectStart && state.activeRectCurrent) {
      const rect = normalizeRect(state.activeRectStart, state.activeRectCurrent);
      const minSize = Math.max(2, state.width / Math.max(1, maskCanvas.width) * 3);
      if (rect.width >= minSize && rect.height >= minSize) state.operations.push({ type: 'rect', rect });
    } else if (state.activeStroke && state.activeStroke.points.length) state.operations.push(state.activeStroke);
    state.activeRectStart = undefined;
    state.activeRectCurrent = undefined;
    state.activeStroke = undefined;
    maskChanged();
  };
  maskCanvas.addEventListener('pointerup', finishPointer);
  maskCanvas.addEventListener('pointercancel', finishPointer);

  outputFormat.addEventListener('change', () => {
    const format = state.file ? outputConfig(state.file, outputFormat.value) : { mime: 'image/png' };
    quality.disabled = format.mime === 'image/png';
    if (state.resultBlob) maskChanged('Output settings changed. Run Remove again to create a new download.');
  });
  quality.addEventListener('input', () => {
    qualityValue.textContent = quality.value;
    if (state.resultBlob) maskChanged('Output quality changed. Run Remove again to create a new download.');
  });
  removeButton.addEventListener('click', () => { void runRemove(); });
  downloadButton.addEventListener('click', downloadResult);

  setMode('rect');
  qualityValue.textContent = quality.value;
  brushValue.textContent = `${brushSize.value} px`;
  updateButtons();
}
