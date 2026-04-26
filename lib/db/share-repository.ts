import { db } from '@/lib/db';
import {
  ContentType,
  ShareAccessMode,
  ShareNavigationScope,
  Visibility,
  type ContentShare,
  type Prisma,
} from '@/lib/generated/prisma/client';

export { ShareAccessMode, ShareNavigationScope };

export type ShareAccessModeValue = ShareAccessMode;
export type ShareNavigationScopeValue = ShareNavigationScope;
export type ContentShareWithContent = Prisma.ContentShareGetPayload<{
  include: { contentItem: true };
}>;

export function createContentShare(input: {
  contentItemId: string;
  token: string;
  accessMode: ShareAccessModeValue;
  navigationScope: ShareNavigationScopeValue;
  passwordHash: string | null;
  createdByLogin?: string | null;
}) {
  return db.contentShare.create({
    data: {
      ...input,
      passwordSalt: null,
    },
    include: { contentItem: true },
  });
}

export function listContentShares(contentItemId: string) {
  return db.contentShare.findMany({
    where: { contentItemId },
    include: { contentItem: true },
    orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
  });
}

export function findActiveShareByToken(token: string) {
  return db.contentShare.findUnique({
    where: { token },
    include: { contentItem: true },
  });
}

export async function findUsableShareByToken(token: string) {
  const share = await findActiveShareByToken(token);

  if (!share || share.revokedAt) {
    return null;
  }

  return share;
}

export function revokeContentShare(id: string) {
  return db.contentShare.update({
    where: { id },
    data: { revokedAt: new Date() },
    include: { contentItem: true },
  });
}

export function findPublishedDocsContentBySlug(slug: string) {
  return db.contentItem.findFirst({
    where: {
      type: ContentType.DOCS,
      slug,
      published: true,
      visibility: {
        not: Visibility.PRIVATE,
      },
    },
    include: { assets: true, docsNavNodes: true },
  });
}

export function listPublishedDocsContent() {
  return db.contentItem.findMany({
    where: {
      type: ContentType.DOCS,
      published: true,
      visibility: {
        not: Visibility.PRIVATE,
      },
    },
    orderBy: [{ slug: 'asc' }],
  });
}

export type { ContentShare };
