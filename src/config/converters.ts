import { IMAGE_BATCH_POLICY } from '../platform/converter/batch-policy';
import type { ConverterDefinition } from '../platform/converter/types';

const imageBase = {
  engine: 'image' as const,
  category: 'image' as const,
  batchPolicy: IMAGE_BATCH_POLICY,
  quickOutputs: ['jpg', 'png', 'webp', 'avif'],
};

export const CONVERTERS: readonly ConverterDefinition[] = [
  {
    ...imageBase,
    slug: 'image-converter',
    title: 'Free Image Converter — Convert Images Privately | ConvertAnyFile',
    description: 'Convert JPG, PNG, WebP, HEIC, AVIF, TIFF and more directly in your browser. Batch conversion, ZIP download, no image upload required.',
    h1: 'Convert images fast. Keep them private.',
    eyebrow: 'Private image converter',
    intro: 'Drop supported image files, choose an output format, and convert locally in your browser.',
  },
  {
    ...imageBase,
    slug: 'heic-to-jpg', input: 'heic', output: 'jpg',
    title: 'HEIC to JPG Converter — Free & Private | ConvertAnyFile',
    description: 'Convert HEIC photos to JPG in your browser. Batch convert locally with no image upload required.',
    h1: 'Convert HEIC to JPG', eyebrow: 'HEIC → JPG',
    intro: 'Turn HEIC photos into widely compatible JPG files without sending the images to a conversion server.',
    related: ['heic-to-png', 'jpg-to-webp', 'png-to-jpg'],
  },
  {
    ...imageBase,
    slug: 'heic-to-png', input: 'heic', output: 'png',
    title: 'HEIC to PNG Converter — Free & Private | ConvertAnyFile',
    description: 'Convert HEIC photos to PNG locally in your browser. No image upload required.',
    h1: 'Convert HEIC to PNG', eyebrow: 'HEIC → PNG',
    intro: 'Convert HEIC files to PNG when you need a broadly supported lossless image format.',
    related: ['heic-to-jpg', 'png-to-webp', 'png-to-jpg'],
  },
  {
    ...imageBase,
    slug: 'webp-to-png', input: 'webp', output: 'png',
    title: 'WebP to PNG Converter — Free & Private | ConvertAnyFile',
    description: 'Convert WebP images to PNG directly in your browser. Batch convert and download as ZIP.',
    h1: 'Convert WebP to PNG', eyebrow: 'WebP → PNG',
    intro: 'Convert WebP to PNG for editing, transparency workflows, or software that expects PNG files.',
    related: ['webp-to-jpg', 'png-to-webp', 'jpg-to-webp'],
  },
  {
    ...imageBase,
    slug: 'webp-to-jpg', input: 'webp', output: 'jpg',
    title: 'WebP to JPG Converter — Free & Private | ConvertAnyFile',
    description: 'Convert WebP images to JPG locally in your browser with batch conversion and ZIP download.',
    h1: 'Convert WebP to JPG', eyebrow: 'WebP → JPG',
    intro: 'Convert WebP images to JPG for broad compatibility with upload forms, editors, and older workflows.',
    related: ['webp-to-png', 'jpg-to-webp', 'png-to-jpg'],
  },
  {
    ...imageBase,
    slug: 'png-to-webp', input: 'png', output: 'webp',
    title: 'PNG to WebP Converter — Free & Private | ConvertAnyFile',
    description: 'Convert PNG images to WebP directly in your browser. Adjust quality, batch convert, and download locally.',
    h1: 'Convert PNG to WebP', eyebrow: 'PNG → WebP',
    intro: 'Create WebP versions of PNG images for modern web delivery while keeping the original files unchanged.',
    related: ['jpg-to-webp', 'webp-to-png', 'png-to-jpg'],
  },
  {
    ...imageBase,
    slug: 'jpg-to-webp', input: 'jpg', output: 'webp',
    title: 'JPG to WebP Converter — Free & Private | ConvertAnyFile',
    description: 'Convert JPG images to WebP in your browser. Batch convert locally and control output quality.',
    h1: 'Convert JPG to WebP', eyebrow: 'JPG → WebP',
    intro: 'Create modern WebP versions of JPG photos without uploading your files to a remote conversion queue.',
    related: ['png-to-webp', 'webp-to-jpg', 'jpg-to-png'],
  },
  {
    ...imageBase,
    slug: 'png-to-jpg', input: 'png', output: 'jpg',
    title: 'PNG to JPG Converter — Free & Private | ConvertAnyFile',
    description: 'Convert PNG images to JPG locally in your browser. Batch convert with adjustable JPG quality.',
    h1: 'Convert PNG to JPG', eyebrow: 'PNG → JPG',
    intro: 'Convert PNG images to JPG when you need smaller photo-style files or broad upload compatibility.',
    related: ['jpg-to-png', 'png-to-webp', 'webp-to-jpg'],
  },
  {
    ...imageBase,
    slug: 'jpg-to-png', input: 'jpg', output: 'png',
    title: 'JPG to PNG Converter — Free & Private | ConvertAnyFile',
    description: 'Convert JPG images to PNG directly in your browser. No upload, account, or server conversion required.',
    h1: 'Convert JPG to PNG', eyebrow: 'JPG → PNG',
    intro: 'Convert JPG files to PNG for workflows that require PNG containers. Existing JPG compression loss cannot be restored.',
    related: ['png-to-jpg', 'jpg-to-webp', 'webp-to-png'],
  },
  {
    ...imageBase,
    slug: 'avif-to-jpg', input: 'avif', output: 'jpg',
    title: 'AVIF to JPG Converter — Free & Private | ConvertAnyFile',
    description: 'Convert AVIF images to JPG directly in your browser for broad compatibility.',
    h1: 'Convert AVIF to JPG', eyebrow: 'AVIF → JPG',
    intro: 'Turn AVIF images into JPG files that are easier to share with software and services that expect JPEG.',
    related: ['webp-to-jpg', 'png-to-jpg', 'jpg-to-webp'],
  },
  {
    ...imageBase,
    slug: 'tiff-to-jpg', input: 'tiff', output: 'jpg',
    title: 'TIFF to JPG Converter — Free & Private | ConvertAnyFile',
    description: 'Convert TIFF images to JPG in your browser. Batch conversion runs locally on your device.',
    h1: 'Convert TIFF to JPG', eyebrow: 'TIFF → JPG',
    intro: 'Create smaller, widely compatible JPG copies from supported TIFF images while keeping the originals unchanged.',
    related: ['png-to-jpg', 'webp-to-jpg', 'image-converter'],
  },
  {
    ...imageBase,
    slug: 'bmp-to-jpg', input: 'bmp', output: 'jpg',
    title: 'BMP to JPG Converter — Free & Private | ConvertAnyFile',
    description: 'Convert BMP images to JPG locally in your browser with batch support.',
    h1: 'Convert BMP to JPG', eyebrow: 'BMP → JPG',
    intro: 'Convert large BMP files into more practical JPG copies for sharing and everyday use.',
    related: ['png-to-jpg', 'webp-to-jpg', 'image-converter'],
  },
] as const;

export function getConverter(slug: string): ConverterDefinition | undefined {
  return CONVERTERS.find((converter) => converter.slug === slug);
}

export const PAIR_CONVERTERS = CONVERTERS.filter((converter) => converter.input && converter.output);
