export interface MountableImageToolModule {
  mount: (root: HTMLElement) => void | Promise<void>;
}

type ImageToolLoader = () => Promise<MountableImageToolModule>;

const maskToolLoader: ImageToolLoader = async () => {
  const module = await import('../shared/batch-mask-editor');
  return { mount: module.mountBatchMaskEditor };
};

const IMAGE_TOOL_LOADERS: Record<string, ImageToolLoader> = {
  'remove-watermark': maskToolLoader,
  'gemini-ai-logo-remover': maskToolLoader,
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
