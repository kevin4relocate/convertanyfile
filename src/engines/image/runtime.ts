import type { ConversionArtifact, EngineAdapter, EngineCapabilities } from '../../platform/converter/types';
import { detectImage } from './detect';
import { IMAGE_INPUT_EXTENSIONS, IMAGE_OUTPUTS, normalizeImageExtension, runtimeImageOutputs, runtimeSupportsImageInput } from './formats';
import { ImageWorkerClient } from './worker-client';

let client = new ImageWorkerClient();
let capabilitiesPromise: Promise<EngineCapabilities> | undefined;

function outputFor(id: string) { return IMAGE_OUTPUTS.find((item) => item.id === id); }
function replaceExtension(filename: string, extension: string): string {
  const slash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  const dot = filename.lastIndexOf('.');
  const base = dot > slash ? filename.slice(0, dot) : filename;
  return `${base}.${extension}`;
}

export const imageEngine: EngineAdapter = {
  id: 'image', acceptedExtensions: IMAGE_INPUT_EXTENSIONS, outputs: IMAGE_OUTPUTS,
  async validate(file, requiredInput) {
    const detected = await detectImage(file);
    if (!detected) return null;
    if (requiredInput && normalizeImageExtension(requiredInput) !== normalizeImageExtension(detected.extension)) return null;
    return detected;
  },
  initialize() { capabilitiesPromise ??= client.capabilities(); return capabilitiesPromise; },
  supportsInput(extension, capabilities) { return runtimeSupportsImageInput(normalizeImageExtension(extension), new Set(capabilities.readable)); },
  availableOutputs(capabilities) { return runtimeImageOutputs(new Set(capabilities.writable)); },
  async convert(file, output, quality) {
    const config = outputFor(output); if (!config) throw new Error('Unsupported output format');
    const converted = await client.convert(await file.arrayBuffer(), output, quality);
    return { blob: new Blob([converted], { type: config.mime }), filename: replaceExtension(file.name, config.extension), output } satisfies ConversionArtifact;
  },
  reset(reason) { client.reset(reason); client = new ImageWorkerClient(); capabilitiesPromise = undefined; },
};
