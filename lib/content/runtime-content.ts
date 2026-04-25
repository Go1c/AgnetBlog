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
  return item.type === ContentType.DOCS ? `/docs/${item.slug}` : `/blog/${item.slug}`;
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
