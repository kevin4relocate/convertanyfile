type LibarchiveFactory = (options?: Record<string, unknown>) => Promise<LibarchiveModule>;
type CFunction = (...args: any[]) => any;

interface LibarchiveModule {
  _malloc(size: number): number;
  _free(pointer: number): void;
  HEAP8: Int8Array;
  cwrap(name: string, returnType: string, argTypes: string[]): CFunction;
}

export interface LibarchiveDecodedEntry {
  path: string;
  kind: 'file' | 'directory';
  data: Uint8Array;
  modified?: Date;
}

interface DecodeGuards {
  requireSafePath(path: string): string;
  ensureBudget(count: number, total: number, next: number): void;
}

const RUNTIME_MODULE_URL = '/vendor/libarchive-wasm/libarchive.js';
const RUNTIME_WASM_URL = '/vendor/libarchive-wasm/libarchive.wasm';
const MAX_WASM_SOURCE_BYTES = 75 * 1024 * 1024;
let modulePromise: Promise<LibarchiveModule> | undefined;

function runtimeError(message: string): Error {
  return new Error(`Archive decoder runtime unavailable: ${message}`);
}

function browserMemoryError(): Error {
  return new Error('Archive decoder ran out of browser memory');
}

async function loadModule(): Promise<LibarchiveModule> {
  if (!modulePromise) {
    modulePromise = (async () => {
      try {
        const imported = await import(/* @vite-ignore */ RUNTIME_MODULE_URL) as { default?: LibarchiveFactory };
        if (typeof imported.default !== 'function') throw new Error('invalid module export');
        return await imported.default({
          locateFile(path: unknown) {
            return typeof path === 'string' && path.endsWith('.wasm') ? RUNTIME_WASM_URL : String(path ?? '');
          },
        });
      } catch (error) {
        modulePromise = undefined;
        throw runtimeError(error instanceof Error ? error.message : String(error));
      }
    })();
  }
  return modulePromise;
}

function checked<T extends CFunction>(fn: T, failed: (result: ReturnType<T>) => boolean, errorString: CFunction): T {
  return ((...args: Parameters<T>) => {
    const result = fn(...args);
    if (failed(result)) throw new Error(String(errorString(args[0]) || 'libarchive failed'));
    return result;
  }) as T;
}

function bindings(module: LibarchiveModule) {
  const errorString = module.cwrap('archive_error_string', 'string', ['number']);
  return {
    version: module.cwrap('archive_version_string', 'string', []),
    readNewMemory: module.cwrap('archive_read_new_memory', 'number', ['number', 'number', 'string']),
    readNextEntry: module.cwrap('archive_read_next_entry', 'number', ['number']),
    readHasEncrypted: module.cwrap('archive_read_has_encrypted_entries', 'number', ['number']),
    readData: checked(module.cwrap('archive_read_data', 'number', ['number', 'number', 'number']), (value) => value < 0, errorString),
    readSkip: checked(module.cwrap('archive_read_data_skip', 'number', ['number']), (value) => value !== 0, errorString),
    readFree: checked(module.cwrap('archive_read_free', 'number', ['number']), (value) => value !== 0, errorString),
    entryFiletype: module.cwrap('archive_entry_filetype', 'number', ['number']),
    entryPathname: module.cwrap('archive_entry_pathname_utf8', 'string', ['number']),
    entrySize: module.cwrap('archive_entry_size', 'number', ['number']),
    entryMtime: module.cwrap('archive_entry_mtime', 'number', ['number']),
    entryEncrypted: module.cwrap('archive_entry_is_encrypted', 'number', ['number']),
    entrySymlink: module.cwrap('archive_entry_symlink_utf8', 'string', ['number']),
    entryHardlink: module.cwrap('archive_entry_hardlink_utf8', 'string', ['number']),
    errorString,
  };
}

const FILE_TYPE = 0o100000;
const DIRECTORY_TYPE = 0o040000;

function unsupportedEntry(type: number): Error {
  const label = type === 0o120000 ? 'symbolic link' : type === 0o060000 || type === 0o020000 ? 'device entry' : 'special entry';
  return new Error(`Archive contains an unsupported ${label}`);
}

