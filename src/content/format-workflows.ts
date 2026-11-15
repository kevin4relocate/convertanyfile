/**
 * Curated image-conversion decisions. These are qualitative checks rather than
 * fabricated benchmark results: actual size and appearance depend on the source.
 */
export interface FormatWorkflow {
  heading: string;
  situation: string;
  sourceCheck: string;
  outputCheck: string;
  avoidWhen: string;
}
export const IMAGE_FORMAT_WORKFLOWS: Readonly<Record<string, FormatWorkflow>> = {
  'heic-to-jpg': {
    heading: 'Example: an iPhone photo rejected by an upload form',
    situation: 'A job application form accepts JPEG uploads but rejects an original HEIC photo. Make a JPG compatibility copy for the form rather than repeatedly re-encoding your photo library.',
    sourceCheck: 'Inspect the source for portrait orientation, detail in faces, and any editing history that matters. Keep the HEIC original.',
    outputCheck: 'Open the downloaded JPG, check the expected dimensions and orientation, and confirm that the receiving form accepts its file size.',
    avoidWhen: 'If your editing or archival workflow supports HEIC, converting only to make a second master file adds no quality.',
  },
  'jpg-to-webp': {
    heading: 'Example: preparing photographs for a website',
    situation: 'A site owner has JPEG product photos and wants to test whether WebP reduces delivery size without visible loss at the actual on-page display size.',
    sourceCheck: 'Keep the original JPEG and note its pixel dimensions and byte size before conversion.',
    outputCheck: 'Compare file sizes, then inspect edges, skin tones, gradients and fine labels at the intended rendered size. Check that your CMS and image pipeline accept WebP.',
    avoidWhen: 'Do not claim WebP is always smaller. A previously optimized JPEG can be comparable or smaller for some content and encoding choices.',
  },
  'png-to-jpg': {
    heading: 'Example: sending a photographic PNG by email',
    situation: 'A photograph was exported to PNG and is unnecessarily bulky for email. Converting it to JPEG may be useful if transparency is not needed.',
    sourceCheck: 'Check whether the PNG contains text, sharp interface graphics or transparent regions. Those cases often benefit from staying PNG.',
    outputCheck: 'Inspect the new JPG for artifacts around sharp edges and verify the background where the source had transparency; compare actual file sizes.',
    avoidWhen: 'Keep PNG when you need exact pixels, lossless re-editing or transparency. JPEG cannot store an alpha channel.',
  },
  'webp-to-jpg': {
    heading: 'Example: a legacy image uploader cannot accept WebP',
    situation: 'A profile system only accepts JPEG or PNG. Convert an existing WebP photograph to JPG as a compatibility copy, without replacing the source.',
    sourceCheck: 'Look for transparency in the WebP; JPEG cannot preserve it. Verify whether the original is a photo or a sharp-edged graphic.',
    outputCheck: 'Check that transparent pixels have the background you intend and that the JPEG does not introduce objectionable ringing around text or edges.',
    avoidWhen: 'If the destination accepts WebP, the extra lossy re-encoding may be unnecessary.',
  },
  'jpg-to-png': {
    heading: 'Example: importing a JPEG into a PNG-only workflow',
    situation: 'An illustration editor or document system requires PNG files, but the supplied source is JPEG. The conversion changes the file container, not the underlying captured detail.',
    sourceCheck: 'Check existing JPEG compression blocks and visible artifacts before converting; those are already part of the source image.',
    outputCheck: 'Expect the PNG copy to occupy more space for many photographs. Verify its dimensions and intended editor compatibility.',
    avoidWhen: 'Do not convert to PNG expecting it to reconstruct missing JPEG details or magically add transparency.',
  },
  'png-to-webp': {
    heading: 'Example: optimizing a transparent website graphic',
    situation: 'A website includes a PNG graphic with transparency and wants a smaller delivery asset while retaining the original editable PNG.',
    sourceCheck: 'Inspect thin outlines, transparent edges and any small text, which can reveal lossy encoding artifacts.',
    outputCheck: 'Check transparency against both light and dark backgrounds, compare the actual bytes, and verify delivery behavior in your publishing pipeline.',
    avoidWhen: 'If an exact pixel match or PNG-only downstream workflow is required, keep the original PNG as the source of truth.',
  },
};
