import { ConverterError } from '../../platform/converter/errors';
import type { ConversionArtifact, EngineAdapter, EngineCapabilities } from '../../platform/converter/types';
import { validateDataSample, type DataFormat } from './codec';
import { DATA_INPUT_EXTENSIONS, DATA_OUTPUTS, dataLabel, extensionFromFilename, normalizeDataExtension } from './formats';
import { DataWorkerClient } from './worker-client';

const CAPABILITIES: Omit<EngineCapabilities, 'version'> = {
  readable: ['csv', 'tsv', 'json', 'jsonl'],
  writable: ['csv', 'tsv', 'json', 'jsonl'],
};
const SAMPLE_BYTES = 64 * 1024;
let client = new DataWorkerClient();
let capabilitiesPromise: Promise<EngineCapabilities> | undefined;
let generation = 0;

function outputFor(id: string) { return DATA_OUTPUTS.find((item) => item.id === id); }
function replaceExtension(filename: string, extension: string): string {
  const slash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  const dot = filename.lastIndexOf('.');
  const base = dot > slash ? filename.slice(0, dot) : filename;
  return `${base}.${extension}`;
}

function looksLikeJsonValue(text: string): boolean {
  const first = text.trimStart()[0];
  return first === '{' || first === '[' || first === '"' || first === '-' || first === 't' || first === 'f' || first === 'n' || Boolean(first && first >= '0' && first <= '9');
}

function decodeSample(bytes: ArrayBuffer, truncated: boolean): string {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const text = decoder.decode(new Uint8Array(bytes), { stream: truncated });
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

async function sampleText(file: File): Promise<string | null> {
  try {
    const length = Math.min(file.size, SAMPLE_BYTES);
    return decodeSample(await file.slice(0, length).arrayBuffer(), length < file.size);
  } catch {
    return null;
  }
}

function validJsonlAdmissionSample(text: string, truncated: boolean): boolean {
  if (!truncated) return validateDataSample(text, 'jsonl');

  const lines = text.split(/\r?\n|\r/);
  const partialTail = lines.pop() ?? '';
  const completeLines = lines.map((line) => line.trim()).filter(Boolean).slice(0, 20);
  for (const line of completeLines) {
    try { JSON.parse(line); }
    catch { return false; }
  }
  if (completeLines.length > 0) return true;
  return looksLikeJsonValue(partialTail);
}

function cancelledError(): ConverterError {
  return new ConverterError('Conversion was cancelled', 'engine-crash', true);
}

export const dataEngine: EngineAdapter = {
  id: 'data',
  acceptedExtensions: DATA_INPUT_EXTENSIONS,
  acceptedExtensionsFor(requiredInput) {
    if (!requiredInput) return DATA_INPUT_EXTENSIONS;
    const normalized = normalizeDataExtension(requiredInput);
    return DATA_INPUT_EXTENSIONS.filter((extension) => normalizeDataExtension(extension) === normalized);
  },
  outputs: DATA_OUTPUTS,
  async validate(file, requiredInput) {
    const extension = normalizeDataExtension(extensionFromFilename(file.name));
    if (!extension || !CAPABILITIES.readable.includes(extension)) return null;
    if (requiredInput && normalizeDataExtension(requiredInput) !== extension) return null;
    const text = await sampleText(file);
    if (text === null) return null;
    const truncated = file.size > SAMPLE_BYTES;
    const validSample = extension === 'jsonl'
      ? validJsonlAdmissionSample(text, truncated)
      : validateDataSample(text, extension as DataFormat) || (extension === 'json' && looksLikeJsonValue(text));
    if (!validSample) return null;
    return { extension, label: dataLabel(extension), confidence: 'extension+content' };
  },
  initialize() {
    capabilitiesPromise ??= client.ready().then((version) => ({ ...CAPABILITIES, version }));
    return capabilitiesPromise;
  },
  supportsInput(extension, capabilities) {
    const normalized = normalizeDataExtension(extension);
    return Boolean(normalized && capabilities.readable.includes(normalized));
  },
  availableOutputs(capabilities) {
    return DATA_OUTPUTS.filter((output) => capabilities.writable.includes(output.id));
  },
  async convert(file, output, settings) {
    const config = outputFor(output);
    const inputFormat = normalizeDataExtension(extensionFromFilename(file.name));
    if (!config || !inputFormat || !CAPABILITIES.readable.includes(inputFormat)) throw new Error('Unsupported data format');

    const runGeneration = generation;
    const input = await file.arrayBuffer();
    if (runGeneration !== generation) throw cancelledError();

    const activeClient = client;
    const converted = await activeClient.convert(input, inputFormat, output, settings);
    if (runGeneration !== generation) throw cancelledError();

    return {
      blob: new Blob([converted], { type: config.mime }),
      filename: replaceExtension(file.name, config.extension),
      output,
    } satisfies ConversionArtifact;
  },
  reset(reason) {
    generation += 1;
    const previousClient = client;
    client = new DataWorkerClient();
    capabilitiesPromise = undefined;
    previousClient.reset(reason);
  },
};
