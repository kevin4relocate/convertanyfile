import { mountRegisteredImageTool } from '../image-tools/core/tool-registry';

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
