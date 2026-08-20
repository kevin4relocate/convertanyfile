import type { ConverterDefinition } from '../platform/converter/types';
import { DATA_INPUT_EXTENSIONS, normalizeDataExtension } from '../engines/data/formats';
import { IMAGE_INPUT_EXTENSIONS, normalizeImageExtension } from '../engines/image/formats';
import { ARCHIVE_INPUT_EXTENSIONS, normalizeArchiveExtension } from '../engines/archive/formats';
import { CONVERTERS as IMAGE_CONVERTERS } from './converters';
import { DATA_CONVERTERS } from './data-converters';
import { ARCHIVE_CONVERTERS } from './archive-converters';

export const ALL_CONVERTERS: readonly ConverterDefinition[] = [
  ...IMAGE_CONVERTERS,
  ...DATA_CONVERTERS,
  ...ARCHIVE_CONVERTERS,
];

export const ALL_PAIR_CONVERTERS = ALL_CONVERTERS.filter((converter) => converter.input && converter.output);

export function acceptedExtensionsForConverter(converter: ConverterDefinition): readonly string[] {
  if (converter.category === 'image') {
    if (!converter.input) return IMAGE_INPUT_EXTENSIONS;
    const input = normalizeImageExtension(converter.input);
    return IMAGE_INPUT_EXTENSIONS.filter((extension) => normalizeImageExtension(extension) === input);
  }
  if (converter.category === 'data') {
    if (!converter.input) return DATA_INPUT_EXTENSIONS;
    const input = normalizeDataExtension(converter.input);
    return DATA_INPUT_EXTENSIONS.filter((extension) => normalizeDataExtension(extension) === input);
  }
  if (converter.category === 'archive') {
    if (!converter.input) return ARCHIVE_INPUT_EXTENSIONS;
    const input = normalizeArchiveExtension(converter.input);
    return ARCHIVE_INPUT_EXTENSIONS.filter((extension) => normalizeArchiveExtension(extension) === input);
  }
  return [];
}

export function getAnyConverter(slug: string): ConverterDefinition | undefined {
  return ALL_CONVERTERS.find((converter) => converter.slug === slug);
}
