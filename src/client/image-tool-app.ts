import { mountRegisteredImageTool } from '../image-tools/core/tool-registry';
import { mountVisualRegionController } from '../image-tools/selection/visual-region-controller';

function syncQualityControls(root: HTMLElement): void {
  const pairs: Array<{ format?: HTMLSelectElement; quality?: HTMLInputElement }> = [
    {
      format: root.querySelector<HTMLSelectElement>('[data-role="output-format"]') ?? undefined,
      quality: root.querySelector<HTMLInputElement>('[data-role="output-quality"]') ?? undefined,
    },
    {
      format: root.querySelector<HTMLSelectElement>('[data-setting="format"]') ?? undefined,
      quality: root.querySelector<HTMLInputElement>('[data-setting="quality"]') ?? undefined,
    },
  ];

  for (const { format, quality } of pairs) {
    if (!format || !quality) continue;
    const apply = (): void => {
      const disabled = format.value === 'png';
      quality.disabled = disabled;
      quality.setAttribute('aria-disabled', String(disabled));
      const label = quality.closest<HTMLElement>('label');
      label?.classList.toggle('is-quality-disabled', disabled);
      if (disabled) quality.title = 'PNG output is lossless, so the quality setting is not used.';
      else quality.removeAttribute('title');
    };
    format.addEventListener('change', apply);
    apply();
  }
}

function initMaskResultActions(root: HTMLElement): void {
  if (root.dataset.maskResultActionsReady === 'true') return;
  const process = root.querySelector<HTMLButtonElement>('[data-role="remove"]');
  const download = root.querySelector<HTMLButtonElement>('[data-role="download"]');
  if (!process || !download) return;

  root.dataset.maskResultActionsReady = 'true';

  const setPrimary = (button: HTMLButtonElement, primary: boolean): void => {
    button.classList.toggle('image-tool-cta--primary', primary);
    button.classList.toggle('image-tool-cta--secondary', !primary);
  };

  const sync = (): void => {
    const hasResults = !download.disabled;

    if (!hasResults && process.textContent?.trim() !== 'Run repair again') {
      process.dataset.processLabel = process.textContent?.trim() || 'Process images';
    }

    if (hasResults) {
      setPrimary(process, false);
      setPrimary(download, true);
      process.textContent = 'Run repair again';
      process.title = 'Process the current mask and settings again.';
      download.title = 'Download the processed result.';
      root.dataset.maskActionState = 'results-ready';
      return;
    }

    setPrimary(process, true);
    setPrimary(download, false);
    if (process.textContent?.trim() === 'Run repair again') {
      process.textContent = process.dataset.processLabel || 'Process images';
    }
    process.removeAttribute('title');
    download.removeAttribute('title');
    root.dataset.maskActionState = 'editing';
  };

  const observer = new MutationObserver(sync);
  observer.observe(process, { attributes: true, attributeFilter: ['disabled', 'hidden'], childList: true, characterData: true, subtree: true });
  observer.observe(download, { attributes: true, attributeFilter: ['disabled', 'hidden'], childList: true, characterData: true, subtree: true });

  window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
  sync();
}

