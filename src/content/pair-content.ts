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
  'heic-to-webp': {
    why: 'HEIC is efficient for phone photo storage, while WebP is widely used for modern website delivery. A WebP copy can move a supported HEIC photo into a format that fits browser-oriented publishing pipelines more naturally.',
    when: 'Use WebP when the destination is a modern website or application and your publishing tools already handle WebP reliably. Keep the HEIC source as the original photo rather than treating the delivery copy as a replacement.',
    note: 'HEIC to WebP can introduce another lossy encoding generation. Compare the rendered image and final bytes at realistic display sizes instead of assuming the same quality number means the same visual result across codecs.',
  },
  'heic-to-tiff': {
    why: 'Some scanning, editing, print, and professional imaging workflows expect TIFF rather than a phone-oriented HEIC container. Converting creates a TIFF copy that can enter those workflows without changing the original HEIC file.',
    when: 'Choose TIFF only when a downstream application or professional workflow explicitly benefits from it. For ordinary sharing or web delivery, JPG, PNG, or WebP will usually be simpler and smaller.',
    note: 'TIFF files can be much larger than HEIC and a larger container does not create extra source detail. Metadata and HEIC-specific features may not map perfectly into a simple TIFF output.',
  },
  'webp-to-png': {
    why: 'WebP works well on the modern web, while PNG remains a common requirement for graphics workflows, screenshots, design assets, and software that expects PNG files.',
    when: 'Use PNG when you need a widely understood lossless format or a workflow centered on PNG assets. If the WebP contains transparency, PNG is often a practical target for preserving that capability.',
    note: 'Converting a lossy WebP to PNG does not restore detail lost during the earlier WebP encoding. It only prevents additional lossy compression in the new PNG file.',
  },
  'webp-to-jpg': {
    why: 'JPG remains one of the most widely accepted image formats for photos. A JPG copy is useful when an upload form, editor, or recipient cannot use WebP.',
    when: 'Choose JPG for photographs and compatibility-focused sharing when transparency is not required. If transparency matters, use PNG instead.',
    note: 'JPG does not support transparency. Transparent source pixels are flattened for the JPEG output, and the new file uses lossy JPEG compression.',
  },
  'webp-to-avif': {
    why: 'WebP and AVIF are both modern delivery formats, but some image pipelines choose AVIF when it produces a useful reduction in transfer size at an acceptable visual quality. Conversion lets you test that trade-off with real source images.',
    when: 'Use AVIF when your browsers, CMS, CDN, image optimizer, and downstream tools support it reliably. If operational simplicity matters more than squeezing additional bytes, keeping WebP may be the better choice.',
    note: 'Re-encoding a lossy WebP as AVIF cannot restore information already discarded by the WebP source. Codec quality numbers are not directly comparable, so inspect the actual output.',
  },
  'webp-to-tiff': {
    why: 'TIFF is used in some professional editing, interchange, scanning, and print workflows where WebP is not the expected source format. A TIFF copy can improve workflow compatibility even though it will usually be larger.',
    when: 'Use TIFF when a specific desktop or professional tool expects it. For websites and general sharing, retaining WebP or converting to JPG or PNG is usually more practical.',
    note: 'A TIFF output can be dramatically larger than the WebP source without gaining new visual detail. Treat it as an interchange copy and keep the original when source fidelity or metadata matters.',
  },
  'png-to-webp': {
    why: 'WebP can reduce delivery size for many web images while supporting transparency. Creating WebP copies of PNG assets can be useful for websites that want modern image delivery without changing the original source file.',
    when: 'Use WebP for browser delivery when you have tested visual quality and compatibility for your audience. Keep the PNG master for editing or workflows that need lossless source assets.',
    note: 'File size depends on the image content, dimensions, and quality setting. A format change alone is not a substitute for resizing images that are much larger than their display dimensions.',
  },
  'png-to-jpg': {
    why: 'JPG is often much smaller for photographs and is accepted by a very broad range of upload forms and applications. It is a practical target when a PNG does not need transparency or lossless storage.',
    when: 'Choose JPG for photos, email attachments, and compatibility-focused sharing. Keep PNG for logos, screenshots, UI graphics, or images where transparency is important.',
    note: 'JPG does not support alpha transparency. Transparent pixels are flattened to white in this converter, and the result uses lossy JPEG compression controlled by the quality setting.',
  },
  'png-to-avif': {
    why: 'PNG is excellent for lossless source graphics, but AVIF can be much more compact for some modern delivery cases. Creating an AVIF copy can reduce transfer cost while leaving the original PNG available for editing.',
    when: 'Use AVIF for a tested modern web or application pipeline where browser and tooling support are known. Keep PNG for master graphics, screenshots, or workflows that need straightforward lossless editing compatibility.',
    note: 'The default AVIF workflow can be lossy, so transparent or sharp-edged PNG assets should be checked carefully after conversion. A smaller file is only useful when visual quality remains acceptable.',
  },
  'png-to-tiff': {
    why: 'Some print, scanning, archival, and professional imaging tools are built around TIFF files even when the source is PNG. Conversion provides a TIFF container for those destination requirements.',
    when: 'Choose TIFF when the receiving application explicitly asks for TIFF or your professional workflow standardizes on it. PNG is usually more convenient for ordinary screen graphics and general sharing.',
    note: 'Both formats can support lossless workflows, but TIFF may contain different metadata and feature sets and can be substantially larger. Conversion does not add detail that was absent from the PNG.',
  },
  'jpg-to-webp': {
    why: 'WebP is designed for efficient web delivery and can often produce useful web-ready copies of photographic JPG files. The best result depends on image content and the quality setting.',
    when: 'Use WebP when serving images on modern websites and applications. Keep the original JPG if it is your source file or if you need maximum compatibility outside the browser.',
    note: 'Re-encoding a JPG introduces another compression generation. Compare the result visually rather than assuming a lower file size automatically means a better image.',
  },
  'jpg-to-png': {
    why: 'Some tools and workflows require PNG even when the source image is a JPEG. Conversion changes the container and lets the new file participate in PNG-based workflows.',
    when: 'Use PNG if a destination explicitly requires PNG or if you want future edits saved without another lossy JPEG generation. Do not convert merely because you expect the image to become sharper.',
    note: 'PNG cannot reconstruct detail already discarded by JPEG compression. The PNG output may be larger while showing the same underlying visual information.',
  },
  'jpg-to-avif': {
    why: 'AVIF can be an efficient modern delivery target for photographs that currently exist as JPG. Creating an AVIF copy can reduce transfer size in a compatible publishing pipeline while the original JPG remains available as a broadly supported source or fallback.',
    when: 'Use AVIF after testing your real browsers, CMS, CDN, and image tooling. Keep JPG when maximum compatibility or a simpler publishing workflow matters more than potential transfer savings.',
    note: 'JPG is already lossy, so JPG to AVIF adds another encoding generation. Compare the rendered result at the intended display size rather than comparing encoder quality numbers directly.',
  },
  'jpg-to-tiff': {
    why: 'A TIFF copy can be useful when a desktop, print, or professional imaging workflow explicitly requires TIFF input even though the source is JPEG.',
    when: 'Choose TIFF for destination compatibility, not as a way to improve a JPEG. Keep the original JPG when it is the best available source and use the TIFF as an interchange copy.',
    note: 'TIFF cannot restore detail lost during the original JPEG compression. The output can become much larger while containing essentially the same visual information.',
  },
  'avif-to-jpg': {
    why: 'AVIF offers modern compression efficiency, but JPG is still easier to open in older applications, legacy workflows, and many general-purpose upload systems.',
    when: 'Create a JPG copy when broad compatibility is more important than retaining the AVIF container. Keep AVIF for modern delivery if your target environment supports it well.',
    note: 'The conversion is lossy. Output quality should be chosen by inspecting the result rather than treating quality numbers as directly comparable across AVIF and JPEG codecs.',
  },
  'avif-to-png': {
    why: 'PNG is often easier to use in graphics editors, documentation tools, and workflows that expect a lossless image container. Converting AVIF to PNG can improve compatibility and preserve alpha transparency when the decoded source provides it.',
    when: 'Use PNG when you need lossless re-encoding, transparent graphics, or a destination that does not accept AVIF. For photographic delivery, PNG may be much larger than JPG or the original AVIF.',
    note: 'A PNG output cannot restore information lost if the AVIF source was encoded lossily. The larger file size reflects lossless PNG storage rather than newly created detail.',
  },
  'avif-to-webp': {
    why: 'WebP has mature support across many browsers, CMS platforms, CDNs, and image tools. A WebP copy can be a practical fallback when an existing pipeline handles WebP more consistently than AVIF.',
    when: 'Choose WebP when modern browser delivery is still desired but tooling compatibility is a concern. Keep the AVIF source if it is useful in a higher-efficiency pipeline or as the original delivery asset.',
    note: 'Converting a lossy AVIF to WebP creates another lossy generation. Compare the real output visually and measure final transfer bytes instead of assuming one codec always wins.',
  },
  'avif-to-tiff': {
    why: 'TIFF can bridge a modern AVIF image into professional editing, print, scanning, or interchange software that is built around TIFF rather than newer web codecs.',
    when: 'Use TIFF when a specific downstream workflow expects it. For everyday sharing and websites, JPG, PNG, or WebP usually provide a more practical result.',
    note: 'TIFF can be much larger than AVIF and does not recover information that a lossy AVIF source no longer contains. Keep the original AVIF when it remains useful.',
  },
  'tiff-to-jpg': {
    why: 'TIFF files are common in scanning, print, and professional imaging, but they can be large and inconvenient for everyday sharing. JPG creates a much more portable photo-oriented copy.',
    when: 'Use JPG for previews, websites, email, and lightweight sharing. Keep the TIFF original when archival quality, editing latitude, layers, or specialized metadata matter.',
    note: 'TIFF can contain features that a simple JPG cannot preserve. Treat the converted JPG as a delivery copy rather than a replacement for an important source TIFF.',
  },
  'tiff-to-png': {
    why: 'PNG offers broad support and a simpler lossless image workflow than many TIFF-based professional files. A PNG copy can make a supported TIFF easier to use in browsers, documentation, and graphics tools.',
    when: 'Choose PNG for lossless screen graphics, transparency-oriented workflows, and applications that do not need TIFF-specific features. Keep the TIFF source for archival, print, or specialist metadata needs.',
    note: 'TIFF can contain pages, metadata, color information, or other features that a simple PNG output may not preserve. Verify the result before replacing any important source workflow.',
  },
  'tiff-to-webp': {
    why: 'Large TIFF sources are often poor delivery files for websites. WebP can create a much lighter browser-oriented copy that is easier to transfer while the TIFF remains the master or archival source.',
    when: 'Use WebP for tested modern web delivery. Keep TIFF for editing, scanning, print, archival, or professional workflows where its richer container is valuable.',
    note: 'A lossy WebP output trades some source fidelity for delivery efficiency. Compare the result at the intended display size and never discard an important TIFF master solely because the WebP looks similar.',
  },
  'tiff-to-avif': {
    why: 'AVIF can turn a large TIFF source into a compact modern delivery asset for environments that support the codec. This is useful when the TIFF is a master file but the destination needs efficient transfer.',
    when: 'Use AVIF for a modern website or application after testing browser, CMS, CDN, and device behavior. Keep TIFF for professional or archival use and provide a more compatible fallback when required.',
    note: 'The AVIF delivery copy can be lossy and may not retain TIFF-specific metadata or features. Preserve the source TIFF and evaluate the actual visual result rather than codec labels alone.',
  },
  'bmp-to-jpg': {
    why: 'BMP files can be very large because they are often lightly compressed or uncompressed. JPG is far more practical for ordinary photographic sharing and storage.',
    when: 'Use JPG when the BMP contains photo-like imagery and you want a smaller, widely compatible file. For pixel graphics or assets needing lossless storage, PNG may be a better target.',
    note: 'JPG uses lossy compression, so sharp pixel edges or text can develop artifacts. Choose the output based on the content rather than file extension alone.',
  },
  'bmp-to-png': {
    why: 'PNG can shrink many BMP graphics without introducing lossy compression and is much easier to use on websites, in documentation, and in modern design workflows.',
    when: 'Choose PNG for screenshots, diagrams, UI graphics, text-heavy images, or any BMP asset where preserving exact pixel information is important. For photographs, JPG or WebP may be much smaller.',
    note: 'PNG compression is lossless, so the output should not gain JPEG-style artifacts. File-size savings depend on the image content and the way the original BMP was stored.',
  },
  'bmp-to-webp': {
    why: 'BMP is usually inefficient for web delivery, while WebP is designed for modern browser use. Converting can create a much smaller delivery copy from a large bitmap source.',
    when: 'Use WebP for websites and applications when modern browser compatibility is appropriate. Keep BMP only when a legacy workflow explicitly requires it or when it is the source supplied by another system.',
    note: 'A lossy WebP setting can alter sharp pixel edges and text. Inspect graphics carefully, and consider PNG instead when exact lossless pixel storage matters more than transfer size.',
  },
  'bmp-to-tiff': {
    why: 'Some legacy, scanning, print, and professional tools prefer TIFF even when the original asset is a Windows bitmap. A TIFF copy can improve compatibility with those workflows.',
    when: 'Choose TIFF when a destination application specifically requires it. For ordinary sharing, browser use, or documentation, PNG, JPG, or WebP will usually be simpler.',
    note: 'Changing BMP to TIFF is primarily a workflow or container conversion. It does not increase the source resolution or create image detail that was not already present.',
  },
};
