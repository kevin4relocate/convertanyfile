import type { DetectedFile } from '../../platform/converter/types';

const u16le = (bytes: Uint8Array, offset: number) => (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8);
const u32le = (bytes: Uint8Array, offset: number) => new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset, true);
const starts = (bytes: Uint8Array, signature: number[]) => signature.every((value, index) => bytes[index] === value);

function detected(extension: string, label: string, width: number, height: number): DetectedFile | null {
  if (width <= 0 || height <= 0) return null;
  const estimatedDecodedBytes = width * height * 4;
  if (!Number.isSafeInteger(estimatedDecodedBytes)) return null;
  return { extension, label, confidence: 'signature+extension', width, height, estimatedDecodedBytes };
}

function detectPcx(bytes: Uint8Array): DetectedFile | null {
  if (bytes.length < 128 || bytes[0] !== 0x0a) return null;
  const version = bytes[1] ?? 255;
  const encoding = bytes[2] ?? 255;
  const bitsPerPixel = bytes[3] ?? 0;
  if (![0, 2, 3, 4, 5].includes(version) || ![0, 1].includes(encoding) || ![1, 2, 4, 8].includes(bitsPerPixel)) return null;
  const xmin = u16le(bytes, 4), ymin = u16le(bytes, 6), xmax = u16le(bytes, 8), ymax = u16le(bytes, 10);
  const planes = bytes[65] ?? 0;
  const bytesPerLine = u16le(bytes, 66);
  if (xmax < xmin || ymax < ymin || planes < 1 || planes > 4 || bytesPerLine < 1) return null;
  return detected('pcx', 'PCX image', xmax - xmin + 1, ymax - ymin + 1);
}

function detectTga(file: File, bytes: Uint8Array): DetectedFile | null {
  if (bytes.length < 18) return null;
  const idLength = bytes[0] ?? 0;
  const colorMapType = bytes[1] ?? 255;
  const imageType = bytes[2] ?? 0;
  const width = u16le(bytes, 12), height = u16le(bytes, 14);
  const pixelDepth = bytes[16] ?? 0;
  if (![0, 1].includes(colorMapType) || ![1, 2, 3, 9, 10, 11].includes(imageType)) return null;
  if (![8, 15, 16, 24, 32].includes(pixelDepth) || width <= 0 || height <= 0) return null;
  if ((imageType === 1 || imageType === 9) && colorMapType !== 1) return null;
  const colorMapLength = u16le(bytes, 5);
  const colorMapEntryBits = bytes[7] ?? 0;
  const colorMapBytes = colorMapType === 1 ? Math.ceil(colorMapLength * colorMapEntryBits / 8) : 0;
  const dataOffset = 18 + idLength + colorMapBytes;
  if (dataOffset >= file.size) return null;
  return detected('tga', 'TGA image', width, height);
}

export async function detectLegacyImage(file: File, extension: string, bytes: Uint8Array): Promise<DetectedFile | null> {
  if (extension === 'pcx') return detectPcx(bytes);
  if (extension === 'tga') return detectTga(file, bytes);
  return null;
}

export async function validateIcoFile(file: File, bytes: Uint8Array): Promise<boolean> {
  if (bytes.length < 6 || !starts(bytes, [0x00, 0x00, 0x01, 0x00])) return false;
  const count = u16le(bytes, 4);
  if (count < 1 || count > 1024) return false;
  const directoryEnd = 6 + count * 16;
  if (directoryEnd > file.size || directoryEnd > bytes.length) return false;

  let firstOffset = 0;
  for (let index = 0; index < count; index += 1) {
    const entry = 6 + index * 16;
    const size = u32le(bytes, entry + 8);
    const offset = u32le(bytes, entry + 12);
    if (size < 1 || offset < directoryEnd || offset + size > file.size) return false;
    if (index === 0) firstOffset = offset;
  }

  const payload = new Uint8Array(await file.slice(firstOffset, Math.min(file.size, firstOffset + 16)).arrayBuffer());
  if (starts(payload, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return true;
  if (payload.length < 4) return false;
  const dibHeaderSize = u32le(payload, 0);
  return [12, 40, 52, 56, 64, 108, 124].includes(dibHeaderSize);
}
