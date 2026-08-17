export type ConverterCategory = 'image' | 'audio' | 'archive' | 'data' | 'subtitle' | 'font' | 'other';
export type EngineId = 'image';

export interface BatchPolicy {
  maxFiles: number;
  maxTotalBytes: number;
  maxFileBytes: number;
}

export interface OutputOption {
  id: string;
  label: string;
  extension: string;
  mime: string;
  supportsQuality: boolean;
}

export interface DetectedFile {
  extension: string;
  label: string;
  confidence: 'signature' | 'signature+extension';
  width?: number;
  height?: number;
  estimatedDecodedBytes?: number;
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
  outputs: readonly OutputOption[];
  validate(file: File, requiredInput?: string): Promise<DetectedFile | null>;
  initialize(): Promise<EngineCapabilities>;
  supportsInput(extension: string, capabilities: EngineCapabilities): boolean;
  availableOutputs(capabilities: EngineCapabilities): OutputOption[];
  convert(file: File, output: string, quality: number): Promise<ConversionArtifact>;
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
