import { IMAGE_TOOL_ROADMAP } from '../../config/image-tools';

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

const IMAGE_TOOL_LOADERS = {
  'remove-watermark': maskToolLoader,
  'gemini-ai-logo-remover': maskToolLoader,
  'resize-image': deterministicToolLoader,
  'compress-image': deterministicToolLoader,
  'rotate-flip-image': deterministicToolLoader,
  'crop-image': deterministicToolLoader,
  'blur-image': deterministicToolLoader,
  'fade-image-edges': deterministicToolLoader,
  'remove-image-metadata': metadataCleanupLoader,
  'bulk-rename-images': renameToolLoader,
  'add-watermark': watermarkToolLoader,
} satisfies Record<(typeof IMAGE_TOOL_ROADMAP)[number]['id'], ImageToolLoader>;

type RegisteredImageToolId = keyof typeof IMAGE_TOOL_LOADERS;
const allToolIds = new Set<string>(Object.keys(IMAGE_TOOL_LOADERS));

export async function mountRegisteredImageTool(toolId: string, root: HTMLElement): Promise<boolean> {
  if (!allToolIds.has(toolId)) return false;
  const loader = IMAGE_TOOL_LOADERS[toolId as RegisteredImageToolId];
  if (!loader) return false;
  const module = await loader();
  await module.mount(root);
  return true;
}
