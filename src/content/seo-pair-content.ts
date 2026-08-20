export interface SeoPairContent {
  audience: string;
  bestFor: readonly string[];
  checkAfter: readonly string[];
}

/**
 * Deeper, pair-specific copy for the highest-intent image conversion pages.
 * Keep this intentionally limited: converter pages should remain useful tools,
 * not mass-produced keyword pages.
 */
export const SEO_PAIR_CONTENT: Record<string, SeoPairContent> = {
  'heic-to-jpg': {
    audience: 'This conversion is mainly useful when a phone photo needs to work with an upload form, older application, desktop utility, or recipient that does not accept HEIC.',
    bestFor: ['Uploading iPhone photos to services that require JPEG', 'Sharing photos with software or devices that do not support HEIC', 'Creating smaller, widely compatible photo copies while keeping the HEIC original'],
    checkAfter: ['Open a few JPGs at their intended display size', 'Check that the destination accepts the JPEG dimensions and file size', 'Keep the original HEIC if the photo is important or may need another export later'],
  },
  'webp-to-jpg': {
    audience: 'This conversion is a compatibility step: use it when a form, editor, legacy workflow, or recipient expects JPG even though your source is WebP.',
    bestFor: ['Upload forms that accept JPEG but reject WebP', 'Emailing or sharing photos with older software', 'Creating a conventional photo copy for a compatibility-focused workflow'],
    checkAfter: ['Check transparent sources because JPG cannot keep alpha transparency', 'Inspect fine text or sharp edges for new JPEG artifacts', 'Keep the WebP source when it is the better-quality master'],
  },
  'jpg-to-webp': {
    audience: 'This conversion is most useful for modern web or application delivery where WebP is supported and smaller image payloads can improve transfer efficiency.',
    bestFor: ['Creating WebP delivery copies for websites', 'Reducing image transfer size while retaining a JPG source master', 'Moving a photo library into a modern image pipeline that already supports WebP'],
    checkAfter: ['Compare the actual WebP bytes with the original JPG', 'Inspect faces, gradients, text, and other high-detail areas at the target display size', 'Test the destination browser, CMS, CDN, and fallback behavior'],
  },
  'png-to-jpg': {
    audience: 'This conversion fits photographs and compatibility workflows where transparency and lossless PNG storage are not required.',
    bestFor: ['Reducing the size of photographic PNG files', 'Uploading images to services that expect JPEG', 'Creating lightweight photo copies for email or general sharing'],
    checkAfter: ['Confirm that transparency is not needed because JPG cannot store alpha', 'Inspect text, screenshots, and sharp graphics for compression artifacts', 'Keep PNG as the source when it contains important lossless graphics'],
  },
  'jpg-to-png': {
    audience: 'This conversion is useful when a destination explicitly requires PNG or when you want a PNG copy for a workflow that avoids another JPEG encoding generation.',
    bestFor: ['Software or workflows that require PNG', 'Moving an existing JPG into a PNG-based editing pipeline', 'Creating a lossless container copy for further processing without another JPEG save'],
    checkAfter: ['Do not expect missing JPEG detail to return', 'Expect the PNG to be much larger for many photographs', 'Keep the original JPG because the PNG is still based on its already-decoded pixels'],
  },
  'png-to-webp': {
    audience: 'This conversion is aimed at modern web delivery: WebP can make many PNG assets smaller while still supporting transparency.',
    bestFor: ['Web graphics that do not need PNG-specific tooling', 'Transparent assets in a modern browser delivery pipeline', 'Creating smaller delivery copies while retaining the PNG master'],
    checkAfter: ['Check transparent edges and small text carefully', 'Compare file size at the actual dimensions served to visitors', 'Keep PNG as the editing or source asset when lossless authoring matters'],
  },
  'avif-to-jpg': {
    audience: 'This conversion is mainly for compatibility when a modern AVIF source needs to enter a workflow that expects the mature JPEG format.',
    bestFor: ['Legacy upload systems that reject AVIF', 'Sharing AVIF photos with software that expects JPEG', 'Creating a broadly compatible fallback copy'],
    checkAfter: ['Inspect the result because the conversion creates a new lossy JPEG', 'Check file size and dimensions against the receiving service', 'Keep AVIF as the source or delivery asset when the modern pipeline supports it'],
  },
  'avif-to-webp': {
    audience: 'This conversion makes sense when your target publishing stack supports WebP more consistently than AVIF while still benefiting from a modern web-oriented format.',
    bestFor: ['CMS or CDN workflows standardized on WebP', 'Browser delivery where WebP tooling is easier to operate', 'Creating a WebP fallback or migration copy from an AVIF library'],
    checkAfter: ['Compare the output bytes and visual quality rather than codec quality numbers', 'Inspect areas with gradients, fine detail, or transparency', 'Avoid repeatedly converting lossy delivery copies when the original source is available'],
  },
  'webp-to-png': {
    audience: 'This conversion is useful when a graphics, documentation, editing, or software workflow explicitly expects PNG rather than WebP.',
    bestFor: ['Screenshots and graphics that need a common PNG workflow', 'Moving WebP assets into PNG-oriented editing tools', 'Creating a lossless PNG representation for a downstream step'],
    checkAfter: ['Remember that PNG cannot restore detail already lost by a lossy WebP source', 'Expect photographic PNGs to be larger', 'Check transparency and edge quality before replacing the source'],
  },
  'avif-to-png': {
    audience: 'This conversion is useful when a destination requires PNG, especially for lossless graphics workflows or software that does not accept AVIF.',
    bestFor: ['PNG-based editing and documentation workflows', 'Destinations that require a widely supported lossless container', 'Preserving available alpha transparency in a PNG-compatible workflow'],
    checkAfter: ['Expect a larger file for many photographs', 'Do not treat PNG conversion as a quality restoration step', 'Verify metadata and other AVIF-specific features if they matter to your workflow'],
  },
};
