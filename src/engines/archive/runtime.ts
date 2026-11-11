import { ConverterError } from '../../platform/converter/errors';
import type { ConversionArtifact, EngineAdapter, EngineCapabilities } from '../../platform/converter/types';
import { ARCHIVE_INPUT_EXTENSIONS, ARCHIVE_OUTPUTS, archiveLabel, extensionFromArchiveFilename, normalizeArchiveExtension } from './formats';
import type { ArchiveInputFormat, ArchiveOutputFormat, ArchiveZipCompression } from './protocol';
import { ArchiveWorkerClient } from './worker-client';

let client = new ArchiveWorkerClient();
let capabilitiesPromise: Promise<EngineCapabilities> | undefined;
let generation = 0;

function outputFor(id: string) { return ARCHIVE_OUTPUTS.find((item) => item.id === id); }
function replaceArchiveExtension(filename: string, extension: string): string {
  const lower = filename.toLowerCase();
  const strip = lower.endsWith('.tar.gz') ? 7 : lower.endsWith('.gzip') ? 5 : filename.lastIndexOf('.') >= 0 ? filename.length - filename.lastIndexOf('.') : 0;
  const base = strip ? filename.slice(0, -strip) : filename;
  return `${base}.${extension}`;
}
function cancelledError(): ConverterError { return new ConverterError('Conversion was cancelled', 'engine-crash', true); }

function tarHeaderLooksValid(sample: Uint8Array): boolean {
  if (sample.byteLength < 512) return false;
  const decoder = new TextDecoder();
  const rawChecksum = decoder.decode(sample.subarray(148, 156)).replace(/\0.*$/, '').trim();
  const expected = Number.parseInt(rawChecksum, 8);
  if (!Number.isFinite(expected)) return false;
  let actual = 0;
  for (let index = 0; index < 512; index += 1) actual += index >= 148 && index < 156 ? 32 : sample[index]!;
  return expected === actual;
}

function startsWith(sample: Uint8Array, signature: readonly number[]): boolean {
  return sample.byteLength >= signature.length && signature.every((value, index) => sample[index] === value);
}

function archiveSignatureMatches(extension: string, sample: Uint8Array): boolean {
  if (extension === 'zip') {
    return sample.length >= 4 && sample[0] === 0x50 && sample[1] === 0x4b && [0x03, 0x05, 0x07].includes(sample[2]!) && [0x04, 0x06, 0x08].includes(sample[3]!);
  }
  if (extension === '7z') return startsWith(sample, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
  if (extension === 'rar') {
    return startsWith(sample, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x00])
      || startsWith(sample, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07, 0x01, 0x00]);
  }
  if (extension === 'tgz' || extension === 'gz') return startsWith(sample, [0x1f, 0x8b]);
  if (extension === 'tar') return tarHeaderLooksValid(sample);
  return false;
}

function zipCompressionSetting(value: unknown): ArchiveZipCompression {
  return value === 'store' || value === 'maximum' ? value : 'balanced';
}

export const archiveEngine: EngineAdapter = {
  id: 'archive',
  acceptedExtensions: ARCHIVE_INPUT_EXTENSIONS,
  acceptedExtensionsFor(requiredInput) {
    if (!requiredInput) return ARCHIVE_INPUT_EXTENSIONS;
    const normalized = normalizeArchiveExtension(requiredInput);
    return ARCHIVE_INPUT_EXTENSIONS.filter((extension) => normalizeArchiveExtension(extension) === normalized);
  },
  outputs: ARCHIVE_OUTPUTS,
  async validate(file, requiredInput) {
    const extension = normalizeArchiveExtension(extensionFromArchiveFilename(file.name));
    if (!['zip', '7z', 'rar', 'tar', 'tgz', 'gz'].includes(extension)) return null;
    if (requiredInput && normalizeArchiveExtension(requiredInput) !== extension) return null;
    const sample = new Uint8Array(await file.slice(0, 512).arrayBuffer());
    if (!archiveSignatureMatches(extension, sample)) return null;
    return { extension, label: archiveLabel(extension), confidence: 'signature+extension' };
  },
  initialize() {
    capabilitiesPromise ??= client.ready().then(({ version, gzip, wasm }) => ({
      readable: [
        'zip',
        'tar',
        ...(wasm ? ['7z', 'rar'] : []),
        ...(gzip ? ['tgz', 'gz'] : []),
      ],
      writable: gzip ? ['zip', 'tar', 'tgz'] : ['zip', 'tar'],
      version,
    }));
    return capabilitiesPromise;
  },
  supportsInput(extension, capabilities) {
    return capabilities.readable.includes(normalizeArchiveExtension(extension));
  },
  availableOutputs(capabilities) {
    return ARCHIVE_OUTPUTS.filter((output) => capabilities.writable.includes(output.id));
  },
  async convert(file, output, settings) {
    const config = outputFor(output);
    const inputFormat = normalizeArchiveExtension(extensionFromArchiveFilename(file.name));
    if (!config || !['zip', '7z', 'rar', 'tar', 'tgz', 'gz'].includes(inputFormat)) throw new ConverterError('Unsupported archive format', 'unsupported-input', false);
    if (inputFormat === output) throw new ConverterError('Choose a different archive output format', 'conversion-failed', false);
    const runGeneration = generation;
    const input = await file.arrayBuffer();
    if (runGeneration !== generation) throw cancelledError();
    const activeClient = client;
    const converted = await activeClient.convert(
      input,
      inputFormat as ArchiveInputFormat,
      output as ArchiveOutputFormat,
      file.name,
      zipCompressionSetting(settings.compression),
    );
    if (runGeneration !== generation) throw cancelledError();
    return {
      blob: new Blob([converted], { type: config.mime }),
      filename: replaceArchiveExtension(file.name, config.extension),
      output,
    } satisfies ConversionArtifact;
  },
  reset(reason) {
    generation += 1;
    const previousClient = client;
    client = new ArchiveWorkerClient();
    capabilitiesPromise = undefined;
    previousClient.reset(reason);
  },
};
