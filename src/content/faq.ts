export const GENERAL_FAQ = [
  {
    question: 'Are my files uploaded to a conversion server?',
    answer: 'For the local converters currently available on ConvertAnyFile, supported files are processed in your browser. The live Image, Data, and Archive categories do not require a file upload step for conversion.',
  },
  {
    question: 'Do I need an account?',
    answer: 'No. The core browser converters are designed to work without registration, sign-in, or a cloud project.',
  },
  {
    question: 'Can I convert multiple files at once?',
    answer: 'Yes. Live converters use the shared batch workspace with per-file status, individual downloads, append-by-drag, and ZIP download for successful results.',
  },
  {
    question: 'Why are there batch limits?',
    answer: 'Local conversion uses the memory and CPU of your device. Each category defines limits that reduce the chance that unusually large files or oversized batches make the browser tab unstable.',
  },
  {
    question: 'What happens if one file fails?',
    answer: 'A failed file does not stop the rest of the batch. Retry is only offered for failures that may recover; deterministic invalid or unsupported files are not placed in a pointless retry loop.',
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
    question: 'Why can the first conversion take longer?',
    answer: 'Some categories load a browser or WebAssembly engine only when needed. First use can include engine startup and caching work; later conversions in the same environment may start faster.',
  },
  {
    question: 'Which converter categories are live?',
    answer: 'Images, structured Data, and Archives are live today. Archive supports ZIP, TAR, TAR.GZ/TGZ, GZIP/GZ, 7Z, and supported RAR4/RAR5 input, with ZIP, TAR, and TAR.GZ as certified public outputs.',
  },
  {
    question: 'Why not process every file type on a server?',
    answer: 'Server conversion can be useful for heavy or specialized workflows, but it adds upload time, temporary storage, cleanup, and infrastructure cost. ConvertAnyFile prefers browser-first processing when the user experience is dependable.',
  },
] as const;

export const IMAGE_FAQ = [
  {
    question: 'Which image formats can I add?',
    answer: 'The image engine recognizes 57 filename extensions across common raster, specialist, legacy, and camera RAW families. A file still has to pass signature validation and runtime decoder checks before it is treated as supported.',
  },
  {
    question: 'Which image formats can I convert to?',
    answer: 'The production output catalog contains 16 formats: JPG, PNG, WebP, AVIF, TIFF, GIF, BMP, ICO, JXL, JP2, HDR, EXR, PCX, TGA, QOI, and PNM. The browser only shows a format when the packaged ImageMagick runtime also reports that encoder as writable.',
  },
  {
    question: 'Why can I open HEIC but not choose HEIC as an output?',
    answer: 'Input and output capability are separate. The current packaged WASM runtime can expose HEIC/HEIF decoding for compatible source files, but its runtime writer scan does not expose a HEIC encoder. ConvertAnyFile therefore keeps HEIC as an input family and does not advertise HEIC output in this release.',
  },
  {
    question: 'How many images can I convert in one batch?',
    answer: 'The current safety policy allows up to 50 files, up to 75 MB per file, and up to 300 MB total input per batch. You can also drag or add more files after the initial batch as long as the limits are not exceeded.',
  },
  {
    question: 'Why do some outputs show a quality control?',
    answer: 'Lossy outputs such as JPG, WebP, AVIF, JXL, and JP2 can use an encoder quality setting. Formats without a comparable quality control do not show the slider.',
  },
  {
    question: 'Does converting JPG to PNG restore lost detail?',
    answer: 'No. Changing the container format cannot restore image detail already lost through earlier JPEG compression.',
  },
  {
    question: 'What happens to transparency when converting to an opaque format?',
    answer: 'Outputs without a useful alpha channel use a deterministic white background instead of leaving transparent pixels undefined. JPG is the most common example.',
  },
  {
    question: 'What happens to animated, multi-page, layered, or multi-size files?',
    answer: 'The current product creates one output image per input file. Animated GIF/WebP, multi-page TIFF, layered sources, and multi-size icon containers are therefore flattened to a single image representation. ICO inputs use the best available embedded icon frame when possible.',
  },
  {
    question: 'Can I convert HEIC photos to JPG?',
    answer: 'Yes when the runtime can decode the specific HEIC file. HEIC to JPG is useful for broader compatibility with upload forms, older software, and general sharing.',
  },
  {
    question: 'Can a RAW camera file fail even if its extension is recognized?',
    answer: 'Yes. RAW families vary by camera and decoder requirements. Recognition of the extension does not guarantee that the packaged browser runtime can decode every variant, so RAW remains a best-effort input path until more real-camera fixtures are certified.',
  },
  {
    question: 'Why can a small image file still use a lot of browser memory?',
    answer: 'Compressed file size and decoded pixel memory are different. A very high-resolution image can expand to hundreds of megabytes after decoding even when the source file is only a few megabytes on disk. The image engine rejects extreme dimensions or estimated decoded memory before conversion.',
  },
  {
    question: 'Can I download all successful images together?',
    answer: 'Yes. Successful batch results can be packaged into a ZIP while failed files remain isolated from the rest of the batch.',
  },
  {
    question: 'Does converting an image make it higher resolution?',
    answer: 'No. Format conversion changes encoding or container representation. It does not add genuine source detail or automatically increase useful resolution.',
  },
] as const;