function initStickyImageToolActions(root: HTMLElement): void {
  if (root.dataset.stickyActionsReady === 'true') return;

  const editor = root.querySelector<HTMLElement>('[data-role="editor"]');
  const actionBar = root.querySelector<HTMLElement>('[data-role="batch-action-bar"]');
  const processPrimary = root.querySelector<HTMLButtonElement>('[data-role="remove"], [data-role="process-batch"]');
  const downloadAction = root.querySelector<HTMLButtonElement>('[data-role="download"], [data-role="download-batch"]');
  const batchCount = root.querySelector<HTMLElement>('[data-role="batch-count"]');
  const resultSummary = root.querySelector<HTMLElement>('[data-role="batch-result-summary"]');
  const preparedSummary = root.querySelector<HTMLElement>('[data-role="prepared-summary"]')
    ?? actionBar?.querySelector<HTMLElement>('.image-batch-action-bar__summary small')
    ?? null;
  const progress = root.querySelector<HTMLElement>('[data-role="batch-progress"]');
  const cancel = root.querySelector<HTMLButtonElement>('[data-role="cancel"], [data-role="cancel-batch"]');
  if (!actionBar || !processPrimary) return;

  root.dataset.stickyActionsReady = 'true';

  const currentPrimary = (): HTMLButtonElement => {
    if (downloadAction?.classList.contains('image-tool-cta--primary')) return downloadAction;
    return processPrimary;
  };

  const sticky = document.createElement('div');
  sticky.className = 'tool-sticky-action-bar image-tool-sticky-action-bar';
  sticky.hidden = true;
  sticky.innerHTML = '<div class="tool-sticky-summary"><strong data-sticky-count>0 images</strong><span data-sticky-detail>Ready to process</span></div><button class="primary-button" type="button" data-sticky-primary>Process images</button>';
  document.body.append(sticky);

  const stickyCount = sticky.querySelector<HTMLElement>('[data-sticky-count]')!;
  const stickyDetail = sticky.querySelector<HTMLElement>('[data-sticky-detail]')!;
  const stickyPrimary = sticky.querySelector<HTMLButtonElement>('[data-sticky-primary]')!;
  let actionVisible = true;

  const sync = (): void => {
    const primary = currentPrimary();
    const count = Number(batchCount?.textContent?.trim() || '0');
    const hasItems = root.dataset.hasItems === 'true' || count > 0;
    const editorVisible = editor ? !editor.hidden && hasItems : hasItems;
    const progressVisible = progress ? !progress.hidden : false;
    const processing = processPrimary.textContent?.includes('Processing') === true
      || Boolean(cancel && progressVisible && !cancel.hidden);
    const unavailable = primary.disabled || primary.hidden || processing;

    stickyCount.textContent = `${count} ${count === 1 ? 'image' : 'images'}`;
    stickyDetail.textContent = resultSummary?.textContent?.trim()
      || preparedSummary?.textContent?.trim()
      || 'Ready to process';
    stickyPrimary.textContent = primary.textContent?.trim() || 'Process images';
    stickyPrimary.disabled = primary.disabled;
    sticky.hidden = !editorVisible || unavailable || actionVisible;
  };

  stickyPrimary.addEventListener('click', () => currentPrimary().click());

  const observer = new MutationObserver(sync);
  observer.observe(root, { attributes: true, attributeFilter: ['data-has-items', 'data-mask-action-state'] });
  if (editor) observer.observe(editor, { attributes: true, attributeFilter: ['hidden'] });
  observer.observe(processPrimary, { attributes: true, attributeFilter: ['disabled', 'hidden', 'class'], childList: true, characterData: true, subtree: true });
  if (downloadAction) observer.observe(downloadAction, { attributes: true, attributeFilter: ['disabled', 'hidden', 'class'], childList: true, characterData: true, subtree: true });
  if (batchCount) observer.observe(batchCount, { childList: true, characterData: true, subtree: true });
  if (resultSummary) observer.observe(resultSummary, { childList: true, characterData: true, subtree: true });
  if (preparedSummary) observer.observe(preparedSummary, { childList: true, characterData: true, subtree: true });
  if (progress) observer.observe(progress, { attributes: true, attributeFilter: ['hidden'] });
  if (cancel) observer.observe(cancel, { attributes: true, attributeFilter: ['hidden', 'disabled'] });

  const visibility = new IntersectionObserver((entries) => {
    actionVisible = entries[0]?.isIntersecting ?? true;
    sync();
  }, { threshold: 0.12 });
  visibility.observe(actionBar);

  window.addEventListener('pagehide', () => {
    visibility.disconnect();
    observer.disconnect();
    sticky.remove();
  }, { once: true });

  sync();
}

async function initializeImageTool(root: HTMLElement): Promise<void> {
  const state = root.dataset.imageToolReady;
  if (state === 'true' || state === 'mounting') return;

  const toolId = root.dataset.toolId;
  if (!toolId) throw new Error('Image tool configuration is missing its tool id.');

  root.dataset.imageToolReady = 'mounting';
  try {
    const mounted = await mountRegisteredImageTool(toolId, root);
    if (!mounted) throw new Error(`Unsupported image tool: ${toolId}`);
    syncQualityControls(root);
    mountVisualRegionController(root);
    initMaskResultActions(root);
    initStickyImageToolActions(root);
    root.dataset.imageToolReady = 'true';
  } catch (error) {
    delete root.dataset.imageToolReady;
    throw error;
  }
}

function bootImageTools(): void {
  document.querySelectorAll<HTMLElement>('[data-image-tool-app]').forEach((root) => {
    initializeImageTool(root).catch((error) => {
      const notice = root.querySelector<HTMLElement>('[data-role="notice"]');
      if (notice) {
        notice.hidden = false;
        notice.dataset.type = 'error';
        notice.textContent = error instanceof Error ? error.message : 'Unable to start this local image tool.';
      }
    });
  });
}

bootImageTools();
