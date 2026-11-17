/** SRT-only parser: keep cue indices and timing strings byte-for-byte in the output. */
export interface SrtCue { index: string; timing: string; text: string }
export const MAX_SRT_BYTES = 1_000_000;
export const MAX_SRT_CUES = 1500;
const TIMING = /^(\d{2,}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2,}:\d{2}:\d{2},\d{3})(?:\s+.*)?$/;

export function parseSrt(source: string): SrtCue[] {
  const clean = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!clean) throw new Error('Paste SRT subtitles or choose a .srt file.');
  if (new TextEncoder().encode(clean).length > MAX_SRT_BYTES) throw new Error('SRT is too large for this preview (1 MB limit).');
  const blocks = clean.split(/\n[\t ]*\n+/);
  if (blocks.length > MAX_SRT_CUES) throw new Error('This preview supports up to 1,500 subtitle cues.');
  const result: SrtCue[] = [];
  for (const [position, block] of blocks.entries()) {
    const lines = block.split('\n');
    let index = String(position + 1);
    let timing: string;
    if (TIMING.test(lines[0] ?? '')) timing = lines.shift()!;
    else {
      const id = lines.shift() ?? '';
      if (!/^\d+$/.test(id) || !TIMING.test(lines[0] ?? '')) {
        throw new Error(`Invalid SRT block ${position + 1}: expected a numeric index followed by a timestamp line.`);
      }
      index = id;
      timing = lines.shift()!;
    }
    if (!lines.length || !lines.some((line) => line.trim())) throw new Error(`Subtitle block ${position + 1} has no text.`);
    if (lines.some((line) => TIMING.test(line))) throw new Error(`Subtitle block ${position + 1} contains an unexpected timestamp.`);
    const match = TIMING.exec(timing)!;
    const millis = (stamp: string) => {
      const [h, m, rest] = stamp.split(':');
      const [sec, ms] = rest!.split(',');
      if (Number(m) > 59 || Number(sec) > 59) throw new Error(`Invalid clock timestamp in block ${position + 1}.`);
      return ((Number(h) * 60 + Number(m)) * 60 + Number(sec)) * 1000 + Number(ms);
    };
    if (millis(match[2]!) <= millis(match[1]!)) throw new Error(`End time must follow start time in block ${position + 1}.`);
    result.push({ index, timing, text: lines.join('\n') });
  }
  return result;
}

export function serializeSrt(cues: readonly SrtCue[]): string {
  return cues.map((cue) => `${cue.index}\n${cue.timing}\n${cue.text}`).join('\n\n') + '\n';
}
