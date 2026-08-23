import { SITE } from '../config/site';
import type { ImageToolDefinition } from '../platform/image-tools/types';

export function imageToolSchemas(
  tool: ImageToolDefinition,
  featureList: readonly string[],
  applicationCategory = 'MultimediaApplication',
): Array<Record<string, unknown>> {
  const url = `${SITE.origin}/${tool.slug}/`;
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: `ConvertAnyFile ${tool.displayName}`,
      url,
      description: tool.description,
      applicationCategory,
      operatingSystem: 'Any',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      featureList,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Image Tools', item: `${SITE.origin}/image-tools/` },
        { '@type': 'ListItem', position: 3, name: tool.displayName, item: url },
      ],
    },
  ];
}
