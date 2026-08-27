export interface ImageGrowthGuideSection {
  id: string;
  heading: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
  callout?: { title: string; text: string };
}

export interface ImageGrowthGuideFaq {
  question: string;
  answer: string;
}

export interface ImageGrowthGuideRelated {
  href: string;
  label: string;
}

export interface ImageGrowthGuide {
  slug: string;
  title: string;
  description: string;
  h1: string;
  heroIntro: string;
  indexText: string;
  toolHref: string;
  toolLabel: string;
  quickAnswer: string;
  sections: readonly ImageGrowthGuideSection[];
  faq: readonly ImageGrowthGuideFaq[];
  related: readonly ImageGrowthGuideRelated[];
}

export const IMAGE_GROWTH_GUIDES = [
  {
    slug: 'resize-image-without-stretching',
    title: 'How to Resize an Image Without Stretching It | ConvertAnyFile',
    description: 'Learn how to resize an image without stretching or squashing it. Use aspect-ratio lock, fit-to-box sizing, cropping, and browser-based batch resizing.',
    h1: 'How to resize an image without stretching it',
    heroIntro: 'Stretching happens when width and height are changed independently. Keep the source aspect ratio when you want the image to stay proportional, and crop only when the destination requires a different shape.',
    indexText: 'Keep photos proportional with aspect-ratio lock, fit-to-box sizing, and a clear rule for when cropping is better than forcing exact dimensions.',
    toolHref: '/resize-image/',
    toolLabel: 'Resize Image',
    quickAnswer: 'Use Lock aspect ratio when changing width or height. If the destination requires a different shape, resize proportionally first and crop the excess instead of forcing both dimensions.',
    sections: [
      {
        id: 'why-stretching-happens',
        heading: 'Why images stretch when width and height are forced',
        paragraphs: [
          'Every image has an aspect ratio: the relationship between its width and height. A 1600 × 900 image is 16:9, while a 1200 × 1200 image is square. If both dimensions are replaced with numbers that use a different ratio, the visible content has to be stretched or squeezed to fill the new rectangle.',
          'That distortion is usually easy to spot in faces, circles, text, logos, and architecture. The safest default is therefore to preserve the source ratio unless the job explicitly calls for a new composition.',
        ],
      },
      {
        id: 'lock-aspect-ratio',
        heading: 'Use aspect-ratio lock for proportional resizing',
        paragraphs: [
          'In the Resize Image tool, Lock aspect ratio keeps width and height connected. Change one dimension and the other follows the proportions of the active source image. Mixed portrait and landscape files keep their own ratios rather than inheriting the ratio of the first file in the batch.',
          'This is the best choice for ordinary downscaling, thumbnails that do not require an exact frame, email copies, and images that simply need to fit within a smaller size.',
        ],
        bullets: [
          'Use Pixels when one dimension must be exact.',
          'Use Percentage when every image should scale by the same relative amount.',
          'Use Fit to box when images must stay inside maximum width and height limits.',
        ],
      },
      {
        id: 'crop-instead',
        heading: 'Crop instead of stretching when the target ratio is different',
        paragraphs: [
          'A proportional resize cannot turn a 4:3 photo into a true 16:9 frame without leaving unused space or changing the composition. When the destination needs an exact shape, the usual workflow is resize first, then crop the edges that do not fit.',
          'Cropping removes pixels outside the chosen frame but keeps objects inside the crop geometrically correct. That is generally preferable to making people or objects wider or taller just to hit an exact canvas size.',
        ],
        callout: { title: 'Exact dimensions are not the same as proportional dimensions', text: 'If both the exact width and exact height are mandatory, confirm that the source already has the same aspect ratio or plan to crop after resizing.' },
      },
      {
        id: 'batch-resize',
        heading: 'Resize a mixed batch without forcing one shape on every image',
        paragraphs: [
          'Apply to all is useful when the same sizing rule works for the whole batch. Percentage and fit-to-box modes are especially useful for mixed orientations because each image can keep its own shape while following the shared rule.',
          'Switch to Edit individually when a particular image needs a different size. Preview representative portrait and landscape images before processing a large batch.',
        ],
      },
    ],
    faq: [
      { question: 'Does resizing change the aspect ratio?', answer: 'Not when aspect-ratio lock is enabled. The width and height remain proportional to the source image.' },
      { question: 'How do I make an image exactly 1920 × 1080 without stretching?', answer: 'If the source is already 16:9, resize proportionally to 1920 × 1080. If it is not 16:9, resize to cover or fit the target and then crop rather than forcing both dimensions.' },
      { question: 'Can I resize portrait and landscape images together?', answer: 'Yes. Use a shared percentage or fit-to-box rule, or keep aspect ratio locked so each image preserves its own proportions.' },
      { question: 'Will enlarging a small image create new detail?', answer: 'No. Upscaling creates more pixels but cannot recreate source detail that was never present. Large enlargements can look softer.' },
    ],
    related: [
      { href: '/resize-image/', label: 'Resize Image tool' },
      { href: '/crop-image/', label: 'Crop Image tool' },
      { href: '/compress-image/', label: 'Compress Image tool' },
      { href: '/guides/resize-image-to-1920x1080/', label: 'Resize an image to 1920 × 1080' },
    ],
  },
  {
    slug: 'resize-image-to-1920x1080',
    title: 'How to Resize an Image to 1920×1080 Without Distortion | ConvertAnyFile',
    description: 'Resize an image to 1920×1080 without distortion. Learn when a direct resize works, when a 16:9 crop is required, and how to preserve image proportions.',
    h1: 'How to resize an image to 1920 × 1080 without distortion',
    heroIntro: '1920 × 1080 is a 16:9 frame. A direct proportional resize works when the source is already 16:9; other aspect ratios need cropping or unused space if you want to avoid stretching.',
    indexText: 'Understand the 16:9 requirement behind 1920 × 1080 and choose resize, crop, or fit-to-box without distorting the source.',
    toolHref: '/resize-image/',
    toolLabel: 'Resize Image',
    quickAnswer: 'Check the source aspect ratio first. If it is 16:9, resize with aspect ratio locked. If it is not 16:9, crop to 16:9 before or after resizing rather than forcing the image into the frame.',
    sections: [
      {
        id: 'what-1920-1080-means',
        heading: '1920 × 1080 is an exact 16:9 image size',
        paragraphs: [
          'The numbers describe pixel dimensions, but the shape matters just as much. Dividing 1920 by 1080 gives the familiar 16:9 widescreen ratio. Sources such as 3840 × 2160 can resize directly to 1920 × 1080 because they share the same ratio.',
          'A 4:3 camera photo, square graphic, or portrait image does not share that shape. Changing both dimensions directly would distort the content unless part of the image is cropped or blank space is introduced.',
        ],
      },
      {
        id: 'direct-resize',
        heading: 'When a direct resize to 1920 × 1080 works',
        paragraphs: [
          'Use Pixels mode, keep Lock aspect ratio enabled, and set the width to 1920. If the resulting height becomes 1080, the source is already 16:9 and the resize can stay proportional.',
          'If the calculated height is different, do not unlock the ratio merely to force 1080. Decide whether the destination can accept another height or whether the composition should be cropped to 16:9.',
        ],
      },
      {
        id: 'crop-to-16-9',
        heading: 'Crop to 16:9 when the source has a different shape',
        paragraphs: [
          'For a source that is taller than 16:9, a crop usually removes some content from the top and bottom. For a source that is wider, a crop removes content from the sides. Position the crop around the important subject before processing.',
          'The Crop Image tool includes a 16:9 preset, so you can establish the correct frame visually and then resize the cropped result to 1920 × 1080 if required.',
        ],
        callout: { title: 'Do not confuse resolution with quality', text: 'A 1920 × 1080 output made from a much smaller source has the requested dimensions, but the resize cannot invent sharp detail that was missing in the original.' },
      },
      {
        id: 'batch-1920',
        heading: 'Use fit-to-box for batches that do not all need an exact 16:9 frame',
        paragraphs: [
          'If the real requirement is “no image larger than 1920 × 1080,” Fit to box is usually better than forcing every file to exactly 1920 × 1080. Portrait and landscape images can remain proportional while staying inside the maximum bounds.',
          'Use exact 16:9 cropping only for workflows where every output must share the same frame, such as a fixed video canvas or standardized banner slot.',
        ],
      },
    ],
    faq: [
      { question: 'What aspect ratio is 1920 × 1080?', answer: 'It is 16:9.' },
      { question: 'Can a square image become 1920 × 1080 without cropping?', answer: 'Not while filling the full frame and preserving its shape. You must either crop, add unused space, or accept a different output dimension.' },
      { question: 'Should I resize or crop first?', answer: 'Either can work, but setting the composition with a 16:9 crop before the final resize makes the intended framing easier to review.' },
      { question: 'Can I batch resize to a maximum of 1920 × 1080?', answer: 'Yes. Fit-to-box mode is designed for a maximum bounding box while preserving each image aspect ratio.' },
    ],
    related: [
      { href: '/resize-image/', label: 'Resize Image tool' },
      { href: '/crop-image/', label: 'Crop Image tool' },
      { href: '/guides/resize-image-without-stretching/', label: 'Resize without stretching' },
      { href: '/compress-image/', label: 'Compress after resizing' },
    ],
  },
  {
    slug: 'reduce-image-file-size-without-resizing',
    title: 'How to Reduce Image File Size Without Resizing | ConvertAnyFile',
    description: 'Reduce image file size without changing pixel dimensions. Compare JPEG, WebP, PNG, and quality settings, then compress images locally in your browser.',
    h1: 'How to reduce image file size without resizing',
    heroIntro: 'File size and pixel dimensions are different things. If the dimensions are already correct, re-encoding a JPG or WebP at an appropriate quality can reduce bytes without changing the width or height.',
    indexText: 'Reduce image bytes while keeping the same dimensions by choosing the right output format and quality instead of shrinking the canvas.',
    toolHref: '/compress-image/',
    toolLabel: 'Compress Image',
    quickAnswer: 'Keep the current dimensions and change only the encoding settings. JPG and WebP respond to quality controls; PNG remains lossless in this workflow, so its size may not fall as dramatically.',
    sections: [
      {
        id: 'dimensions-vs-file-size',
        heading: 'Pixel dimensions and file size are separate',
        paragraphs: [
          'An image can stay 2400 × 1600 pixels while its file size changes substantially. The number of pixels controls the canvas dimensions, while the format, compression method, quality setting, transparency, and visual complexity influence how many bytes are needed to store those pixels.',
          'That means resizing is not required when the image already has the correct dimensions for the destination. Compression can create a lighter copy of the same width and height.',
        ],
      },
      {
        id: 'jpg-webp-quality',
        heading: 'Use JPEG or WebP quality controls for lossy compression',
        paragraphs: [
          'JPEG and WebP can trade some visual fidelity for smaller files. Lowering quality generally reduces file size, but the relationship is not linear and the same setting can look different across photographs, illustrations, text, and gradients.',
          'Preview important details at the size people will actually see them. A small saving is not useful if text becomes difficult to read or fine edges develop obvious artifacts.',
        ],
        bullets: [
          'JPEG is widely compatible for photographs.',
          'WebP is useful for modern web delivery and can also preserve transparency.',
          'Keep the original source when repeated exports may be needed later.',
        ],
      },
      {
        id: 'png-behavior',
        heading: 'Why PNG often behaves differently',
        paragraphs: [
          'PNG is lossless in the current compression workflow. There is no lossy quality slider that throws away visual information in the same way as JPEG or WebP. File-size savings therefore depend more on the actual image content and the encoding result.',
          'Screenshots, flat graphics, and transparent assets may still belong in PNG. Photographic PNG files, however, can be much larger than a carefully encoded JPEG or WebP delivery copy.',
        ],
      },
      {
        id: 'measure-results',
        heading: 'Compare the actual output bytes before choosing a setting',
        paragraphs: [
          'The best compression setting is the one that meets the destination requirement while keeping acceptable visual quality. Compare the output file size, inspect the image, and avoid assuming that one quality number is ideal for every file.',
          'For a batch, use shared settings as a starting point and switch to individual overrides for images that need a different format or quality level.',
        ],
      },
    ],
    faq: [
      { question: 'Does compression change image dimensions?', answer: 'The Compress Image tool keeps the decoded width and height unchanged. It changes the output encoding and quality settings.' },
      { question: 'Which is smaller, JPG or WebP?', answer: 'It depends on the source and chosen quality. Compare real outputs rather than assuming one format always wins.' },
      { question: 'Can I compress PNG with a quality slider?', answer: 'PNG remains lossless in this workflow, so the JPEG/WebP-style lossy quality control does not apply to PNG output.' },
      { question: 'Should I resize as well as compress?', answer: 'Only when the pixel dimensions are larger than the destination needs. If dimensions are already correct, compression alone may be enough.' },
    ],
    related: [
      { href: '/compress-image/', label: 'Compress Image tool' },
      { href: '/resize-image/', label: 'Resize Image tool' },
      { href: '/guides/compress-images-for-web/', label: 'Compress images for the web' },
      { href: '/jpg-to-webp/', label: 'JPG to WebP converter' },
    ],
  },
  {
    slug: 'compress-images-for-web',
    title: 'How to Compress Images for the Web | ConvertAnyFile',
    description: 'Compress images for websites with practical guidance on WebP, JPEG, PNG, quality, dimensions, batch processing, and checking the final delivery files.',
    h1: 'How to compress images for the web',
    heroIntro: 'Web image optimization is a balance between bytes, dimensions, visual quality, transparency, and compatibility. Start with the dimensions your layout needs, then choose an efficient delivery format and quality.',
    indexText: 'A practical web-image workflow covering dimensions, JPEG/WebP quality, PNG transparency, delivery copies, and batch compression.',
    toolHref: '/compress-image/',
    toolLabel: 'Compress Image',
    quickAnswer: 'Use the dimensions your page actually displays, choose JPEG or WebP for quality-controlled photo delivery, keep PNG when lossless transparency is important, and compare the real output size before publishing.',
    sections: [
      {
        id: 'start-with-dimensions',
        heading: 'Do not send more pixels than the layout needs',
        paragraphs: [
          'Compression cannot fully compensate for unnecessarily large dimensions. A photograph displayed at roughly 1200 pixels wide usually does not need a 6000-pixel source delivered to every visitor. Create a delivery copy at a sensible size while retaining the larger original for future use.',
          'If the dimensions are already correct, skip resizing and focus on the encoding format and quality instead.',
        ],
      },
      {
        id: 'choose-format',
        heading: 'Choose a format that matches the visual content',
        paragraphs: [
          'JPEG remains a practical compatibility format for photographs. WebP is widely used for modern web delivery and supports both lossy compression and transparency. PNG is useful for lossless graphics and transparency but can be inefficient for photographs.',
          'The most efficient choice depends on the destination, browser support requirements, transparency, and whether the asset is a photo, screenshot, illustration, or interface graphic.',
        ],
      },
      {
        id: 'quality-testing',
        heading: 'Test quality at the actual display size',
        paragraphs: [
          'Quality settings are codec controls, not universal percentages of visual quality. A value that looks good on one photo can create visible artifacts on another. Check faces, gradients, text, fine patterns, and sharp edges after compression.',
          'Compare the final bytes as well as the preview. If lowering quality saves very little, keep the cleaner version. If it saves a large amount without visible damage at the intended size, the smaller copy may be a better delivery asset.',
        ],
        callout: { title: 'Keep a source master', text: 'Web-optimized files are delivery copies. Keep the best available original so future exports do not start from an already compressed derivative.' },
      },
      {
        id: 'batch-workflow',
        heading: 'Batch similar assets, then review exceptions',
        paragraphs: [
          'A shared output format and quality level can save time when a group of images has similar content and purpose. Use individual overrides for hero images, text-heavy graphics, or transparent assets that need different treatment.',
          'After processing, download and spot-check several results before replacing production assets. File-size targets should support the user experience without turning the optimization process into visible quality loss.',
        ],
      },
    ],
    faq: [
      { question: 'Is WebP always better than JPG for websites?', answer: 'No single format is always best. WebP is useful for modern delivery, while JPEG remains broadly compatible. Compare quality, file size, and destination support.' },
      { question: 'Should website images be resized before compression?', answer: 'If the source dimensions are much larger than the displayed size, a proportional resize usually makes sense before or alongside compression.' },
      { question: 'What quality setting should I use?', answer: 'There is no universal setting. Preview representative images and compare the actual output bytes at the intended display size.' },
      { question: 'Can I compress a batch locally?', answer: 'Yes. The Compress Image tool processes supported images in the browser and supports shared settings plus individual overrides.' },
    ],
    related: [
      { href: '/compress-image/', label: 'Compress Image tool' },
      { href: '/resize-image/', label: 'Resize Image tool' },
      { href: '/png-to-webp/', label: 'PNG to WebP converter' },
      { href: '/jpg-to-webp/', label: 'JPG to WebP converter' },
      { href: '/guides/reduce-image-file-size-without-resizing/', label: 'Reduce file size without resizing' },
    ],
  },
  {
    slug: 'crop-image-to-circle',
    title: 'How to Crop an Image Into a Circle | ConvertAnyFile',
    description: 'Crop an image into a circle with transparent corners. Drag and resize the crop visually, choose PNG or WebP output, and process one image or a batch locally.',
    h1: 'How to crop an image into a circle',
    heroIntro: 'A circular crop needs transparency outside the circle if you want the result to remain truly round. Position the circle over the subject, resize it visually, and use an output format that can preserve the transparent corners.',
    indexText: 'Create a true circular crop with transparent corners, direct drag positioning, PNG/WebP output, and batch or individual framing.',
    toolHref: '/crop-image/',
    toolLabel: 'Crop Image',
    quickAnswer: 'Choose Circle in the Crop Image tool, drag the highlighted crop over the subject, resize it from a corner, and process the image. PNG or WebP is used so pixels outside the circle can stay transparent.',
    sections: [
      {
        id: 'circle-transparency',
        heading: 'A true circle needs transparent corners',
        paragraphs: [
          'Image files are still stored on rectangular canvases. A circular crop therefore keeps the pixels inside the circle and makes the surrounding corner area transparent. If those corners were filled with a solid color instead, the file would look circular only against a matching background.',
          'PNG and WebP can preserve transparency, which is why they are appropriate outputs for this workflow.',
        ],
      },
      {
        id: 'position-circle',
        heading: 'Drag the circle directly over the subject',
        paragraphs: [
          'Start with Circle, then drag inside the highlighted area to move it. Pull a corner to resize the selection while watching the live preview. Keep important features away from the edge if the crop will be used as an avatar or profile graphic.',
          'The 1:1 relationship is built into the circular shape, so you do not need to manually calculate a square crop before choosing Circle.',
        ],
      },
      {
        id: 'circle-vs-square',
        heading: 'Choose Circle or Square based on where the asset will be used',
        paragraphs: [
          'Some websites display square uploads inside a circular interface automatically. In that case, a square crop may give the platform more flexibility. A true circle crop is useful when the transparent shape itself must be part of the exported file.',
          'Keep the original image so you can create different crops later without starting from an already trimmed version.',
        ],
      },
      {
        id: 'batch-circle',
        heading: 'Use shared framing only when subjects are positioned similarly',
        paragraphs: [
          'Apply to all is useful for repeated product shots, portraits, or graphics where the subject sits in a similar relative position. For mixed photos, switch to individual editing and move the circle separately on each important image.',
          'Review the exported transparency on the background where the image will actually be used.',
        ],
      },
    ],
    faq: [
      { question: 'Can JPG store a transparent circular crop?', answer: 'No. JPEG does not support alpha transparency, so a true circular crop with transparent corners needs a format such as PNG or WebP.' },
      { question: 'Can I move the circle by dragging it?', answer: 'Yes. Drag inside the highlighted crop to move it and pull a corner to resize it.' },
      { question: 'Can I crop many images into circles?', answer: 'Yes. Reuse one setup for similarly framed images or edit individual images when subject placement differs.' },
      { question: 'Does a circle crop change the original file?', answer: 'No. The tool creates a new output and leaves the source file unchanged.' },
    ],
    related: [
      { href: '/crop-image/', label: 'Crop Image tool' },
      { href: '/resize-image/', label: 'Resize Image tool' },
      { href: '/blur-image/', label: 'Blur Image tool' },
      { href: '/guides/resize-image-without-stretching/', label: 'Resize without stretching' },
    ],
  },
  {
    slug: 'blur-part-of-image',
    title: 'How to Blur Part of an Image Online | ConvertAnyFile',
    description: 'Blur part of an image with a manual Rectangle or Circle selection. Drag and resize the blur area, adjust strength, preview the result, and process locally.',
    h1: 'How to blur part of an image online',
    heroIntro: 'Use Selected area when only one part of an image should be softened. Choose Rectangle or Circle, position the selection directly on the preview, resize it, and adjust the blur strength before exporting.',
    indexText: 'Blur a selected Rectangle or Circle by dragging directly on the image, with strength control, live preview, batch reuse, and privacy limitations explained.',
    toolHref: '/blur-image/',
    toolLabel: 'Blur Image',
    quickAnswer: 'Choose Selected area, pick Rectangle or Circle, drag the highlighted region over the detail you want to soften, resize it from a corner, and adjust blur strength while checking the live preview.',
    sections: [
      {
        id: 'selected-area',
        heading: 'Choose Selected area instead of blurring the whole image',
        paragraphs: [
          'Whole-image blur is useful for backgrounds and design layers. Selected-area blur is better when the rest of the image should remain sharp. The current tool offers Rectangle and Circle selections so the blur area can roughly match the shape of the target detail.',
          'The selection is manual. It does not identify faces, text, license plates, or private information automatically.',
        ],
      },
      {
        id: 'drag-resize',
        heading: 'Drag and resize the blur region on the preview',
        paragraphs: [
          'Move the highlighted region directly on the image, then resize it from a corner. Keep the selection slightly larger than the detail when soft edges or movement could leave recognizable pixels around the boundary.',
          'Adjust blur strength while viewing the result at a realistic display size. A very strong blur changes the look substantially, while a weak blur may still leave details easy to recognize.',
        ],
      },
      {
        id: 'privacy-limit',
        heading: 'Blur is a visual effect, not a universal secure-redaction method',
        paragraphs: [
          'Do not assume that ordinary blur is sufficient whenever information must be permanently and irrecoverably hidden. Privacy, legal, or security workflows can require a dedicated redaction process and independent verification of the exported pixels.',
          'For ordinary design work, screenshots, and non-sensitive visual emphasis, manual blur can still be a convenient editing tool.',
        ],
        callout: { title: 'Review sensitive exports carefully', text: 'When privacy matters, inspect the downloaded result independently and use an appropriate redaction workflow for information that must not remain recoverable.' },
      },
      {
        id: 'batch-blur',
        heading: 'Reuse a blur region across repeated layouts',
        paragraphs: [
          'A shared region works well for screenshots or template images where the same area appears in the same relative position. Use individual overrides when layouts or subject positions differ.',
          'Because processing runs locally for supported images, repeated batch work does not require uploading every source image to a remote editor.',
        ],
      },
    ],
    faq: [
      { question: 'Can I blur a circular area?', answer: 'Yes. Selected-area mode supports Circle as well as Rectangle.' },
      { question: 'Does the tool detect faces automatically?', answer: 'No. The blur selection is manual and does not automatically detect faces, text, plates, or other content.' },
      { question: 'Can I blur the same area in multiple images?', answer: 'Yes, when the target appears in a similar relative position. Use individual overrides for exceptions.' },
      { question: 'Is blur enough for secure redaction?', answer: 'Do not assume that it is. Use a dedicated redaction workflow and verify the output when information must be irrecoverable.' },
    ],
    related: [
      { href: '/blur-image/', label: 'Blur Image tool' },
      { href: '/crop-image/', label: 'Crop Image tool' },
      { href: '/remove-image-metadata/', label: 'Remove Image Metadata' },
      { href: '/guides/remove-exif-from-photo/', label: 'Remove EXIF from a photo' },
    ],
  },
  {
    slug: 'remove-exif-from-photo',
    title: 'How to Remove EXIF Data From a Photo | ConvertAnyFile',
    description: 'Remove common EXIF camera, GPS, and software metadata from JPG, PNG, or WebP copies locally in your browser, then verify the cleaned output before sharing.',
    h1: 'How to remove EXIF data from a photo',
    heroIntro: 'EXIF and related metadata can describe the camera, capture settings, location, or software used to create a file. A clean sharing copy can be made by decoding the visible pixels and encoding a new image without copying those source metadata fields.',
    indexText: 'Create a clean sharing copy without common EXIF, GPS, and software tags, and understand what metadata removal can and cannot remove.',
    toolHref: '/remove-image-metadata/',
    toolLabel: 'Remove Image Metadata',
    quickAnswer: 'Add the supported image, choose an output format, run Remove metadata, and download the newly encoded copy. When metadata removal is important, verify the final file with a trusted metadata viewer before sharing.',
    sections: [
      {
        id: 'what-exif-is',
        heading: 'What EXIF metadata can contain',
        paragraphs: [
          'EXIF is commonly associated with camera information such as model, exposure settings, focal length, timestamps, and sometimes GPS coordinates. Image files can also contain software or editor tags and other metadata outside the core visible pixels.',
          'The exact fields depend on the source device, application, and format. A file with little metadata may already reveal very little, while another can contain many descriptive fields.',
        ],
      },
      {
        id: 'clean-copy',
        heading: 'Create a new image instead of editing metadata fields in place',
        paragraphs: [
          'The Remove Image Metadata workflow decodes the visible image and creates a new output without intentionally copying the source EXIF, GPS, or common software metadata fields. The original file remains unchanged.',
          'Same as source refers to the image format family, not to preserving the original file bytes. The result is still a newly encoded copy.',
        ],
      },
      {
        id: 'visible-information',
        heading: 'Metadata cleanup does not remove information visible in the pixels',
        paragraphs: [
          'A photographed street sign, printed address, timestamp overlay, face, document number, or location name remains part of the image itself. Removing metadata does not alter those visible pixels.',
          'If the picture contains visible information you do not want to share, use an appropriate editing or redaction workflow in addition to metadata cleanup.',
        ],
      },
      {
        id: 'verify-metadata',
        heading: 'Verify the downloaded copy when metadata removal matters',
        paragraphs: [
          'For casual sharing, creating a clean copy may be enough. For privacy-sensitive, legal, or security-critical work, inspect the final downloaded file with a trusted metadata viewer rather than assuming that every possible metadata mechanism has been handled.',
          'Keep the original separately if camera metadata or editing history may be useful later.',
        ],
        callout: { title: 'Originals stay unchanged', text: 'Metadata cleanup creates a new file. Keep the source when you may need its original metadata or the highest-quality master later.' },
      },
    ],
    faq: [
      { question: 'Does removing EXIF change the visible image?', answer: 'The tool re-encodes the visible pixels into a new file. The intended visible content stays the same, although normal re-encoding behavior can affect file size and metadata.' },
      { question: 'Does it remove GPS data too?', answer: 'The workflow does not intentionally copy source EXIF, GPS, or common software tags into the new output.' },
      { question: 'Does it remove a timestamp printed on the photo?', answer: 'No. A visible timestamp is part of the pixels and requires image editing rather than metadata cleanup.' },
      { question: 'Should I verify the result?', answer: 'Yes when metadata removal is important. Inspect the final downloaded file with a trusted metadata viewer.' },
    ],
    related: [
      { href: '/remove-image-metadata/', label: 'Remove Image Metadata tool' },
      { href: '/guides/remove-gps-location-from-image/', label: 'Remove GPS location from an image' },
      { href: '/compress-image/', label: 'Compress Image tool' },
      { href: '/bulk-rename-images/', label: 'Bulk Rename Images' },
    ],
  },
  {
    slug: 'remove-gps-location-from-image',
    title: 'How to Remove GPS Location From an Image | ConvertAnyFile',
    description: 'Remove embedded GPS location metadata from supported image copies locally in your browser. Learn the difference between file metadata and visible location clues.',
    h1: 'How to remove GPS location from an image',
    heroIntro: 'Some photos can contain embedded coordinates in metadata. Creating a newly encoded copy without copying GPS fields can remove that file-level location data, but it cannot remove location clues that are visible inside the picture.',
    indexText: 'Remove embedded GPS metadata from a sharing copy and learn why visible addresses, signs, and landmarks need separate review.',
    toolHref: '/remove-image-metadata/',
    toolLabel: 'Remove Image Metadata',
    quickAnswer: 'Create a new copy with the Remove Image Metadata tool, then verify the downloaded file with a trusted metadata viewer. Also inspect the visible image for signs, addresses, landmarks, or overlays that can still reveal location.',
    sections: [
      {
        id: 'gps-metadata',
        heading: 'GPS coordinates can be stored separately from the visible photo',
        paragraphs: [
          'Camera and phone workflows can store latitude, longitude, altitude, or related location information in metadata. Those fields are not part of the visible pixels and may be read by software that understands the metadata container.',
          'Whether a particular file contains coordinates depends on the capture device, privacy settings, editing history, and export workflow.',
        ],
      },
      {
        id: 'remove-location-copy',
        heading: 'Create a clean copy without copying the source GPS fields',
        paragraphs: [
          'The metadata cleanup tool decodes the visible image and encodes a new output without intentionally copying EXIF, GPS, or common software metadata fields. This avoids editing the source file in place and leaves the original available if you need it later.',
          'Choose the output format that fits the destination, process the image, and download the new copy rather than sharing the original directly.',
        ],
      },
      {
        id: 'visible-location-clues',
        heading: 'Remove metadata and still review visible location clues',
        paragraphs: [
          'A clean metadata result can still show a street sign, house number, school name, map, storefront, landmark, license plate, or location overlay. Those clues are part of the image pixels and are unaffected by metadata cleanup.',
          'If visible details should not be shared, edit or redact them separately and review the final output at normal viewing size.',
        ],
        callout: { title: 'Metadata is only one layer of location privacy', text: 'Removing GPS fields does not make a photograph anonymous. The scene itself can reveal where it was taken.' },
      },
      {
        id: 'verify-gps',
        heading: 'Verify the final file before sensitive sharing',
        paragraphs: [
          'When location privacy matters, inspect the downloaded copy with a trusted metadata viewer and confirm that the receiving workflow is using the cleaned file rather than the original.',
          'Keep privacy-sensitive originals organized so they are not accidentally attached or uploaded in place of the cleaned copies.',
        ],
      },
    ],
    faq: [
      { question: 'Does removing GPS metadata remove the location from the picture?', answer: 'It removes file-level metadata in the clean-copy workflow, but visible signs, landmarks, maps, or overlays remain in the pixels.' },
      { question: 'Can Same as source still create a metadata-clean file?', answer: 'Yes. Same as source refers to the output format family; the tool still creates a newly encoded copy instead of returning the original bytes.' },
      { question: 'How can I check whether GPS metadata is gone?', answer: 'Use a trusted metadata viewer on the downloaded result when location privacy is important.' },
      { question: 'Does the original photo change?', answer: 'No. The original remains unchanged and the tool creates a new copy.' },
    ],
    related: [
      { href: '/remove-image-metadata/', label: 'Remove Image Metadata tool' },
      { href: '/guides/remove-exif-from-photo/', label: 'Remove EXIF from a photo' },
      { href: '/blur-image/', label: 'Blur Image tool' },
      { href: '/privacy/', label: 'ConvertAnyFile privacy policy' },
    ],
  },
] satisfies readonly ImageGrowthGuide[];

export const getImageGrowthGuide = (slug: string): ImageGrowthGuide | undefined => IMAGE_GROWTH_GUIDES.find((guide) => guide.slug === slug);
