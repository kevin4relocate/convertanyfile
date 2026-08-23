import { mountRegisteredImageTool } from '../image-tools/core/tool-registry';

async function initializeImageTool(root: HTMLElement): Promise<void> {
  const state = root.dataset.imageToolReady;
  if (state === 'true' || state === 'mounting') return;

  const toolId = root.dataset.toolId;
  if (!toolId) throw new Error('Image tool configuration is missing its tool id.');

  root.dataset.imageToolReady = 'mounting';
  try {
    const mounted = await mountRegisteredImageTool(toolId, root);
    if (!mounted) throw new Error(`Unsupported image tool: ${toolId}`);
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
