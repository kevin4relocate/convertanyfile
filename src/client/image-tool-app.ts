function initStickyImageToolActions(root: HTMLElement): void {
  if (root.dataset.stickyActionsReady === 'true') return;

  const editor = root.querySelector<HTMLElement>('[data-role="editor"]');
  const actionBar = root.querySelector<HTMLElement>('.gemini-batch-action-bar');
  const primary = root.querySelector<HTMLButtonElement>('[data-role="remove"]');
  const batchCount = root.querySelector<HTMLElement>('[data-role="batch-count"]');
  const resultSummary = root.querySelector<HTMLElement>('[data-role="batch-result-summary"]');
  const preparedSummary = root.querySelector<HTMLElement>('[data-role="prepared-summary"]');
  const cancel = root.querySelector<HTMLButtonElement>('[data-role="cancel"]');
  if (!editor || !actionBar || !primary) return;

  root.dataset.stickyActionsReady = 'true';

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
    const count = Number(batchCount?.textContent?.trim() || '0');
    const editorVisible = !editor.hidden && count > 0;
    const processing = Boolean(cancel && !cancel.hidden);
    const unavailable = primary.disabled || primary.hidden || processing;

    stickyCount.textContent = `${count} ${count === 1 ? 'image' : 'images'}`;
    stickyDetail.textContent = resultSummary?.textContent?.trim() || preparedSummary?.textContent?.trim() || 'Ready to process';
    stickyPrimary.textContent = primary.textContent?.trim() || 'Process images';
    stickyPrimary.disabled = primary.disabled;
    sticky.hidden = !editorVisible || unavailable || actionVisible;
  };

  stickyPrimary.addEventListener('click', () => primary.click());

  const observer = new MutationObserver(sync);
  observer.observe(editor, { attributes: true, attributeFilter: ['hidden'] });
  observer.observe(primary, { attributes: true, attributeFilter: ['disabled', 'hidden'], childList: true, characterData: true, subtree: true });
  if (batchCount) observer.observe(batchCount, { childList: true, characterData: true, subtree: true });
  if (resultSummary) observer.observe(resultSummary, { childList: true, characterData: true, subtree: true });
  if (preparedSummary) observer.observe(preparedSummary, { childList: true, characterData: true, subtree: true });
  if (cancel) observer.observe(cancel, { attributes: true, attributeFilter: ['hidden'] });

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
  if (root.dataset.imageToolReady === 'true') return;
  root.dataset.imageToolReady = 'true';
  const toolId = root.dataset.toolId;
  if (toolId === 'remove-watermark' || toolId === 'gemini-ai-logo-remover' || toolId === 'remove-object') {
    const module = await import('../image-tools/shared/batch-mask-editor');
    module.mountBatchMaskEditor(root);
    initStickyImageToolActions(root);
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
