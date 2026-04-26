import { CommentStatus } from '@/lib/generated/prisma/client';
import type { Prisma } from '@/lib/generated/prisma/client';

import { db } from '@/lib/db';

export type CommentTarget =
  | {
      contentItemId: string;
      targetKey?: never;
    }
  | {
      contentItemId?: never;
      targetKey: string;
    };

export function listContentComments(
  target: CommentTarget,
  options: {
    includeDeleted?: boolean;
  } = {},
) {
  return db.contentComment.findMany({
    where: {
      ...target,
      ...(options.includeDeleted ? {} : { status: CommentStatus.ACTIVE }),
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
}

export function createContentComment(input: {
  contentItemId: string | null;
  targetKey: string | null;
  body: string;
  displayName: string | null;
}) {
  const data: Prisma.ContentCommentUncheckedCreateInput = {
    contentItemId: input.contentItemId,
    targetKey: input.targetKey,
    body: input.body,
    displayName: input.displayName,
    status: CommentStatus.ACTIVE,
  };

  return db.contentComment.create({ data });
}

export function softDeleteContentComment(input: {
  id: string;
  deletedByAdminLogin: string;
}) {
  return db.contentComment.update({
    where: {
      id: input.id,
    },
    data: {
      status: CommentStatus.DELETED,
      deletedAt: new Date(),
      deletedByAdminLogin: input.deletedByAdminLogin,
    },
  });
}
