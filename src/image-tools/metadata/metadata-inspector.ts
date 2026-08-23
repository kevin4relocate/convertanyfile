export type MetadataKind = 'gps' | 'camera' | 'date' | 'software' | 'text' | 'profile' | 'exif';

export interface MetadataDetail {
  kind: MetadataKind;
  label: string;
  value?: string;
}

export interface MetadataReport {
  detected: boolean;
  details: MetadataDetail[];
}

const textDecoder = new TextDecoder('latin1');

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return textDecoder.decode(bytes.subarray(start, Math.min(bytes.length, start + length))).replace(/\0+$/g, '').trim();
}

function add(details: MetadataDetail[], kind: MetadataKind, label: string, value?: string): void {
  if (details.some((item) => item.kind === kind && item.label === label && item.value === value)) return;
  details.push({ kind, label, value: value?.trim() || undefined });
}

function readExif(bytes: Uint8Array, start: number, details: MetadataDetail[]): void {
  try {
    let base = start;
    if (ascii(bytes, start, 6).startsWith('Exif')) base += 6;
    if (base + 8 > bytes.length) return;
    const little = bytes[base] === 0x49 && bytes[base + 1] === 0x49;
    const big = bytes[base] === 0x4d && bytes[base + 1] === 0x4d;
    if (!little && !big) return;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = (offset: number): number => view.getUint16(offset, little);
    const u32 = (offset: number): number => view.getUint32(offset, little);
    if (u16(base + 2) !== 42) return;

    const readAsciiValue = (entry: number, type: number, count: number): string | undefined => {
      if (type !== 2 || count <= 0) return undefined;
      const offset = count <= 4 ? entry + 8 : base + u32(entry + 8);
      if (offset < 0 || offset + count > bytes.length) return undefined;
      return ascii(bytes, offset, count);
    };

    const seen = new Set<number>();
    const readIfd = (relativeOffset: number): void => {
      const ifd = base + relativeOffset;
      if (relativeOffset <= 0 || ifd + 2 > bytes.length || seen.has(ifd)) return;
      seen.add(ifd);
      const count = u16(ifd);
      for (let index = 0; index < count; index += 1) {
        const entry = ifd + 2 + index * 12;
        if (entry + 12 > bytes.length) break;
        const tag = u16(entry);
        const type = u16(entry + 2);
        const itemCount = u32(entry + 4);
        const value = readAsciiValue(entry, type, itemCount);
        if (tag === 0x010f && value) add(details, 'camera', 'Camera maker', value);
        else if (tag === 0x0110 && value) add(details, 'camera', 'Camera model', value);
        else if (tag === 0xa434 && value) add(details, 'camera', 'Lens model', value);
        else if (tag === 0x0131 && value) add(details, 'software', 'Software / editor', value);
        else if ((tag === 0x0132 || tag === 0x9003 || tag === 0x9004) && value) add(details, 'date', tag === 0x9003 ? 'Date taken' : 'Image date/time', value);
        else if (tag === 0x8825) add(details, 'gps', 'GPS / location data');
        else if ((tag === 0x8769 || tag === 0x8825) && type === 4) {
          const child = u32(entry + 8);
          if (tag === 0x8769) readIfd(child);
        }
      }
    };

    add(details, 'exif', 'EXIF metadata');
    readIfd(u32(base + 4));
  } catch {
    add(details, 'exif', 'EXIF metadata');
  }
}

function inspectJpeg(bytes: Uint8Array, details: MetadataDetail[]): void {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1] ?? 0;
    if (marker === 0xda || marker === 0xd9) break;
    if (marker === 0x00 || marker === 0xff) { offset += 1; continue; }
    const length = ((bytes[offset + 2] ?? 0) << 8) | (bytes[offset + 3] ?? 0);
    if (length < 2 || offset + 2 + length > bytes.length) break;
    const payload = offset + 4;
    const payloadLength = length - 2;
    if (marker === 0xe1) {
      const header = ascii(bytes, payload, Math.min(payloadLength, 40));
      if (header.startsWith('Exif')) readExif(bytes, payload, details);
      else if (header.includes('xap') || header.includes('adobe.com')) add(details, 'text', 'XMP metadata');
    } else if (marker === 0xed) add(details, 'text', 'IPTC / Photoshop metadata');
    else if (marker === 0xfe) add(details, 'text', 'Image comment');
    else if (marker === 0xe2 && ascii(bytes, payload, Math.min(payloadLength, 20)).startsWith('ICC_PROFILE')) add(details, 'profile', 'Embedded color profile');
    offset += 2 + length;
  }
}

function inspectPng(bytes: Uint8Array, details: MetadataDetail[]): void {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.length < 12 || !signature.every((value, index) => bytes[index] === value)) return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  while (offset + 12 <= bytes.length) {
    const length = view.getUint32(offset, false);
    const type = ascii(bytes, offset + 4, 4);
    const dataStart = offset + 8;
    if (dataStart + length + 4 > bytes.length) break;
    if (type === 'eXIf') readExif(bytes, dataStart, details);
    else if (type === 'tEXt' || type === 'zTXt' || type === 'iTXt') add(details, 'text', 'PNG text metadata');
    else if (type === 'tIME') add(details, 'date', 'PNG modification time');
    else if (type === 'iCCP') add(details, 'profile', 'Embedded color profile');
    if (type === 'IEND') break;
    offset = dataStart + length + 4;
  }
}

function inspectWebp(bytes: Uint8Array, details: MetadataDetail[]): void {
  if (bytes.length < 16 || ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 4) !== 'WEBP') return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = ascii(bytes, offset, 4);
    const length = view.getUint32(offset + 4, true);
    const dataStart = offset + 8;
    if (dataStart + length > bytes.length) break;
    if (type === 'EXIF') readExif(bytes, dataStart, details);
    else if (type === 'XMP ') add(details, 'text', 'XMP metadata');
    else if (type === 'ICCP') add(details, 'profile', 'Embedded color profile');
    offset = dataStart + length + (length % 2);
  }
}

export async function inspectImageMetadata(file: File): Promise<MetadataReport> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const details: MetadataDetail[] = [];
  inspectJpeg(bytes, details);
  inspectPng(bytes, details);
  inspectWebp(bytes, details);
  return { detected: details.length > 0, details };
}
