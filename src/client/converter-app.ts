import { applyBatchPolicy } from '../platform/converter/batch-policy';
import { downloadBlob } from '../platform/converter/download';
import { loadEngine } from '../platform/converter/engine-registry';
import { buildZip } from '../platform/converter/zip';
import type { BatchPolicy, ConversionJob, EngineAdapter, EngineCapabilities, EngineId, OutputOption } from '../platform/converter/types';

interface SessionState { total: number; index: number; activeName: string; }
const formatBytes = (value: number): string => {
  if (value < 1024) return `${value} B`;
  if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;
  return `${(value / 1024 ** 3).toFixed(1)} GB`;
};
const escapeSelector = (value: string) => CSS.escape(value);

class ConverterController {
  private readonly root: HTMLElement;
  private readonly engineId: EngineId;
  private readonly requiredInput?: string;
  private readonly preferredOutput?: string;
  private readonly quickOutputs: string[];
  private readonly policy: BatchPolicy;
  private engine?: EngineAdapter;
  private capabilities?: EngineCapabilities;
  private enginePromise?: Promise<void>;
  private engineError?: string;
  private jobs: ConversionJob[] = [];
  private converting = false;
  private cancelRequested = false;
  private session: SessionState = { total: 0, index: 0, activeName: '' };
  private noticeTimer?: number;
  private readonly dropView: HTMLElement;
  private readonly dropZone: HTMLButtonElement;
  private readonly fileInput: HTMLInputElement;
  private readonly workspace: HTMLElement;
  private readonly batchSummary: HTMLElement;
  private readonly fileList: HTMLElement;
  private readonly outputSelect: HTMLSelectElement;
  private readonly qualityField: HTMLElement;
  private readonly qualityInput: HTMLInputElement;
  private readonly qualityLabel: HTMLElement;
  private readonly addMore: HTMLButtonElement;
  private readonly clearAll: HTMLButtonElement;
  private readonly convertButton: HTMLButtonElement;
  private readonly cancelButton: HTMLButtonElement;
  private readonly zipButton: HTMLButtonElement;
  private readonly resultSummary: HTMLElement;
  private readonly progressWrap: HTMLElement;
  private readonly progressText: HTMLElement;
  private readonly progressBar: HTMLElement;
  private readonly quickOutputsWrap: HTMLElement;
  private readonly notice: HTMLElement;
  private readonly engineState: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.engineId = (root.dataset.engine ?? 'image') as EngineId;
    this.requiredInput = root.dataset.input || undefined;
    this.preferredOutput = root.dataset.output || undefined;
    this.quickOutputs = (root.dataset.quickOutputs ?? '').split(',').map((v) => v.trim()).filter(Boolean);
    this.policy = {
      maxFiles: Number(root.dataset.maxFiles || 50),
      maxTotalBytes: Number(root.dataset.maxTotalBytes || 300 * 1024 * 1024),
      maxFileBytes: Number(root.dataset.maxFileBytes || 75 * 1024 * 1024),
    };
    const find = <T extends HTMLElement>(role: string): T => {
      const element = root.querySelector<T>(`[data-role="${escapeSelector(role)}"]`);
      if (!element) throw new Error(`Missing converter role: ${role}`);
      return element;
    };
    this.dropView = find('drop-view'); this.dropZone = find<HTMLButtonElement>('drop-zone'); this.fileInput = find<HTMLInputElement>('file-input');
    this.workspace = find('workspace'); this.batchSummary = find('batch-summary'); this.fileList = find('file-list'); this.outputSelect = find<HTMLSelectElement>('output-format');
    this.qualityField = find('quality-field'); this.qualityInput = find<HTMLInputElement>('quality'); this.qualityLabel = find('quality-label');
    this.addMore = find<HTMLButtonElement>('add-more'); this.clearAll = find<HTMLButtonElement>('clear-all'); this.convertButton = find<HTMLButtonElement>('convert-all');
    this.cancelButton = find<HTMLButtonElement>('cancel'); this.zipButton = find<HTMLButtonElement>('download-zip'); this.resultSummary = find('result-summary');
    this.progressWrap = find('progress'); this.progressText = find('progress-text'); this.progressBar = find('progress-bar'); this.quickOutputsWrap = find('quick-outputs');
    this.notice = find('notice'); this.engineState = find('engine-state');
    this.bindEvents(); this.render();
  }

  private bindEvents(): void {
    const openPicker = () => { void this.ensureEngine(); this.fileInput.click(); };
    this.dropZone.addEventListener('click', openPicker);
    this.dropZone.addEventListener('dragenter', () => void this.ensureEngine());
    this.dropZone.addEventListener('dragover', (event) => { event.preventDefault(); this.dropZone.classList.add('is-dragging'); });
    this.dropZone.addEventListener('dragleave', () => this.dropZone.classList.remove('is-dragging'));
    this.dropZone.addEventListener('drop', (event) => {
      event.preventDefault(); event.stopPropagation(); this.dropZone.classList.remove('is-dragging');
      if (event.dataTransfer?.files.length) void this.addFiles(Array.from(event.dataTransfer.files));
    });
    this.fileInput.addEventListener('change', () => {
      if (this.fileInput.files?.length) void this.addFiles(Array.from(this.fileInput.files));
      this.fileInput.value = '';
    });
    this.addMore.addEventListener('click', openPicker);
    this.clearAll.addEventListener('click', () => { if (!this.converting) { this.jobs = []; this.render(); } });
    this.outputSelect.addEventListener('change', () => { this.resetResults(); this.render(); });
    this.qualityInput.addEventListener('input', () => { this.qualityLabel.textContent = `Quality ${this.qualityInput.value}`; this.resetResults(); this.render(); });
    this.convertButton.addEventListener('click', () => void this.convertPending());
    this.cancelButton.addEventListener('click', () => this.cancel());
    this.zipButton.addEventListener('click', () => void this.downloadZip());
    this.root.addEventListener('paste', (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []); if (files.length && !this.converting) void this.addFiles(files);
    });
  }

  private async ensureEngine(): Promise<void> {
    if (this.capabilities || this.engineError) return;
    if (this.enginePromise) return this.enginePromise;
    this.enginePromise = (async () => {
      try {
        this.engine = await loadEngine(this.engineId);
        this.fileInput.accept = this.engine.acceptedExtensions.map((ext) => `.${ext}`).join(',');
        this.renderEngineState('loading', 'Preparing private converter…');
        this.capabilities = await this.engine.initialize();
        this.configureOutputs(this.engine.availableOutputs(this.capabilities));
        this.pruneUnsupportedRuntimeFiles();
        this.renderEngineState('ready', 'Private converter ready');
      } catch (error) {
        console.error('[ConvertAnyFile] Engine failed to initialize', error);
        this.engineError = 'The converter could not start. Refresh the page and try again.';
        this.renderEngineState('error', 'Converter unavailable');
        this.showNotice(this.engineError, 'error', 10_000);
      } finally { this.enginePromise = undefined; this.render(); }
    })();
    return this.enginePromise;
  }

  private configureOutputs(outputs: OutputOption[]): void {
    const previous = this.outputSelect.value; this.outputSelect.replaceChildren();
    for (const output of outputs) { const option = document.createElement('option'); option.value = output.id; option.textContent = output.label; this.outputSelect.append(option); }
    const preferred = outputs.find((o) => o.id === this.preferredOutput)?.id ?? outputs.find((o) => o.id === previous)?.id ?? outputs.find((o) => o.id === 'jpg')?.id ?? outputs[0]?.id;
    if (preferred) this.outputSelect.value = preferred;
    this.renderQuickOutputs(outputs);
  }

  private renderQuickOutputs(outputs: OutputOption[]): void {
    const allowed = new Set(outputs.map((output) => output.id)); this.quickOutputsWrap.replaceChildren();
    for (const id of this.quickOutputs) {
      if (!allowed.has(id)) continue;
      const output = outputs.find((item) => item.id === id)!;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'quick-output'; button.dataset.output = id; button.textContent = output.label;
      button.addEventListener('click', () => { this.outputSelect.value = id; this.resetResults(); this.render(); });
      this.quickOutputsWrap.append(button);
    }
  }

  private async addFiles(incoming: File[]): Promise<void> {
    if (this.converting) return;
    void this.ensureEngine();
    const admission = applyBatchPolicy(incoming, this.jobs.map((job) => job.file), this.policy);
    const rejected: string[] = [];
    for (const item of admission.rejected) {
      const label = item.reason === 'file-size' ? `over ${formatBytes(this.policy.maxFileBytes)} per file` : item.reason === 'file-count' ? `over the ${this.policy.maxFiles}-file limit` : `over the ${formatBytes(this.policy.maxTotalBytes)} batch limit`;
      rejected.push(`${item.file.name} (${label})`);
    }
    const engine = this.engine ?? await loadEngine(this.engineId); this.engine = engine;
    for (const file of admission.accepted) {
      const detected = await engine.validate(file, this.requiredInput);
      if (!detected) { rejected.push(`${file.name} (unsupported or invalid)`); continue; }
      this.jobs.push({ id: crypto.randomUUID(), file, detected, status: 'ready' });
    }
    if (rejected.length) {
      const preview = rejected.slice(0, 3).join(', '); const more = rejected.length > 3 ? ` +${rejected.length - 3} more` : '';
      this.showNotice(`${rejected.length} file${rejected.length === 1 ? '' : 's'} skipped: ${preview}${more}`, 'warning');
    }
    this.render();
  }

  private pruneUnsupportedRuntimeFiles(): void {
    if (!this.engine || !this.capabilities || !this.jobs.length) return;
    const removed = this.jobs.filter((job) => !this.engine!.supportsInput(job.detected.extension, this.capabilities!));
    if (!removed.length) return;
    const ids = new Set(removed.map((job) => job.id)); this.jobs = this.jobs.filter((job) => !ids.has(job.id));
    this.showNotice(`${removed.length} file${removed.length === 1 ? '' : 's'} skipped because the current image engine cannot decode the codec.`, 'warning');
  }

  private resetResults(): void {
    if (this.converting) return;
    this.jobs = this.jobs.map((job) => ({ ...job, status: 'ready', error: undefined, result: undefined }));
  }

  private async convertPending(targets?: readonly ConversionJob[]): Promise<void> {
    if (this.converting || !this.jobs.length) return;
    await this.ensureEngine(); if (!this.engine || !this.capabilities || this.engineError) return;
    const candidates = targets ?? this.jobs;
    const pending = candidates.filter((job) => this.jobs.includes(job) && job.status !== 'success'); if (!pending.length) return;
    this.converting = true; this.cancelRequested = false; this.session = { total: pending.length, index: 0, activeName: '' };
    const output = this.outputSelect.value; const quality = Number(this.qualityInput.value); this.render();
    for (let index = 0; index < pending.length; index += 1) {
      if (this.cancelRequested) break;
      const job = pending[index]!; this.session = { total: pending.length, index: index + 1, activeName: job.file.name };
      job.status = 'converting'; job.error = undefined; job.result = undefined; this.render(); this.scrollActiveJobIntoView(job.id);
      try { job.result = await this.engine.convert(job.file, output, quality); job.status = 'success'; }
      catch (error) {
        if (this.cancelRequested) { job.status = 'ready'; job.error = undefined; }
        else { console.error(`[ConvertAnyFile] Conversion failed: ${job.file.name}`, error); job.status = 'error'; job.error = error instanceof Error ? error.message : 'Conversion failed'; }
      }
      this.render();
    }
    this.converting = false; this.session = { total: 0, index: 0, activeName: '' }; this.render();
  }

  private cancel(): void {
    if (!this.converting || !this.engine) return;
    this.cancelRequested = true; this.engine.reset('Conversion cancelled'); this.capabilities = undefined; this.engineError = undefined;
    this.renderEngineState('loading', 'Stopping converter…'); this.showNotice('Conversion cancelled. Completed files were kept.', 'warning', 5000);
    window.setTimeout(() => void this.ensureEngine(), 50);
  }

  private retry(job: ConversionJob): void { if (!this.converting) { job.status = 'ready'; job.error = undefined; job.result = undefined; void this.convertPending([job]); } }

  private async downloadZip(): Promise<void> {
    const successful = this.jobs.filter((job) => job.status === 'success' && job.result); if (!successful.length) return;
    this.zipButton.disabled = true; const oldText = this.zipButton.textContent; this.zipButton.textContent = 'Preparing ZIP…';
    try { downloadBlob(await buildZip(successful), 'convertanyfile-converted.zip'); }
    finally { this.zipButton.disabled = false; this.zipButton.textContent = oldText ?? 'Download ZIP'; }
  }

  private render(): void {
    const hasJobs = this.jobs.length > 0; this.dropView.hidden = hasJobs; this.workspace.hidden = !hasJobs; if (!hasJobs) return;
    const inputBytes = this.jobs.reduce((sum, job) => sum + job.file.size, 0);
    const successful = this.jobs.filter((job) => job.status === 'success' && job.result); const failed = this.jobs.filter((job) => job.status === 'error');
    const outputBytes = successful.reduce((sum, job) => sum + (job.result?.blob.size ?? 0), 0); const pending = this.jobs.filter((job) => job.status !== 'success').length;
    this.batchSummary.textContent = `${this.jobs.length} ${this.jobs.length === 1 ? 'file' : 'files'} · ${formatBytes(inputBytes)}`;
    this.fileList.replaceChildren(...this.jobs.map((job) => this.renderJob(job)));
    this.addMore.disabled = this.converting; this.clearAll.disabled = this.converting; this.outputSelect.disabled = this.converting || !this.capabilities; this.qualityInput.disabled = this.converting || !this.capabilities;
    const output = this.engine?.outputs.find((item) => item.id === this.outputSelect.value); this.qualityField.hidden = !output?.supportsQuality; this.qualityLabel.textContent = `Quality ${this.qualityInput.value}`;
    for (const button of this.quickOutputsWrap.querySelectorAll<HTMLButtonElement>('.quick-output')) { button.disabled = this.converting; button.classList.toggle('is-active', button.dataset.output === this.outputSelect.value); }
    this.progressWrap.hidden = !this.converting;
    if (this.converting) {
      this.progressText.textContent = `Converting ${this.session.index} of ${this.session.total} · ${this.session.activeName}`;
      const progress = this.session.total ? Math.max(0, ((this.session.index - 1) / this.session.total) * 100) : 0; this.progressBar.style.width = `${progress}%`;
    }
    this.cancelButton.hidden = !this.converting; this.convertButton.hidden = this.converting || pending === 0; this.convertButton.disabled = !this.capabilities || Boolean(this.engineError);
    this.convertButton.textContent = this.engineError ? 'Converter unavailable' : !this.capabilities ? 'Preparing converter…' : successful.length > 0 ? `Convert remaining ${pending}` : `Convert ${this.jobs.length} ${this.jobs.length === 1 ? 'File' : 'Files'}`;
    this.zipButton.hidden = this.converting || successful.length === 0; this.resultSummary.hidden = successful.length === 0 && failed.length === 0;
    if (!this.resultSummary.hidden) {
      const delta = inputBytes > 0 && successful.length === this.jobs.length ? Math.round((1 - outputBytes / inputBytes) * 100) : null;
      const sizeText = successful.length === this.jobs.length ? ` · ${formatBytes(inputBytes)} → ${formatBytes(outputBytes)}${delta !== null ? ` · ${Math.abs(delta)}% ${delta >= 0 ? 'smaller' : 'larger'}` : ''}` : '';
      this.resultSummary.textContent = `${successful.length}/${this.jobs.length} converted${failed.length ? ` · ${failed.length} failed` : ''}${sizeText}`;
    }
  }

  private renderJob(job: ConversionJob): HTMLElement {
    const row = document.createElement('article'); row.className = `file-row status-${job.status}`; row.dataset.jobId = job.id;
    const main = document.createElement('div'); main.className = 'file-main'; const badge = document.createElement('span'); badge.className = 'format-badge'; badge.textContent = job.detected.extension.toUpperCase().slice(0, 5);
    const text = document.createElement('div'); text.className = 'file-text'; const name = document.createElement('strong'); name.textContent = job.file.name; name.title = job.file.name;
    const meta = document.createElement('span'); meta.textContent = `${job.detected.label} · ${formatBytes(job.file.size)}`; text.append(name, meta); main.append(badge, text);
    const status = document.createElement('div'); status.className = 'file-status';
    if (job.status === 'success' && job.result) {
      const delta = Math.round((1 - job.result.blob.size / job.file.size) * 100); status.textContent = `Converted · ${formatBytes(job.result.blob.size)}${Number.isFinite(delta) ? ` · ${Math.abs(delta)}% ${delta >= 0 ? 'smaller' : 'larger'}` : ''}`;
    } else if (job.status === 'error') status.textContent = job.error ?? 'Failed';
    else if (job.status === 'converting') status.textContent = 'Converting…';
    else status.textContent = this.capabilities ? 'Ready' : 'Preparing converter…';
    const actions = document.createElement('div'); actions.className = 'row-actions';
    if (job.status === 'success' && job.result) {
      const download = document.createElement('button'); download.type = 'button'; download.className = 'row-action'; download.textContent = 'Download'; download.addEventListener('click', () => downloadBlob(job.result!.blob, job.result!.filename)); actions.append(download);
    } else if (job.status === 'error') {
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'row-action'; retry.textContent = 'Retry'; retry.disabled = this.converting; retry.addEventListener('click', () => this.retry(job)); actions.append(retry);
    }
    if (job.status !== 'converting' && job.status !== 'success') {
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-action'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${job.file.name}`); remove.disabled = this.converting;
      remove.addEventListener('click', () => { this.jobs = this.jobs.filter((item) => item.id !== job.id); this.render(); }); actions.append(remove);
    }
    row.append(main, status, actions); return row;
  }

  private renderEngineState(state: 'idle' | 'loading' | 'ready' | 'error', label: string): void {
    this.engineState.dataset.state = state; const text = this.engineState.querySelector('[data-engine-label]'); if (text) text.textContent = label;
  }
  private showNotice(message: string, type: 'warning' | 'error', duration = 7000): void {
    if (this.noticeTimer) window.clearTimeout(this.noticeTimer); this.notice.textContent = message; this.notice.dataset.type = type; this.notice.hidden = false;
    this.noticeTimer = window.setTimeout(() => { this.notice.hidden = true; }, duration);
  }
  private scrollActiveJobIntoView(id: string): void { this.fileList.querySelector<HTMLElement>(`[data-job-id="${escapeSelector(id)}"]`)?.scrollIntoView({ block: 'nearest' }); }
}

export function initConverters(): void {
  document.querySelectorAll<HTMLElement>('[data-converter-app]').forEach((root) => {
    if (root.dataset.initialized === 'true') return; root.dataset.initialized = 'true'; new ConverterController(root);
  });
}
initConverters();
