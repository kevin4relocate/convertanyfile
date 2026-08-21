async function initializeImageTool(root: HTMLElement): Promise<void> {
  if (root.dataset.imageToolReady === 'true') return;
  root.dataset.imageToolReady = 'true';
  const toolId = root.dataset.toolId;
  if (toolId === 'remove-watermark') {
    const module = await import('../image-tools/remove-watermark/editor');
    module.mountRemoveWatermarkEditor(root);
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
