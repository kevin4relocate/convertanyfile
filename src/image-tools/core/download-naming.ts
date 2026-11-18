/**
 * Shared download filename policy for image editors.
 * Names change only at download time; source files and rendered pixels are untouched.
 */
export type ImageDownloadNameMode = 'tool-default' | 'original' | 'prefix' | 'suffix';
export interface ImageDownloadFile { filename: string; blob: Blob; sourceFilename?: string }
export interface ImageDownloadNameOptions { mode: ImageDownloadNameMode; affix: string }

const OUTPUT_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif', 'bmp', 'tif', 'tiff']);
const EXCLUDED_TOOLS = new Set([
  'bulk-rename-images', 'bulk-image-rename', 'image-to-base64',
  'base64-to-image', 'image-dimension-inspector', 'exif-metadata-viewer',
  'image-color-picker', 'color-palette-extractor', 'image-to-favicon',
  'app-icon-generator',
]);

function splitExtension(name: string): { stem: string; extension: string } {
  const dot = name.lastIndexOf('.');
  return dot > 0 && dot < name.length - 1
    ? { stem: name.slice(0, dot), extension: name.slice(dot + 1) }
    : { stem: name, extension: '' };
}

export function cleanDownloadAffix(value: string): string {
  return value.normalize('NFKC')
    .replace(/[\\/:*?"<>|\x00-\x1f\x7f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^\.+|\.+$/g, '')
    .trim()
    .slice(0, 64);
}

/** Always use the processed file's extension, never rename image bytes as the original format. */
export function imageDownloadFilename(
  sourceFilename: string,
  outputFilename: string,
  options: ImageDownloadNameOptions,
): string {
  // Existing image tools retain their established default filenames unless the user opts in.
  if (options.mode === 'tool-default') return outputFilename;
  const output = splitExtension(outputFilename);
  if (!OUTPUT_EXTENSIONS.has(output.extension.toLowerCase())) return outputFilename;
  const sourceStem = splitExtension(sourceFilename.replace(/[\\/]/g, '-')).stem;
  if (!sourceStem) return outputFilename;
  const affix = cleanDownloadAffix(options.affix);
  const stem = options.mode === 'prefix' && affix ? `${affix}${sourceStem}`
    : options.mode === 'suffix' && affix ? `${sourceStem}${affix}`
    : sourceStem;
  return `${stem}.${output.extension}`;
}

export function applyImageDownloadNames<T extends ImageDownloadFile>(
  files: readonly T[],
  options: ImageDownloadNameOptions,
): Array<{ filename: string; blob: Blob }> {
  return files.map((file) => ({
    filename: file.sourceFilename
      ? imageDownloadFilename(file.sourceFilename, file.filename, options)
      : file.filename,
    blob: file.blob,
  }));
}

export function readImageDownloadNaming(root: HTMLElement): ImageDownloadNameOptions {
  const select = root.querySelector<HTMLSelectElement>('[data-download-name-mode]');
  const input = root.querySelector<HTMLInputElement>('[data-download-name-affix]');
  const mode = select?.value;
  return {
    mode: mode === 'original' || mode === 'prefix' || mode === 'suffix' ? mode : 'tool-default',
    affix: input?.value ?? '',
  };
}

export function withImageDownloadNames(
  root: HTMLElement,
  files: readonly ImageDownloadFile[],
): Array<{ filename: string; blob: Blob }> {
  return applyImageDownloadNames(files, readImageDownloadNaming(root));
}

/** Add one consistent naming control beside the download action across editor runtimes. */
export function mountImageDownloadNaming(root: HTMLElement): void {
  if (root.querySelector('[data-image-download-naming]')) return;
  const id = root.dataset.toolId ?? '';
  if (EXCLUDED_TOOLS.has(id) || id.includes('rename')) return;
  const download = root.querySelector<HTMLElement>(
    '[data-role="download-batch"], [data-role="download"], [data-advanced-download]',
  );
  if (!download) return;
  const actionRow = download.closest<HTMLElement>('[data-role="batch-action-bar"]')
    ?? download.parentElement;
  if (!actionRow) return;

  const panel = document.createElement('div');
  panel.className = 'image-download-naming';
  panel.dataset.imageDownloadNaming = '';
  panel.innerHTML = `
    <label class="image-download-naming__mode">
      <span>Downloaded filename</span>
      <select data-download-name-mode aria-label="Downloaded filename option">
        <option value="tool-default">Tool default (current naming)</option>
        <option value="original">Same original name</option>
        <option value="prefix">Add prefix</option>
        <option value="suffix">Add suffix</option>
      </select>
    </label>
    <label class="image-download-naming__affix" hidden>
      <span data-download-name-affix-label>Prefix</span>
      <input data-download-name-affix type="text" maxlength="64"
        autocomplete="off" placeholder="e.g. edited-" aria-label="Filename prefix or suffix" />
    </label>
    <small>Image format extension stays correct. ZIP filenames stay unchanged.</small>`;
  actionRow.before(panel);
  const mode = panel.querySelector<HTMLSelectElement>('[data-download-name-mode]')!;
  const affix = panel.querySelector<HTMLInputElement>('[data-download-name-affix]')!;
  const affixLabel = panel.querySelector<HTMLElement>('[data-download-name-affix-label]')!;
  const field = panel.querySelector<HTMLElement>('.image-download-naming__affix')!;
  mode.addEventListener('change', () => {
    field.hidden = mode.value !== 'prefix' && mode.value !== 'suffix';
    affixLabel.textContent = mode.value === 'suffix' ? 'Suffix' : 'Prefix';
    affix.placeholder = mode.value === 'suffix' ? 'e.g. -edited' : 'e.g. edited-';
  });
}
