import type { ConverterDefinition } from '../platform/converter/types';
import { CONVERTERS as IMAGE_CONVERTERS } from './converters';
import { DATA_CONVERTERS } from './data-converters';

export const ALL_CONVERTERS: readonly ConverterDefinition[] = [
  ...IMAGE_CONVERTERS,
  ...DATA_CONVERTERS,
];

export const ALL_PAIR_CONVERTERS = ALL_CONVERTERS.filter((converter) => converter.input && converter.output);

export function getAnyConverter(slug: string): ConverterDefinition | undefined {
  return ALL_CONVERTERS.find((converter) => converter.slug === slug);
}
