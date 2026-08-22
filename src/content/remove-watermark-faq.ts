export const REMOVE_WATERMARK_FAQ = [
  {
    question: 'Are my images uploaded to a server?',
    answer: 'No. The Preview decodes the image in your browser, analyzes a reduced preview locally, and repairs the selected full-resolution pixels in a browser worker. The source image is not sent to a conversion backend.',
  },
  {
    question: 'Does Auto Select always find the watermark?',
    answer: 'No. Auto Select is optimized for small visible marks near the bottom-right corner and is deliberately treated as a suggestion. Use Rectangle, Brush, and Eraser to correct the mask before processing when the suggested area is incomplete or overlaps important details.',
  },
  {
    question: 'Does this use AI?',
    answer: 'No. The first Preview uses deterministic browser-side image analysis and a local pixel-repair algorithm. It does not call an AI API, upload the image for inference, or require a GPU.',
  },
  {
    question: 'What images work best?',
    answer: 'Small corner logos over sky, walls, gradients, foliage, fabric, or other locally consistent backgrounds usually work better than marks covering faces, text, hair, architecture edges, or large unique objects.',
  },
  {
    question: 'Will the image keep the same resolution?',
    answer: 'Yes. The repair is applied at the decoded source resolution and the downloaded image keeps those pixel dimensions. JPEG and WebP are re-encoded, so file size and compression artifacts can change even when dimensions stay the same.',
  },
  {
    question: 'Which formats are supported?',
    answer: 'The Preview accepts JPG/JPEG, PNG, and WebP. It can download in the source format or export PNG, JPEG, or WebP when the browser supports that encoder.',
  },
  {
    question: 'What do Undo and Reset mask do?',
    answer: 'Undo removes the latest rectangle, brush, or eraser action. Reset mask clears all selection edits while keeping the current source image loaded.',
  },
  {
    question: 'Can this remove hidden provenance or invisible watermarks?',
    answer: 'No. This tool edits visible pixels inside the selected area. It does not claim to remove invisible provenance systems, metadata-based authenticity signals, or other information that is not represented by the visible selected pixels.',
  },
] as const;
