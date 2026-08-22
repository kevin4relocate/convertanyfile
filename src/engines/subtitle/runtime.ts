import { ConverterError } from '../../platform/converter/errors';
import type { ConversionArtifact, EngineAdapter, EngineCapabilities } from '../../platform/converter/types';
import type { SubtitleAnalysis, SubtitleInputFormat } from './codec';
import { SUBTITLE_INPUT_EXTENSIONS, SUBTITLE_OUTPUTS, extensionFromFilename, normalizeSubtitleExtension, subtitleLabel } from './formats';
import { SubtitleWorkerClient } from './worker-client';

const CAPABILITIES: Omit<EngineCapabilities, 'version'> = {
  readable: ['srt', 'vtt', 'ass', 'ssa', 'sbv'],
  writable: ['srt', 'vtt', 'sbv', 'txt'],
};
let client = new SubtitleWorkerClient();
let capabilitiesPromise: Promise<EngineCapabilities> | undefined;
let generation = 0;

function outputFor(id: string) { return SUBTITLE_OUTPUTS.find((item) => item.id === id); }
function replaceExtension(filename: string, extension: string): string {
  const slash = Math.max(filename.lastIndexOf('/'), filename.lastIndexOf('\\'));
  const dot = filename.lastIndexOf('.');
  const base = dot > slash ? filename.slice(0, dot) : filename;
  return `${base}.${extension}`;
}
function cancelledError(): ConverterError { return new ConverterError('Conversion was cancelled', 'engine-crash', true); }

function formatTimeline(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function analysisLabel(extension: string, analysis: SubtitleAnalysis): string {
  const cueLabel = `${analysis.cueCount.toLocaleString('en-US')} ${analysis.cueCount === 1 ? 'cue' : 'cues'}`;
  const flags = [
    analysis.hasVttMetadata ? 'VTT metadata' : '',
    !analysis.hasVttMetadata && analysis.hasRichFormatting ? 'formatted text' : '',
  ].filter(Boolean);
  return [subtitleLabel(extension), cueLabel, `ends ${formatTimeline(analysis.lastEndMs)}`, analysis.encoding, ...flags].join(' · ');
}

export const subtitleEngine: EngineAdapter = {
  id: 'subtitle',
  acceptedExtensions: SUBTITLE_INPUT_EXTENSIONS,
  acceptedExtensionsFor(requiredInput) {
    if (!requiredInput) return SUBTITLE_INPUT_EXTENSIONS;
    const normalized = normalizeSubtitleExtension(requiredInput);
    return SUBTITLE_INPUT_EXTENSIONS.filter((extension) => normalizeSubtitleExtension(extension) === normalized);
  },
  outputs: SUBTITLE_OUTPUTS,
  async validate(file, requiredInput) {
    const extension = normalizeSubtitleExtension(extensionFromFilename(file.name));
    if (!extension || !CAPABILITIES.readable.includes(extension)) return null;
    if (requiredInput && normalizeSubtitleExtension(requiredInput) !== extension) return null;
    try {
      const input = await file.arrayBuffer();
      const analysis = await client.analyze(input, extension as SubtitleInputFormat);
      return { extension, label: analysisLabel(extension, analysis), confidence: 'extension+content' };
    } catch (error) {
      if (error instanceof ConverterError && error.retryable) throw error;
      return null;
    }
  },
  initialize() {
    capabilitiesPromise ??= client.ready().then((version) => ({ ...CAPABILITIES, version }));
    return capabilitiesPromise;
  },
  supportsInput(extension, capabilities) {
    const normalized = normalizeSubtitleExtension(extension);
    return Boolean(normalized && capabilities.readable.includes(normalized));
  },
  availableOutputs(capabilities) {
    return SUBTITLE_OUTPUTS.filter((output) => capabilities.writable.includes(output.id));
  },
  async convert(file, output, settings) {
    const config = outputFor(output);
    const inputFormat = normalizeSubtitleExtension(extensionFromFilename(file.name));
    if (!config || !inputFormat || !CAPABILITIES.readable.includes(inputFormat)) throw new Error('Unsupported subtitle format');
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
    client = new SubtitleWorkerClient();
    capabilitiesPromise = undefined;
    previousClient.reset(reason);
  },
};