function normalizeDecoderFailure(error: unknown): Error {
  const message = error instanceof Error ? error.message : String(error || 'Archive decoder failed');
  if (/decoder runtime unavailable/i.test(message)) return error instanceof Error ? error : new Error(message);
  if (/^Archive (?:contains|entry|expands|path)/i.test(message) || /75 MB browser-decoder safety limit|ran out of browser memory/i.test(message)) {
    return error instanceof Error ? error : new Error(message);
  }
  if (/password|passphrase|encrypted/i.test(message)) return new Error('Password-protected 7Z/RAR archives are not supported');
  if (/truncated|unexpected eof|unexpected end|short read|end of file|damaged|corrupt|invalid header|unrecognized archive|ended before|invalid, corrupt/i.test(message)) {
    return new Error('The 7Z/RAR archive is corrupt or incomplete');
  }
  if (/unsupported|not supported|compression method|compression|codec|filter/i.test(message)) {
    return new Error('This 7Z/RAR archive uses an unsupported compression method or feature');
  }
  if (/invalid/i.test(message)) return new Error('The 7Z/RAR archive is corrupt or unsupported');
  return new Error(`Unable to read the 7Z/RAR archive: ${message}`);
}

export async function libarchiveVersion(): Promise<string> {
  const module = await loadModule();
  return String(bindings(module).version());
}

export async function decodeWithLibarchive(input: ArrayBuffer, guards: DecodeGuards): Promise<LibarchiveDecodedEntry[]> {
  if (input.byteLength > MAX_WASM_SOURCE_BYTES) throw new Error('7Z/RAR source exceeds the 75 MB browser-decoder safety limit');

  try {
    const module = await loadModule();
    const api = bindings(module);
    const bytes = new Int8Array(input);
    const inputPointer = module._malloc(bytes.byteLength || 1);
    if (!inputPointer) throw browserMemoryError();

    let archive = 0;
    try {
      module.HEAP8.set(bytes, inputPointer);
      archive = Number(api.readNewMemory(inputPointer, bytes.byteLength, undefined));
      if (!archive) throw new Error('Invalid, corrupt, or unsupported 7Z/RAR archive');
      if (api.readHasEncrypted(archive) > 0) throw new Error('Encrypted archives are not supported');

      const entries: LibarchiveDecodedEntry[] = [];
      let total = 0;
      for (;;) {
        const entryPointer = Number(api.readNextEntry(archive));
        if (!entryPointer) {
          const readError = String(api.errorString(archive) || '').trim();
          if (readError) throw new Error(readError);
          break;
        }

        const path = guards.requireSafePath(String(api.entryPathname(entryPointer) || ''));
        if (api.entryEncrypted(entryPointer)) throw new Error('Encrypted archive entries are not supported');
        if (api.entrySymlink(entryPointer) || api.entryHardlink(entryPointer)) throw new Error('Archive contains unsupported links');

        const type = Number(api.entryFiletype(entryPointer));
        const mtimeSeconds = Number(api.entryMtime(entryPointer));
        const modified = Number.isFinite(mtimeSeconds) && mtimeSeconds > 0 ? new Date(mtimeSeconds * 1000) : undefined;

        if (type === DIRECTORY_TYPE) {
          guards.ensureBudget(entries.length + 1, total, 0);
          api.readSkip(archive);
          entries.push({ path, kind: 'directory', data: new Uint8Array(), modified });
          continue;
        }
        if (type !== FILE_TYPE) throw unsupportedEntry(type);

        const declaredSize = Number(api.entrySize(entryPointer));
        if (!Number.isFinite(declaredSize) || declaredSize < 0) throw new Error('Archive entry has an invalid extracted size');
        guards.ensureBudget(entries.length + 1, total, declaredSize);

        if (declaredSize === 0) {
          api.readSkip(archive);
          entries.push({ path, kind: 'file', data: new Uint8Array(), modified });
          continue;
        }

        const dataPointer = module._malloc(declaredSize);
        if (!dataPointer) throw browserMemoryError();
        try {
          const bytesRead = Number(api.readData(archive, dataPointer, declaredSize));
          if (!Number.isFinite(bytesRead) || bytesRead < 0 || bytesRead !== declaredSize) throw new Error('Archive entry ended before its declared size');
          const data = new Uint8Array(module.HEAP8.buffer, dataPointer, bytesRead).slice();
          guards.ensureBudget(entries.length + 1, total, data.byteLength);
          total += data.byteLength;
          entries.push({ path, kind: 'file', data, modified });
        } finally {
          module._free(dataPointer);
        }
      }

      if (!entries.length) throw new Error('Archive does not contain extractable files or directories');
      return entries;
    } finally {
      if (archive) {
        try { api.readFree(archive); } catch { /* worker teardown remains authoritative */ }
      }
      module._free(inputPointer);
    }
  } catch (error) {
    throw normalizeDecoderFailure(error);
  }
}
