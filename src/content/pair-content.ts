export interface PairContent {
  why: string;
  when: string;
  note: string;
}

export const PAIR_CONTENT: Record<string, PairContent> = {
  'heic-to-jpg': {
    why: 'HEIC is efficient for modern phone photography, but JPG is still accepted by a wider range of websites, desktop applications, messaging workflows, and older devices. A JPG copy can remove compatibility friction when the recipient does not support HEIC.',
    when: 'Use JPG when you need a photo that is easy to upload, email, preview, or open across mixed devices. Keep the original HEIC file if you want to preserve the source version for your archive.',
    note: 'HEIC to JPG is a lossy conversion. A higher quality setting can reduce new compression artifacts, but converting cannot improve detail that was not present in the original image.',
  },
  'heic-to-png': {
    why: 'PNG is broadly supported in browsers, editors, documentation tools, and design workflows. Converting HEIC to PNG can help when a workflow requires a lossless PNG container rather than a phone-oriented HEIC file.',
    when: 'Choose PNG when compatibility and lossless re-encoding matter more than file size. For ordinary photographs, JPG will usually create a much smaller output than PNG.',
    note: 'A PNG copy can be substantially larger than the original HEIC. The larger file does not mean the image gained extra detail; it reflects the different compression method.',
  },
  'webp-to-png': {
    why: 'WebP works well on the modern web, while PNG remains a common requirement for graphics workflows, screenshots, design assets, and software that expects PNG files.',
    when: 'Use PNG when you need a widely understood lossless format or a workflow centered on PNG assets. If the WebP contains transparency, PNG is often a practical target for preserving that capability.',
    note: 'Converting a lossy WebP to PNG does not restore detail lost during the earlier WebP encoding. It only prevents additional lossy compression in the new PNG file.',
  },
  'webp-to-jpg': {
    why: 'JPG remains one of the most widely accepted image formats for photos. A JPG copy is useful when an upload form, editor, or recipient cannot use WebP.',
    when: 'Choose JPG for photographs and compatibility-focused sharing when transparency is not required. If transparency matters, use PNG instead.',
    note: 'JPG does not support transparency. Transparent areas may need to be flattened during conversion, depending on the source image and codec behavior.',
  },
  'png-to-webp': {
    why: 'WebP can reduce delivery size for many web images while supporting transparency. Creating WebP copies of PNG assets can be useful for websites that want modern image delivery without changing the original source file.',
    when: 'Use WebP for browser delivery when you have tested visual quality and compatibility for your audience. Keep the PNG master for editing or workflows that need lossless source assets.',
    note: 'File size depends on the image content, dimensions, and quality setting. A format change alone is not a substitute for resizing images that are much larger than their display dimensions.',
  },
  'jpg-to-webp': {
    why: 'WebP is designed for efficient web delivery and can often produce useful web-ready copies of photographic JPG files. The best result depends on image content and the quality setting.',
    when: 'Use WebP when serving images on modern websites and applications. Keep the original JPG if it is your source file or if you need maximum compatibility outside the browser.',
    note: 'Re-encoding a JPG introduces another compression generation. Compare the result visually rather than assuming a lower file size automatically means a better image.',
  },
  'png-to-jpg': {
    why: 'JPG is often much smaller for photographs and is accepted by a very broad range of upload forms and applications. It is a practical target when a PNG does not need transparency or lossless storage.',
    when: 'Choose JPG for photos, email attachments, and compatibility-focused sharing. Keep PNG for logos, screenshots, UI graphics, or images where transparency is important.',
    note: 'JPG does not support alpha transparency. Transparent pixels may be flattened, and the result uses lossy compression controlled by the quality setting.',
  },
  'jpg-to-png': {
    why: 'Some tools and workflows require PNG even when the source image is a JPEG. Conversion changes the container and lets the new file participate in PNG-based workflows.',
    when: 'Use PNG if a destination explicitly requires PNG or if you want future edits saved without another lossy JPEG generation. Do not convert merely because you expect the image to become sharper.',
    note: 'PNG cannot reconstruct detail already discarded by JPEG compression. The PNG output may be larger while showing the same underlying visual information.',
  },
  'avif-to-jpg': {
    why: 'AVIF offers modern compression efficiency, but JPG is still easier to open in older applications, legacy workflows, and many general-purpose upload systems.',
    when: 'Create a JPG copy when broad compatibility is more important than retaining the AVIF container. Keep AVIF for modern delivery if your target environment supports it well.',
    note: 'The conversion is lossy. Output quality should be chosen by inspecting the result rather than treating quality numbers as directly comparable across AVIF and JPEG codecs.',
  },
  'tiff-to-jpg': {
    why: 'TIFF files are common in scanning, print, and professional imaging, but they can be large and inconvenient for everyday sharing. JPG creates a much more portable photo-oriented copy.',
    when: 'Use JPG for previews, websites, email, and lightweight sharing. Keep the TIFF original when archival quality, editing latitude, layers, or specialized metadata matter.',
    note: 'TIFF can contain features that a simple JPG cannot preserve. Treat the converted JPG as a delivery copy rather than a replacement for an important source TIFF.',
  },
  'bmp-to-jpg': {
    why: 'BMP files can be very large because they are often lightly compressed or uncompressed. JPG is far more practical for ordinary photographic sharing and storage.',
    when: 'Use JPG when the BMP contains photo-like imagery and you want a smaller, widely compatible file. For pixel graphics or assets needing lossless storage, PNG may be a better target.',
    note: 'JPG uses lossy compression, so sharp pixel edges or text can develop artifacts. Choose the output based on the content rather than file extension alone.',
  },
};
