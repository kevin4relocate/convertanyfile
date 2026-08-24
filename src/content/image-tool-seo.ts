export interface ImageToolSeoStep {
  title: string;
  text: string;
}

export interface ImageToolSeoFaq {
  question: string;
  answer: string;
}

export interface ImageToolSeoContent {
  howToHeading: string;
  howToIntro: string;
  steps: readonly ImageToolSeoStep[];
  useCasesHeading: string;
  useCasesIntro: string;
  useCases: readonly string[];
  faq: readonly ImageToolSeoFaq[];
  relatedIds: readonly string[];
}

export const IMAGE_TOOL_SEO: Record<string, ImageToolSeoContent> = {
  'resize-image': {
    howToHeading: 'How to resize images online in a browser.',
    howToIntro: 'Choose a sizing method that matches the job, check the active preview, then process the batch locally without uploading source images to a resize API.',
    steps: [
      { title: 'Add JPG, PNG or WebP images', text: 'Choose one image or a batch. The queue keeps the files together while you review and edit the active image.' },
      { title: 'Choose pixels, percentage or fit-to-box', text: 'Use exact dimensions for a fixed output size, percentage for proportional scaling, or fit-to-box when every image must stay inside a maximum width and height.' },
      { title: 'Keep the aspect ratio when needed', text: 'With aspect lock enabled, each image keeps its own proportions instead of inheriting the shape of another image in the batch.' },
      { title: 'Preview, resize and download', text: 'Inspect the active preview, process the batch sequentially in your browser, then download one result or a ZIP of multiple results.' },
    ],
    useCasesHeading: 'Use the resize tool for web images, thumbnails and batch dimension cleanup.',
    useCasesIntro: 'Resizing changes pixel dimensions, so the best method depends on whether you care about exact size, relative scale or a maximum bounding box.',
    useCases: [
      'Create consistent maximum dimensions for website and blog images.',
      'Scale a batch down by the same percentage while preserving each source aspect ratio.',
      'Prepare smaller copies before compression or sharing.',
      'Resize mixed portrait and landscape images without forcing them into one shape.',
    ],
    faq: [
      { question: 'Can I resize multiple images at once?', answer: 'Yes. Add up to the tool batch limit, use Apply to all for one shared setup, or switch to Edit individually when a specific image needs different dimensions.' },
      { question: 'Will Lock aspect ratio stretch portrait and landscape images?', answer: 'No. The resize logic preserves the aspect ratio of each individual source image. A mixed batch does not reuse the active image ratio for every file.' },
      { question: 'Does resizing improve image quality?', answer: 'No. Reducing dimensions can make a file easier to use, but enlarging an image cannot recreate detail that was not present in the source. Large upscales can look softer.' },
      { question: 'Are my images uploaded to a server?', answer: 'The resize workflow decodes, previews, processes and encodes supported images in the browser. Source images are not sent to an image-resize API.' },
    ],
    relatedIds: ['compress-image', 'crop-image', 'rotate-flip-image', 'remove-image-metadata'],
  },
  'compress-image': {
    howToHeading: 'How to compress images without changing their dimensions.',
    howToIntro: 'Compression re-encodes the visible image. Choose an output format and quality level, compare the preview, then process locally.',
    steps: [
      { title: 'Add your images', text: 'Choose JPG, PNG or WebP files. The original source files stay available on your device.' },
      { title: 'Choose the output format', text: 'Use WebP or JPG for quality-controlled lossy compression, Same as source to keep the source family, or PNG when lossless output is required.' },
      { title: 'Adjust quality', text: 'Lower JPEG or WebP quality to target a smaller file. PNG remains lossless, so the quality slider does not reduce PNG quality.' },
      { title: 'Process and download', text: 'Run the batch in the browser and download a single compressed image or a ZIP when several results complete.' },
    ],
    useCasesHeading: 'Reduce image file size for websites, uploads and storage.',
    useCasesIntro: 'Compression is most useful when pixel dimensions are already correct and the goal is to reduce transfer or storage size.',
    useCases: [
      'Create lighter website images without resizing the canvas.',
      'Convert suitable photos to WebP for smaller delivery files.',
      'Use different quality levels for a few important images with individual overrides.',
      'Keep PNG output lossless when transparency or pixel fidelity matters more than size.',
    ],
    faq: [
      { question: 'Does image compression change the dimensions?', answer: 'This tool keeps the decoded image dimensions unchanged. It changes the encoding format and/or quality settings used for the new output file.' },
      { question: 'Which format usually compresses photos well?', answer: 'JPEG and WebP are usually better suited to quality-controlled photo compression. The best choice depends on compatibility, transparency needs and the visual content.' },
      { question: 'Why does PNG quality not change the file the same way?', answer: 'PNG output is lossless in this workflow. Its file size depends on the image content and PNG encoding rather than a lossy quality setting.' },
      { question: 'Can I use different compression settings in one batch?', answer: 'Yes. Start with shared settings, then switch to Edit individually for files that need a different format or quality.' },
    ],
    relatedIds: ['resize-image', 'remove-image-metadata', 'crop-image', 'bulk-rename-images'],
  },
  'rotate-flip-image': {
    howToHeading: 'How to rotate or flip images online.',
    howToIntro: 'Correct orientation or mirror images with a shared batch setup, then override individual files when the batch contains mixed directions.',
    steps: [
      { title: 'Add one image or a batch', text: 'Choose supported JPG, PNG or WebP images and select the file you want to preview.' },
      { title: 'Choose a rotation', text: 'Rotate 90, 180 or 270 degrees clockwise. A 90 or 270 degree turn swaps the output width and height.' },
      { title: 'Flip horizontally or vertically', text: 'Mirror across the vertical or horizontal axis, or combine a flip with rotation when that matches the intended orientation.' },
      { title: 'Preview and export', text: 'Review the active image, process locally, then download the completed file or ZIP.' },
    ],
    useCasesHeading: 'Fix camera orientation, mirrored graphics and repeated batch rotations.',
    useCasesIntro: 'Rotation and flipping are deterministic pixel transforms, making them useful when you know exactly how each image should be reoriented.',
    useCases: [
      'Turn sideways photos into portrait or landscape orientation.',
      'Mirror diagrams, scans or design assets horizontally.',
      'Correct a batch that all needs the same 90-degree turn.',
      'Use per-image overrides when a folder contains mixed orientations.',
    ],
    faq: [
      { question: 'Can I rotate several images at once?', answer: 'Yes. Apply one rotation or flip to the whole batch, or use individual mode when only selected images need a different orientation.' },
      { question: 'Does rotating 90 degrees change image dimensions?', answer: 'The pixel count stays related to the original image, but width and height swap when rotating by 90 or 270 degrees.' },
      { question: 'Can I rotate and flip at the same time?', answer: 'Yes. Rotation and horizontal or vertical flipping can be combined before processing.' },
      { question: 'Will metadata stay exactly the same?', answer: 'The visible pixels are decoded and re-encoded for output, so metadata and file size can change even when the visual transform is simple.' },
    ],
    relatedIds: ['crop-image', 'resize-image', 'compress-image', 'remove-image-metadata'],
  },
  'crop-image': {
    howToHeading: 'How to crop images online by shape or aspect ratio.',
    howToIntro: 'Choose Rectangle, Square, Circle or Triangle, drag the crop directly on the active image, resize it from a corner, and use a shared or per-image setup for the batch.',
    steps: [
      { title: 'Add images and choose a crop shape', text: 'Choose JPG, PNG or WebP images, then start with Rectangle, Square, Circle or Triangle depending on the result you want.' },
      { title: 'Choose an aspect ratio when needed', text: 'Use Free for unrestricted framing, Original to preserve the source ratio, or select 1:1, 4:3, 3:2, 16:9 or 9:16 for a common layout.' },
      { title: 'Drag the crop and resize from a corner', text: 'Move the highlighted crop directly on the image, then pull any corner to resize it. Fine-tune X, Y, width and height percentages only when you need exact values.' },
      { title: 'Preview, batch crop and download', text: 'Review the live preview, apply the crop to similar compositions or customize individual images, then process locally. Circle and Triangle crops use PNG or WebP output so the outside area can remain transparent.' },
    ],
    useCasesHeading: 'Crop images into rectangles, squares, circles or triangles for common layouts.',
    useCasesIntro: 'Direct drag makes visual framing fast, while aspect presets and normalized coordinates help reuse the same crop across similar images in a batch.',
    useCases: [
      'Crop a photo into a circle for avatar-style graphics while keeping the outside area transparent.',
      'Create square 1:1 crops for cards, thumbnails, profile graphics or product images.',
      'Prepare 16:9 landscape or 9:16 vertical crops for web and social layouts.',
      'Use Rectangle or Triangle shapes for custom framing, then adjust exceptions individually when compositions differ.',
    ],
    faq: [
      { question: 'Can I crop an image into a circle?', answer: 'Yes. Choose Circle, drag and resize the crop on the image, then process it. The outside area stays transparent, so the result uses PNG or WebP output rather than a format that would lose that transparency.' },
      { question: 'Can I crop by dragging directly on the image?', answer: 'Yes. Drag inside the highlighted crop to move it and pull any corner to resize it. The live preview updates automatically while you adjust the framing.' },
      { question: 'Can I crop images to 1:1, 16:9 or 9:16?', answer: 'Yes. The crop tool includes Free, Original, 1:1, 4:3, 3:2, 16:9 and 9:16 aspect presets.' },
      { question: 'What happens with Circle or Triangle crops?', answer: 'Pixels outside the selected Circle or Triangle are transparent. The workflow therefore uses PNG or WebP output for those shapes so the transparent area can be preserved.' },
      { question: 'Can I crop multiple images at once?', answer: 'Yes. Use Apply to all when the images have similar composition, or switch to Edit individually when subject position or framing needs to differ between files.' },
      { question: 'Does cropping upload the image?', answer: 'No image-processing API upload is required. Supported images are decoded, previewed, cropped and encoded locally in the browser.' },
    ],
    relatedIds: ['resize-image', 'rotate-flip-image', 'blur-image', 'compress-image'],
  },
  'blur-image': {
    howToHeading: 'How to blur an image or part of an image online.',
    howToIntro: 'Blur the whole image or switch to Selected area, choose Rectangle or Circle, drag the selection directly on the image, resize it from a corner and preview the effect before processing.',
    steps: [
      { title: 'Choose Whole image or Selected area', text: 'Use Whole image for an all-over blur. Choose Selected area when you only want to blur one part of the image.' },
      { title: 'Choose Rectangle or Circle', text: 'Selected-area mode supports a rectangular or circular blur selection so the highlighted area can better match the part of the image you want to soften.' },
      { title: 'Drag and resize the selected area', text: 'Move the highlighted blur area directly on the image and pull a corner to resize it. Fine-tune X, Y, width and height percentages only when exact placement is useful.' },
      { title: 'Adjust strength, preview and process', text: 'Change the blur strength and watch the live preview update. Apply the setup across similar images or use individual overrides, then process locally and download the results.' },
    ],
    useCasesHeading: 'Blur a whole image, rectangle or circle for backgrounds and selected details.',
    useCasesIntro: 'Direct drag makes selected-area blur easier to position visually. The selection remains manual and does not automatically detect faces, text, license plates or other sensitive content.',
    useCases: [
      'Soften a full image for a background, banner or design layer.',
      'Blur a rectangular section of a screenshot, document preview or repeated layout.',
      'Use a circular blur area when the detail you want to soften fits a rounder selection.',
      'Reuse one selected area across similarly framed images, then customize exceptions individually.',
    ],
    faq: [
      { question: 'Can I blur only part of an image?', answer: 'Yes. Choose Selected area, select Rectangle or Circle, then drag the highlighted area directly on the image and resize it from a corner.' },
      { question: 'Can I make a circular blur area?', answer: 'Yes. Selected-area mode includes Circle as well as Rectangle. Choose Circle and position or resize it directly on the preview.' },
      { question: 'Can the tool automatically find faces, text or license plates?', answer: 'No. Rectangle and Circle are manual selections. The tool does not automatically detect faces, text, license plates or other sensitive content.' },
      { question: 'Is blur guaranteed to permanently hide sensitive information?', answer: 'Do not assume a visual blur is sufficient for every privacy or security requirement. Review the exported pixels and use an appropriate redaction workflow when information must be irrecoverable.' },
      { question: 'Can I use one blur area across a batch?', answer: 'Yes, when the target area appears in a similar relative position. Use Apply to all for the shared setup and individual overrides for exceptions.' },
      { question: 'Are source images uploaded for blurring?', answer: 'No image-processing API upload is required. Supported images are decoded, previewed, blurred and encoded locally in the browser.' },
    ],
    relatedIds: ['crop-image', 'resize-image', 'remove-image-metadata', 'compress-image'],
  },
  'remove-image-metadata': {
    howToHeading: 'How to remove EXIF, GPS and software metadata from images.',
    howToIntro: 'The browser decodes the visible pixels and creates a new image without copying source metadata fields into the output.',
    steps: [
      { title: 'Add supported images', text: 'Choose JPG, PNG or WebP files. The tool reads the visible image for re-encoding rather than editing metadata fields in place.' },
      { title: 'Choose the clean output format', text: 'Keep the source image family or create JPG, WebP or PNG output. Quality applies to lossy JPEG and WebP output.' },
      { title: 'Create a clean pixel copy', text: 'Processing draws the decoded pixels into a new browser canvas and encodes a new file without intentionally copying EXIF, GPS or software tags.' },
      { title: 'Download and verify when metadata matters', text: 'Download the clean copy or ZIP. For sensitive workflows, inspect the final file with a trusted metadata viewer before sharing.' },
    ],
    useCasesHeading: 'Remove common camera and location metadata before sharing image copies.',
    useCasesIntro: 'This workflow targets file metadata. It cannot remove information that is visibly printed, photographed or otherwise embedded in the image pixels.',
    useCases: [
      'Create sharing copies without common EXIF camera fields.',
      'Strip embedded GPS metadata from supported image outputs.',
      'Remove software/editor tags that are not copied during browser re-encoding.',
      'Choose a new output format while creating the metadata-clean copy.',
    ],
    faq: [
      { question: 'Does this remove GPS metadata?', answer: 'The tool creates a new encoded image from visible pixels and does not copy source EXIF, GPS or software metadata fields into that output.' },
      { question: 'Does it remove text or location information visible in the picture?', answer: 'No. Information that is visibly embedded in the pixels—such as a photographed sign, timestamp overlay or printed address—remains part of the image.' },
      { question: 'Does Same as source preserve the original metadata?', answer: 'No. Same as source refers to the output image format family. The image is still decoded and re-encoded as a new file rather than returning the original bytes.' },
      { question: 'Should I verify the result before sharing sensitive files?', answer: 'Yes. When metadata removal is security- or privacy-critical, independently inspect the downloaded result with a metadata viewer before distribution.' },
    ],
    relatedIds: ['compress-image', 'bulk-rename-images', 'resize-image', 'crop-image'],
  },
  'bulk-rename-images': {
    howToHeading: 'How to bulk rename image files with a pattern.',
    howToIntro: 'Build filenames from reusable tokens, preview the entire batch, customize exceptions when needed, and download the original image bytes under their new names.',
    steps: [
      { title: 'Add the images to rename', text: 'Choose up to the batch limit. The tool does not need to decode or re-encode the image just to change the filename.' },
      { title: 'Build a shared pattern', text: 'Use {name}, {number} and {ext}, then choose a starting number and number padding such as 001, 002 and 003.' },
      { title: 'Review generated filenames', text: 'The queue shows the resulting names. Switch to individual mode if a particular image needs a custom filename.' },
      { title: 'Prepare and download', text: 'The original extension and bytes stay unchanged. Multiple renamed files are packaged into a ZIP for download.' },
    ],
    useCasesHeading: 'Organize screenshots, product photos and content batches without re-encoding.',
    useCasesIntro: 'Bulk Rename is a filename operation, so it is useful before or after editing when you want consistent file naming without changing image contents.',
    useCases: [
      'Rename a folder to image-001, image-002 and similar numbered names.',
      'Keep part of each original filename with the {name} token.',
      'Create predictable filenames before uploading a content batch.',
      'Override a few filenames individually while keeping the shared pattern for the rest.',
    ],
    faq: [
      { question: 'Does Bulk Rename change image quality?', answer: 'No. Renaming does not decode or re-encode the image. The downloaded file keeps the original image bytes.' },
      { question: 'Can I accidentally rename a PNG as JPG?', answer: 'The tool preserves the original source extension so the filename continues to match the actual image bytes. Typing another supported image extension in a custom name does not convert the file.' },
      { question: 'What filename tokens are supported?', answer: 'The current pattern supports {name} for the original filename stem, {number} for the generated sequence and {ext} for the source extension.' },
      { question: 'What happens if two generated names are the same?', answer: 'Duplicate generated names are made unique automatically so the prepared batch does not contain conflicting filenames.' },
    ],
    relatedIds: ['remove-image-metadata', 'resize-image', 'compress-image', 'crop-image'],
  },
};