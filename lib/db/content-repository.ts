import { Visibility } from '@/lib/generated/prisma/client';
import type { ContentType, Prisma } from '@/lib/generated/prisma/client';

import { db } from '@/lib/db';

export function findContentItemById(id: string) {
  return db.contentItem.findUnique({
    where: { id },
    include: { assets: true, docsNavNodes: true },
  });
}

export function findContentItemBySourcePath(sourcePath: string) {
  return db.contentItem.findUnique({
    where: { sourcePath },
    include: { assets: true, docsNavNodes: true },
  });
}

export function findContentItemByTypeAndSlug(
  type: ContentType,
  slug: string,
) {
  return db.contentItem.findUnique({
    where: { type_slug: { type, slug } },
    include: { assets: true, docsNavNodes: true },
  });
}

export function findReadableContentItemByTypeAndSlug(
  type: ContentType,
  slug: string,
) {
  return db.contentItem.findFirst({
    where: {
      type,
      slug,
      published: true,
      visibility: {
        not: Visibility.PRIVATE,
      },
    },
    include: { assets: true, docsNavNodes: true },
  });
}

export function listContentItems(args?: Prisma.ContentItemFindManyArgs) {
  return db.contentItem.findMany(args);
}

export function listPublicContentItems(type?: ContentType) {
  return db.contentItem.findMany({
    where: {
      ...(type ? { type } : {}),
      published: true,
      visibility: Visibility.PUBLIC,
    },
    orderBy: [{ publishedAt: 'desc' }, { syncedAt: 'desc' }, { updatedAt: 'desc' }],
  });
}

export function upsertContentItem(args: Prisma.ContentItemUpsertArgs) {
  return db.contentItem.upsert(args);
}

export function deleteContentItem(id: string) {
  return db.contentItem.delete({ where: { id } });
}

export function replaceContentAssets(
  contentItemId: string,
  assets: Prisma.ContentAssetCreateManyInput[],
) {
  return db.$transaction([
    db.contentAsset.deleteMany({ where: { contentItemId } }),
    db.contentAsset.createMany({ data: assets }),
  ]);
}

export function replaceAllDocsNavNodes(nodes: Prisma.DocsNavNodeCreateManyInput[]) {
  return db.$transaction([
    db.docsNavNode.deleteMany(),
    db.docsNavNode.createMany({ data: nodes }),
  ]);
}
