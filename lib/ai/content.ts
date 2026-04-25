import { ContentType, Visibility, type ContentItem } from '@/lib/generated/prisma/client';

export function canReadContent(
  item: Pick<ContentItem, 'published' | 'visibility'>,
  includePrivate: boolean,
) {
  return includePrivate || (item.published && item.visibility !== Visibility.PRIVATE);
}

export function serializeContentItem(item: ContentItem) {
  return {
    id: item.id,
    type: item.type === ContentType.DOCS ? 'docs' : 'blog',
    slug: item.slug,
    title: item.title,
    description: item.description,
    sourcePath: item.sourcePath,
    sourceHash: item.sourceHash,
    visibility: item.visibility.toLowerCase(),
    published: item.published,
    publishedAt: item.publishedAt,
    syncedAt: item.syncedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function contentUrl(item: Pick<ContentItem, 'type' | 'slug'>) {
  return item.type === ContentType.DOCS ? `/docs/${item.slug}` : `/blog/${item.slug}`;
}
