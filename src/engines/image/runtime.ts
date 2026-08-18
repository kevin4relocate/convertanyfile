import { ConverterError } from '../../platform/converter/errors';
import type { ConversionArtifact, EngineAdapter, EngineCapabilities, RangeOutputControl } from '../../platform/converter/types';
import { detectImage } from './detect';
import { extensionFromFilename, IMAGE_INPUT_EXTENSIONS, IMAGE_OUTPUTS, normalizeImageExtension, runtimeImageOutputs, runtimeSupportsImageInput } from './formats';
import { ImageWorkerClient } from './worker-client';

let client = new ImageWorkerClient();
let capabilitiesPromise: Promise<EngineCapabilities> | undefined;
let generation = 0;

const MAX_IMAGE_DIMENSION = 20_000;
const MAX_ESTIMATED_DECODED_BYTES = 320 * 1024 * 1024;

function outputFor(id: string) { return IMAGE_OUTPUTS.find((item) => item.id === id); }
function replaceExtension(filename: string, extension: string): string {
  const slash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  const dot = filename.lastIndexOf('.');
  const base = dot > slash ? filename.slice(0, dot) : filename;
  return `${base}.${extension}`;
}
function cancelledError(): ConverterError {
  return new ConverterError('Conversion was cancelled', 'engine-crash', true);
}

export const imageEngine: EngineAdapter = {
  id: 'image', acceptedExtensions: IMAGE_INPUT_EXTENSIONS, outputs: IMAGE_OUTPUTS,
  acceptedExtensionsFor(requiredInput) {
    if (!requiredInput) return IMAGE_INPUT_EXTENSIONS;
    const normalized = normalizeImageExtension(requiredInput);
    return IMAGE_INPUT_EXTENSIONS.filter((extension) => normalizeImageExtension(extension) === normalized);
  },
  async validate(file, requiredInput) {
    const detected = await detectImage(file);
    if (!detected) return null;
    if (requiredInput && normalizeImageExtension(requiredInput) !== normalizeImageExtension(detected.extension)) return null;
    if (detected.width && detected.height) {
      if (detected.width > MAX_IMAGE_DIMENSION || detected.height > MAX_IMAGE_DIMENSION || (detected.estimatedDecodedBytes ?? 0) > MAX_ESTIMATED_DECODED_BYTES) return null;
    }
    return detected;
  },
  initialize() { capabilitiesPromise ??= client.capabilities(); return capabilitiesPromise; },
  supportsInput(extension, capabilities) { return runtimeSupportsImageInput(normalizeImageExtension(extension), new Set(capabilities.readable)); },
  availableOutputs(capabilities) { return runtimeImageOutputs(new Set(capabilities.writable)); },
  async convert(file, output, settings) {
    const config = outputFor(output); if (!config) throw new Error('Unsupported output format');
    const detected = await detectImage(file);
    const inputFormat = normalizeImageExtension(detected?.extension ?? extensionFromFilename(file.name));
    const qualityControl = config.controls?.find((control): control is RangeOutputControl => control.id === 'quality' && control.type === 'range');
    const requestedQuality = Number(settings.quality ?? qualityControl?.defaultValue ?? 90);
    const quality = Number.isFinite(requestedQuality)
      ? Math.min(qualityControl?.max ?? 100, Math.max(qualityControl?.min ?? 1, requestedQuality))
      : qualityControl?.defaultValue ?? 90;

    const runGeneration = generation;
    const input = await file.arrayBuffer();
    if (runGeneration !== generation) throw cancelledError();

    const activeClient = client;
    const converted = await activeClient.convert(input, inputFormat, output, quality);
    if (runGeneration !== generation) throw cancelledError();

    return { blob: new Blob([converted], { type: config.mime }), filename: replaceExtension(file.name, config.extension), output } satisfies ConversionArtifact;
  },
  reset(reason) {
    generation += 1;
    const previousClient = client;
    client = new ImageWorkerClient();
    capabilitiesPromise = undefined;
    previousClient.reset(reason);
  },
};