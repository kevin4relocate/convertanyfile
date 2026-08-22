import type { OutputOption } from '../../platform/converter/types';

export const SUBTITLE_INPUT_EXTENSIONS = ['srt', 'vtt', 'webvtt', 'ass', 'ssa', 'sbv'] as const;

const TIMING_SHIFT_CONTROL = {
  id: 'timingShiftMs',
  type: 'number',
  label: 'Timing shift',
  min: -600000,
  max: 600000,
  step: 50,
  defaultValue: 0,
  suffix: 'ms',
} as const;

const ENCODING_CONTROLS = [
  {
    id: 'lineEnding',
    type: 'select',
    label: 'Line endings',
    defaultValue: 'lf',
    options: [
      { value: 'lf', label: 'LF' },
      { value: 'crlf', label: 'CRLF' },
    ],
  },
  { id: 'bom', type: 'checkbox', label: 'UTF-8 BOM', defaultValue: false },
] as const;

const TIMED_TEXT_CONTROLS = [
  TIMING_SHIFT_CONTROL,
  { id: 'stripFormatting', type: 'checkbox', label: 'Plain text only', defaultValue: false },
  ...ENCODING_CONTROLS,
] as const;

const TXT_CONTROLS = [
  TIMING_SHIFT_CONTROL,
  {
    id: 'timestampMode',
    type: 'select',
    label: 'Timestamps',
    defaultValue: 'none',
    options: [
      { value: 'none', label: 'No timestamps' },
      { value: 'start', label: 'Start time' },
      { value: 'range', label: 'Start → end' },
    ],
  },
  {
    id: 'cueSpacing',
    type: 'select',
    label: 'Cue spacing',
    defaultValue: 'blank',
    options: [
      { value: 'blank', label: 'Blank line' },
      { value: 'single', label: 'Single line' },
    ],
  },
  ...ENCODING_CONTROLS,
] as const;

export const SUBTITLE_OUTPUTS: readonly OutputOption[] = [
  { id: 'srt', label: 'SRT', extension: 'srt', mime: 'application/x-subrip;charset=utf-8', controls: TIMED_TEXT_CONTROLS },
  { id: 'vtt', label: 'VTT', extension: 'vtt', mime: 'text/vtt;charset=utf-8', controls: TIMED_TEXT_CONTROLS },
  { id: 'sbv', label: 'SBV', extension: 'sbv', mime: 'text/plain;charset=utf-8', controls: TIMED_TEXT_CONTROLS },
  { id: 'txt', label: 'TXT', extension: 'txt', mime: 'text/plain;charset=utf-8', controls: TXT_CONTROLS },
] as const;

export function extensionFromFilename(filename: string): string | undefined {
  const dot = filename.lastIndexOf('.');
  if (dot < 0 || dot === filename.length - 1) return undefined;
  return filename.slice(dot + 1).toLowerCase();
}

export function normalizeSubtitleExtension(extension: string | undefined): string | undefined {
  if (!extension) return undefined;
  const normalized = extension.toLowerCase().replace(/^\./, '');
  return normalized === 'webvtt' ? 'vtt' : normalized;
}

export function subtitleLabel(extension: string): string {
  const normalized = normalizeSubtitleExtension(extension) ?? extension;
  if (normalized === 'ass') return 'ASS';
  if (normalized === 'ssa') return 'SSA';
  return normalized.toUpperCase();
}
