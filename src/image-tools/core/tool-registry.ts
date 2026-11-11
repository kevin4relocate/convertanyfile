import { getImageToolManifest } from '../../config/image-tools';
import type { ImageToolRuntimeFamily } from '../../platform/image-tools/types';

export interface MountableImageToolModule {
  mount: (root: HTMLElement) => void | Promise<void>;
}

type ImageToolLoader = () => Promise<MountableImageToolModule>;

const maskToolLoader: ImageToolLoader = async () => {
  const module = await import('../mask/mask-platform-editor');
  return { mount: module.mountMaskBatchPlatformEditor };
};

const deterministicToolLoader: ImageToolLoader = async () => {
  const module = await import('../deterministic/deterministic-platform-editor');
  return { mount: module.mountDeterministicImageTool };
};

const metadataCleanupLoader: ImageToolLoader = async () => {
  const module = await import('../metadata/metadata-cleanup-editor');
  return { mount: module.mountMetadataCleanup };
};

const renameToolLoader: ImageToolLoader = async () => {
  const module = await import('../naming/bulk-rename-editor');
  return { mount: module.mountBulkRenameImages };
};

const watermarkToolLoader: ImageToolLoader = async () => {
  const module = await import('../watermark/add-watermark-editor');
  return { mount: module.mountAddWatermark };
};

/**
 * Loader selection is by runtime family, not by each tool ID.
 * Adding a tool using an existing editor no longer requires editing this file.
 */
const RUNTIME_LOADERS = {
  mask: maskToolLoader,
  deterministic: deterministicToolLoader,
  'edge-fade': deterministicToolLoader,
  metadata: metadataCleanupLoader,
  rename: renameToolLoader,
  watermark: watermarkToolLoader,
} satisfies Record<ImageToolRuntimeFamily, ImageToolLoader>;

export async function mountRegisteredImageTool(toolId: string, root: HTMLElement): Promise<boolean> {
  const entry = getImageToolManifest(toolId);
  if (!entry || entry.tool.status === 'planned') return false;
  const module = await RUNTIME_LOADERS[entry.runtime]();
  await module.mount(root);
  return true;
}
