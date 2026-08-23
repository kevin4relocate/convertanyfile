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
    howToIntro: 'Compression re-encodes the visible image. Choose an output format and quality level, then compare the original and resulting file sizes after processing.',
    steps: [
      { title: 'Add your images', text: 'Choose JPG, PNG or WebP files. The original source files stay available on your device.' },
      { title: 'Choose the output format', text: 'Use WebP or JPG for quality-controlled lossy compression, Same as source to keep the source family, or PNG when lossless output is required.' },
      { title: 'Adjust quality', text: 'Lower JPEG or WebP quality to target a smaller file. PNG remains lossless, so the quality slider does not reduce PNG quality.' },
      { title: 'Process and compare file sizes', text: 'Run the batch in the browser. Each completed item shows its original and compressed size before you download one file or a ZIP.' },
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
    howToHeading: 'How to crop images visually with rectangle, square or circle shapes.',
    howToIntro: 'Choose a crop shape or aspect ratio, drag the crop box directly on the image, resize it from the corner handles, and use individual mode when compositions differ.',
    steps: [
      { title: 'Add images and choose the active image', text: 'Choose one image or a batch. Select the image you want to frame while the remaining files stay in the horizontal batch strip.' },
      { title: 'Choose Rectangle, Square, Circle or a ratio', text: 'Start with a free Rectangle, Square, Circle, Original ratio, 4:3, 3:2, 16:9 or 9:16 preset. Circle automatically uses a square crop boundary.' },
      { title: 'Drag and resize the crop box', text: 'Move the box directly over the subject and drag any corner handle to resize it. The live output preview updates as the crop changes.' },
      { title: 'Process the batch or refine exceptions', text: 'Use Apply to all when framing is similar. Switch to Edit individually for exceptions, then process and download the completed crops.' },
    ],
    useCasesHeading: 'Create rectangle, square, circular, landscape and vertical crops.',
    useCasesIntro: 'Direct manipulation makes visual framing the default workflow, while advanced percentage coordinates remain available for exact or repeatable batch positioning.',
    useCases: [
      'Create square crops for cards, thumbnails or profile-style layouts.',
      'Create circular PNG crops with transparent corners.',
      'Prepare 16:9 landscape or 9:16 vertical framing.',
      'Reuse a shared crop across similar images and override individual compositions when needed.',
    ],
    faq: [
      { question: 'Can I drag the crop area directly on the image?', answer: 'Yes. Drag inside the crop box to move it and drag any corner handle to resize the selected area.' },
      { question: 'Can I crop an image into a circle?', answer: 'Yes. Choose Circle. The crop is constrained to a square boundary and the result is exported as PNG so the area outside the circle remains transparent.' },
      { question: 'Can I still enter exact crop coordinates?', answer: 'Yes. Open Advanced coordinates to edit the X position, Y position, width, height and aspect ratio as normalized percentages.' },
      { question: 'Should I use Apply to all for mixed photos?', answer: 'Only when the subject placement is similar. If compositions differ, use Edit individually and review each important crop.' },
    ],
    relatedIds: ['resize-image', 'rotate-flip-image', 'blur-image', 'compress-image'],
  },
  'blur-image': {
    howToHeading: 'How to blur an image or a selected region.',
    howToIntro: 'Blur the whole image or define one rectangular region, preview the effect, then apply shared or per-image settings locally.',
    steps: [
      { title: 'Choose the blur area', text: 'Select Whole image for an all-over blur or Selected region when only one rectangular area should be blurred.' },
      { title: 'Set the blur strength', text: 'Increase the radius for a stronger blur. The active preview updates so you can judge the effect before batch processing.' },
      { title: 'Position a region when needed', text: 'Region mode uses percentage-based X, Y, width and height so the selection can be reused across similar layouts.' },
      { title: 'Process and review the output', text: 'Run the batch locally and inspect the result before relying on blur for any privacy-sensitive use.' },
    ],
    useCasesHeading: 'Use blur for visual emphasis, backgrounds and simple rectangular redaction.',
    useCasesIntro: 'The region tool is manual. It does not detect faces, license plates, text or sensitive information automatically.',
    useCases: [
      'Soften a full image for a background or design layer.',
      'Blur a repeated rectangular area in similarly framed screenshots.',
      'Reduce detail behind overlaid text or UI elements.',
      'Customize region placement per image when layouts differ.',
    ],
    faq: [
      { question: 'Can the tool automatically find faces or license plates?', answer: 'No. Region blur is a manual rectangle. The tool does not automatically detect faces, plates, text or other sensitive content.' },
      { question: 'Can I blur only part of an image?', answer: 'Yes. Choose Selected region and set its X position, Y position, width and height as percentages of the source image.' },
      { question: 'Is blur guaranteed to permanently hide sensitive information?', answer: 'Do not assume a visual blur is sufficient for every privacy or security requirement. Review the exported pixels and use an appropriate redaction workflow when information must be irrecoverable.' },
      { question: 'Can I use one blur region across a batch?', answer: 'Yes, when the area appears in a similar relative position. Use individual overrides for exceptions.' },
    ],
    relatedIds: ['crop-image', 'resize-image', 'remove-object', 'remove-image-metadata'],
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
  'remove-object': {
    howToHeading: 'How to remove a small object with a manual repair mask.',
    howToIntro: 'Keep the mask tight, use nearby image detail as repair context, and review the result closely when the object crosses complex edges or unique features.',
    steps: [
      { title: 'Add an image and choose a mask shape', text: 'Start with Rectangle, Circle, Square, Diamond or 4-Point Star based on the footprint of the unwanted object.' },
      { title: 'Position the mask precisely', text: 'Move, resize and rotate the selection. Zoom and pan when the object is small or sits close to an image edge.' },
      { title: 'Adjust padding and feather', text: 'Padding expands the repair area around the shape. Feather softens the transition around the repaired boundary.' },
      { title: 'Run repair and inspect the preview', text: 'The local repair estimates selected pixels from nearby unmasked context. Review fine detail before downloading.' },
    ],
    useCasesHeading: 'Best for small distractions over simple or repeated backgrounds.',
    useCasesIntro: 'Manual local repair is intentionally conservative. Large object removal and complex scenes are more likely to produce visible artifacts.',
    useCases: [
      'Remove a small spot, icon or isolated distraction.',
      'Repair a repeated corner element across similarly framed images.',
      'Clean small objects from sky, wall, table or other smooth backgrounds.',
      'Use individual masks when object position changes across a batch.',
    ],
    faq: [
      { question: 'Is Remove Object an AI generative fill tool?', answer: 'No. The current repair engine is a local visible-pixel reconstruction workflow based on nearby image context, not a cloud generative-fill service.' },
      { question: 'What kinds of objects are easiest to remove?', answer: 'Small objects over smooth, repeated or low-detail backgrounds are usually easier. Large selections crossing faces, text, hair or unique edges can leave artifacts.' },
      { question: 'Can I use one mask on several images?', answer: 'Yes, when the unwanted object appears at a similar relative position and size. Switch to individual mode for exceptions.' },
      { question: 'What do padding and feather do?', answer: 'Padding expands the selected repair region beyond the drawn shape. Feather softens the transition between repaired and surrounding pixels.' },
    ],
    relatedIds: ['remove-watermark', 'blur-image', 'remove-background', 'crop-image'],
  },
  'remove-background': {
    howToHeading: 'How to remove an image background with local AI.',
    howToIntro: 'The segmentation model runs in the browser, creates a reusable foreground mask, and lets you refine the cutout before exporting a transparent or solid-background PNG.',
    steps: [
      { title: 'Add a photo with a clear subject', text: 'Choose JPG, PNG or WebP. Images with a distinct foreground subject and contrasting background usually give the segmentation model the clearest signal.' },
      { title: 'Wait for local model inference', text: 'On first use, the browser loads the self-hosted model/runtime from ConvertAnyFile. The source image itself is not sent to an external inference API.' },
      { title: 'Refine cutout level and feather', text: 'Adjust the threshold and edge softness. These refinements reuse the cached segmentation mask instead of rerunning the model for every slider change.' },
      { title: 'Choose a background and export PNG', text: 'Keep transparency or choose white, black or a custom solid color, then process and download the PNG result.' },
    ],
    useCasesHeading: 'Create product, profile and design cutouts without a cloud inference upload.',
    useCasesIntro: 'Automatic segmentation is useful for clear subjects, but detailed boundaries still need visual review.',
    useCases: [
      'Create transparent subject cutouts for design layouts.',
      'Replace a simple background with white, black or a custom solid color.',
      'Process a batch that can share one cutout threshold and feather setting.',
      'Use per-image refinement when hair, shadows or contrast vary between photos.',
    ],
    faq: [
      { question: 'Does Remove Background upload my image to an AI API?', answer: 'The source image is processed by a self-hosted ONNX model running in the browser. The runtime/model files are downloaded from ConvertAnyFile, but the source image is not sent to an external inference service.' },
      { question: 'Why does the first background removal take longer?', answer: 'The first use needs to load the local AI runtime and segmentation model. Browser caching can make later uses faster on the same device.' },
      { question: 'Why do hair or transparent edges look imperfect?', answer: 'Compact segmentation models can struggle with fine hair, fur, glass, shadows, semi-transparent materials and low-contrast boundaries. Adjust the cutout level and feather, then inspect the preview.' },
      { question: 'What format does the tool export?', answer: 'Background removal exports PNG so transparent and soft alpha edges can be preserved. Solid replacement backgrounds are also exported as PNG.' },
    ],
    relatedIds: ['remove-object', 'crop-image', 'resize-image', 'compress-image'],
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
