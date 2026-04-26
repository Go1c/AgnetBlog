import {
  ContentType,
  ShareAccessMode,
  ShareNavigationScope,
  Visibility,
  type ContentItem,
  type ContentShare,
} from '@/lib/generated/prisma/client';

type CommentableContent = Pick<
  ContentItem,
  'id' | 'type' | 'published' | 'visibility'
>;

type ShareForCommentAccess = Pick<
  ContentShare,
  'accessMode' | 'contentItemId' | 'navigationScope' | 'revokedAt'
> & {
  contentItem: Pick<ContentItem, 'type'>;
};

export function isPubliclyCommentableContent(content: CommentableContent) {
  return content.published && content.visibility !== Visibility.PRIVATE;
}

export function canShareAccessCommentTarget({
  content,
  hasPasswordAccess,
  share,
}: {
  content: CommentableContent;
  hasPasswordAccess: boolean;
  share: ShareForCommentAccess;
}) {
  if (share.revokedAt) {
    return false;
  }

  if (share.accessMode === ShareAccessMode.PASSWORD && !hasPasswordAccess) {
    return false;
  }

  if (content.id === share.contentItemId) {
    return true;
  }

  if (
    share.navigationScope !== ShareNavigationScope.NAVIGABLE ||
    share.contentItem.type !== ContentType.DOCS ||
    content.type !== ContentType.DOCS
  ) {
    return false;
  }

  return isPubliclyCommentableContent(content);
}
