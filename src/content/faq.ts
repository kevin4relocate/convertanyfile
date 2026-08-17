export const GENERAL_FAQ = [
  {
    question: 'Are my files uploaded to a conversion server?',
    answer: 'For the local converters currently available on ConvertAnyFile, supported files are processed in your browser. The image converter does not require an image upload step.',
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
    answer: 'Local conversion uses the memory and CPU of your device. Batch limits reduce the chance that an unusually large file or batch makes the browser tab unstable.',
  },
  {
    question: 'What happens if one file fails?',
    answer: 'A failed file does not stop the rest of the batch. You can retry failed files while keeping successful results.',
  },
  {
    question: 'Will ConvertAnyFile support more than images?',
    answer: 'The platform is designed for multiple local converter engines. Additional categories will only be added when they can provide a reliable browser-first workflow without pretending unsupported formats work.',
  },
] as const;

export const IMAGE_FAQ = [
  {
    question: 'Which image formats can I add?',
    answer: 'The converter recognizes common formats such as JPG, PNG, WebP, HEIC, AVIF, GIF, TIFF, BMP, ICO and additional image or camera formats. Runtime codec support is verified before conversion.',
  },
  {
    question: 'Does converting JPG to PNG restore lost detail?',
    answer: 'No. Changing the container format cannot restore image detail already lost through earlier JPEG compression.',
  },
  {
    question: 'How many images can I convert in one batch?',
    answer: 'The initial safety policy allows up to 50 files, up to 75 MB per file, and up to 300 MB total input per batch.',
  },
  {
    question: 'Can I cancel a large batch?',
    answer: 'Yes. Cancelling stops the active conversion worker. Files that already finished remain available, and remaining files can be resumed later.',
  },
] as const;
