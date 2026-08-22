import type { ImageToolDefinition } from '../../platform/image-tools/types';

export interface FileValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateImageFile(file: File, tool: ImageToolDefinition): FileValidationResult {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  const extensionAccepted = tool.acceptedExtensions.includes(extension);
  const mimeAccepted = !file.type || tool.acceptedMimeTypes.includes(file.type);

  if (!extensionAccepted || !mimeAccepted) {
    return { ok: false, reason: `Unsupported image format: ${file.name}` };
  }

  if (file.size > tool.maxFileBytes) {
    const limitMb = Math.max(1, Math.floor(tool.maxFileBytes / (1024 * 1024)));
    return { ok: false, reason: `${file.name} exceeds the ${limitMb} MB file limit.` };
  }

  return { ok: true };
}

export function validateBatchSize(files: readonly File[], tool: ImageToolDefinition): FileValidationResult {
  const maxFiles = tool.maxFiles ?? 50;
  if (files.length > maxFiles) {
    return { ok: false, reason: `You can process up to ${maxFiles} images at a time.` };
  }
  return { ok: true };
}
