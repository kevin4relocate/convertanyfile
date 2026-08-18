export type ConverterCategory = 'image' | 'audio' | 'archive' | 'data' | 'subtitle' | 'font' | 'other';
export type EngineId = 'image' | 'data';

export interface BatchPolicy {
  maxFiles: number;
  maxTotalBytes: number;
  maxFileBytes: number;
}

export type ConversionSettingValue = string | number | boolean;
export type ConversionSettings = Record<string, ConversionSettingValue>;

export interface RangeOutputControl {
  id: string;
  type: 'range';
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface SelectOutputControl {
  id: string;
  type: 'select';
  label: string;
  options: readonly { value: string; label: string }[];
  defaultValue: string;
}

export interface CheckboxOutputControl {
  id: string;
  type: 'checkbox';
  label: string;
  defaultValue: boolean;
}

export type OutputControl = RangeOutputControl | SelectOutputControl | CheckboxOutputControl;

export interface OutputOption {
  id: string;
  label: string;
  extension: string;
  mime: string;
  group?: string;
  controls?: readonly OutputControl[];
}

export interface DetectedFile {
  extension: string;
  label: string;
  confidence: 'signature' | 'signature+extension' | 'extension+content';
  width?: number;
  height?: number;
  estimatedDecodedBytes?: number;
  frameCount?: number;
  frameKind?: 'frames' | 'pages' | 'sizes';
}

export interface ConversionArtifact {
  blob: Blob;
  filename: string;
  output: string;
}

export interface EngineCapabilities {
  readable: string[];
  writable: string[];
  version?: string;
}

export interface EngineAdapter {
  id: EngineId;
  acceptedExtensions: readonly string[];
  acceptedExtensionsFor(requiredInput?: string): readonly string[];
  outputs: readonly OutputOption[];
  validate(file: File, requiredInput?: string): Promise<DetectedFile | null>;
  initialize(): Promise<EngineCapabilities>;
  supportsInput(extension: string, capabilities: EngineCapabilities): boolean;
  availableOutputs(capabilities: EngineCapabilities): OutputOption[];
  convert(file: File, output: string, settings: ConversionSettings): Promise<ConversionArtifact>;
  reset(reason?: string): void;
}

export interface ConverterDefinition {
  slug: string;
  engine: EngineId;
  category: ConverterCategory;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  input?: string;
  output?: string;
  batchPolicy: BatchPolicy;
  quickOutputs?: string[];
  related?: string[];
}

export type JobStatus = 'ready' | 'converting' | 'success' | 'error';

export interface ConversionJob {
  id: string;
  file: File;
  detected: DetectedFile;
  status: JobStatus;
  error?: string;
  errorCode?: string;
  errorRetryable?: boolean;
  result?: ConversionArtifact;
}
