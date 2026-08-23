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

const IMAGE_TOOL_LOADERS: Record<string, ImageToolLoader> = {
  'remove-watermark': maskToolLoader,
  'gemini-ai-logo-remover': maskToolLoader,
  'resize-image': deterministicToolLoader,
  'compress-image': deterministicToolLoader,
  'rotate-flip-image': deterministicToolLoader,
  'crop-image': deterministicToolLoader,
  'blur-image': deterministicToolLoader,
};

export function hasImageToolLoader(toolId: string): boolean {
  return Object.prototype.hasOwnProperty.call(IMAGE_TOOL_LOADERS, toolId);
}

export async function mountRegisteredImageTool(toolId: string, root: HTMLElement): Promise<boolean> {
  const loader = IMAGE_TOOL_LOADERS[toolId];
  if (!loader) return false;
  const module = await loader();
  await module.mount(root);
  return true;
}
