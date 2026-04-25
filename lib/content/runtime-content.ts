import { ContentType, type ContentItem } from '@/lib/generated/prisma/client';

export type RuntimeContentItem = Pick<
  ContentItem,
  | 'type'
  | 'slug'
  | 'title'
  | 'description'
  | 'body'
  | 'tags'
  | 'publishedAt'
  | 'syncedAt'
  | 'updatedAt'
>;

export function runtimeContentUrl(item: Pick<RuntimeContentItem, 'type' | 'slug'>) {
  if (item.type === ContentType.DOCS && item.slug === 'index') {
    return '/docs';
  }

  const encodedSlug = encodeSlugPath(item.slug);

  return item.type === ContentType.DOCS ? `/docs/${encodedSlug}` : `/blog/${encodedSlug}`;
}

export function routeSlugSegmentsToContentSlug(segments: string[]) {
  return segments.map(decodeRouteSegment).join('/');
}

export function runtimeContentDate(
  item: Pick<RuntimeContentItem, 'publishedAt' | 'syncedAt' | 'updatedAt'>,
) {
  return item.publishedAt ?? item.syncedAt ?? item.updatedAt;
}

export function runtimeContentDescription(
  item: Pick<RuntimeContentItem, 'description' | 'body'>,
) {
  return item.description ?? excerptMarkdown(item.body ?? '');
}

export function excerptMarkdown(markdown: string, maxLength = 180) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/[*_`~>-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function encodeSlugPath(slug: string) {
  return slug
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function decodeRouteSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}
