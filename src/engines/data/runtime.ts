import type { ConversionArtifact, EngineAdapter, EngineCapabilities } from '../../platform/converter/types';
import { decodeUtf8, validateDataSample, type DataFormat } from './codec';
import { DATA_INPUT_EXTENSIONS, DATA_OUTPUTS, dataLabel, extensionFromFilename, normalizeDataExtension } from './formats';
import { DataWorkerClient } from './worker-client';

const CAPABILITIES: EngineCapabilities = {
  readable: ['csv', 'tsv', 'json', 'jsonl'],
  writable: ['csv', 'tsv', 'json', 'jsonl'],
  version: 'browser-text-v1',
};
const SAMPLE_BYTES = 64 * 1024;
let client = new DataWorkerClient();

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

async function sampleText(file: File, format: DataFormat): Promise<string | null> {
  try {
    const length = Math.min(file.size, SAMPLE_BYTES);
    let text = decodeUtf8(await file.slice(0, length).arrayBuffer());
    if (format === 'jsonl' && length < file.size) {
      const cut = Math.max(text.lastIndexOf('\n'), text.lastIndexOf('\r'));
      if (cut > 0) text = text.slice(0, cut);
    }
    return text;
  } catch {
    return null;
  }
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
    const text = await sampleText(file, extension as DataFormat);
    if (text === null) return null;
    const validSample = validateDataSample(text, extension as DataFormat) || (extension === 'json' && looksLikeJsonValue(text));
    if (!validSample) return null;
    return { extension, label: dataLabel(extension), confidence: 'extension+content' };
  },
  async initialize() { return CAPABILITIES; },
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
    const converted = await client.convert(await file.arrayBuffer(), inputFormat, output, settings);
    return {
      blob: new Blob([converted], { type: config.mime }),
      filename: replaceExtension(file.name, config.extension),
      output,
    } satisfies ConversionArtifact;
  },
  reset(reason) {
    client.reset(reason);
    client = new DataWorkerClient();
  },
};
