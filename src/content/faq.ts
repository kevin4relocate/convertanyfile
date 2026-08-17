export const GENERAL_FAQ = [
  {
    question: 'Are my files uploaded to a conversion server?',
    answer: 'For the local converters currently available on ConvertAnyFile, supported files are processed in your browser. The current image converter does not require an image upload step.',
  },
  {
    question: 'Do I need an account?',
    answer: 'No. The core browser converter is designed to work without registration, sign-in, or a cloud project.',
  },
  {
    question: 'Can I convert multiple files at once?',
    answer: 'Yes. The image converter supports batches, per-file status, individual downloads, and ZIP download for successful results.',
  },
  {
    question: 'Why are there batch limits?',
    answer: 'Local conversion uses the memory and CPU of your device. Batch limits reduce the chance that an unusually large file, high-resolution image, or oversized batch makes the browser tab unstable.',
  },
  {
    question: 'What happens if one file fails?',
    answer: 'A failed file does not stop the rest of the batch. You can retry that failed file while keeping successful results.',
  },
  {
    question: 'Can I cancel a conversion?',
    answer: 'Yes. Cancelling stops the active conversion worker. Results that already finished remain available, and unprocessed files can be converted later.',
  },
  {
    question: 'Does ConvertAnyFile change my original file?',
    answer: 'No. Conversion creates a new downloadable output. Your original local file is not overwritten by the website.',
  },
  {
    question: 'Why does the first conversion sometimes take longer?',
    answer: 'Some converters use WebAssembly engines that are loaded only when needed. The first use can include engine startup and browser caching work; later conversions in the same environment may start faster.',
  },
  {
    question: 'Will ConvertAnyFile support more than images?',
    answer: 'The platform is designed for multiple local converter engines. Additional categories will only be marked live when their browser workflow is reliable enough to test, explain, and protect with sensible limits.',
  },
  {
    question: 'Why not process every file type on a server?',
    answer: 'Server conversion can be useful for some heavy or specialized workflows, but it adds upload time, temporary storage, cleanup, and infrastructure cost. ConvertAnyFile prefers browser-first processing when the user experience is dependable.',
  },
] as const;

export const IMAGE_FAQ = [
  {
    question: 'Which image formats can I add?',
    answer: 'The converter recognizes common formats such as JPG, PNG, WebP, HEIC, AVIF, GIF, TIFF, BMP, ICO and additional image or camera formats. Runtime codec support is verified before conversion.',
  },
  {
    question: 'How many images can I convert in one batch?',
    answer: 'The current safety policy allows up to 50 files, up to 75 MB per file, and up to 300 MB total input per batch.',
  },
  {
    question: 'Why does JPG, WebP, or AVIF show a quality control?',
    answer: 'Lossy encoders expose a quality setting because output quality and file size can be traded against each other. Formats without a comparable quality control do not show the slider.',
  },
  {
    question: 'Does converting JPG to PNG restore lost detail?',
    answer: 'No. Changing the container format cannot restore image detail already lost through earlier JPEG compression.',
  },
  {
    question: 'What happens to PNG transparency when converting to JPG?',
    answer: 'JPG has no true alpha transparency channel. Transparent source pixels must be flattened or otherwise represented without alpha by the encoder workflow, so transparency should not be expected to survive as transparency.',
  },
  {
    question: 'Can I convert HEIC photos to JPG?',
    answer: 'Yes when the runtime can decode the specific HEIC file. HEIC to JPG is useful for broader compatibility with upload forms, older software, and general sharing.',
  },
  {
    question: 'Can a RAW camera file fail even if its extension is recognized?',
    answer: 'Yes. RAW families vary by camera and decoder requirements. Recognition of the extension does not guarantee that the packaged browser runtime can decode every variant.',
  },
  {
    question: 'Why can a small image file still use a lot of browser memory?',
    answer: 'Compressed file size and decoded pixel memory are different. A very high-resolution image can expand to hundreds of megabytes after decoding even when the source file is only a few megabytes on disk.',
  },
  {
    question: 'Can I download all successful images together?',
    answer: 'Yes. Successful batch results can be packaged into a ZIP while failed files remain available for retry.',
  },
  {
    question: 'Does converting an image make it higher resolution?',
    answer: 'No. Format conversion changes encoding or container representation. It does not add genuine source detail or automatically increase useful resolution.',
  },
] as const;
