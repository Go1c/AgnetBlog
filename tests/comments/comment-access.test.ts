import { describe, expect, it } from 'vitest';

import {
  canShareAccessCommentTarget,
  isPubliclyCommentableContent,
} from '@/lib/comments/access';
import {
  ContentType,
  ShareAccessMode,
  ShareNavigationScope,
  Visibility,
} from '@/lib/generated/prisma/client';

const publicDoc = {
  id: 'public-doc',
  type: ContentType.DOCS,
  published: true,
  visibility: Visibility.PUBLIC,
};

const privateDoc = {
  id: 'private-doc',
  type: ContentType.DOCS,
  published: true,
  visibility: Visibility.PRIVATE,
};

const draftDoc = {
  id: 'draft-doc',
  type: ContentType.DOCS,
  published: false,
  visibility: Visibility.PUBLIC,
};

const linkShare = {
  accessMode: ShareAccessMode.LINK,
  contentItemId: 'root-private-doc',
  navigationScope: ShareNavigationScope.CURRENT_ONLY,
  revokedAt: null,
  contentItem: {
    type: ContentType.DOCS,
  },
};

describe('comment access', () => {
  it('allows public published content and rejects private or draft content', () => {
    expect(isPubliclyCommentableContent(publicDoc)).toBe(true);
    expect(isPubliclyCommentableContent(privateDoc)).toBe(false);
    expect(isPubliclyCommentableContent(draftDoc)).toBe(false);
  });

  it('allows an active share to access its root content', () => {
    expect(
      canShareAccessCommentTarget({
        content: {
          id: 'root-private-doc',
          type: ContentType.DOCS,
          published: false,
          visibility: Visibility.PRIVATE,
        },
        hasPasswordAccess: false,
        share: linkShare,
      }),
    ).toBe(true);
  });

  it('requires an unlocked password share before comment access', () => {
    const passwordShare = {
      ...linkShare,
      accessMode: ShareAccessMode.PASSWORD,
    };

    expect(
      canShareAccessCommentTarget({
        content: {
          id: 'root-private-doc',
          type: ContentType.DOCS,
          published: true,
          visibility: Visibility.PRIVATE,
        },
        hasPasswordAccess: false,
        share: passwordShare,
      }),
    ).toBe(false);
    expect(
      canShareAccessCommentTarget({
        content: {
          id: 'root-private-doc',
          type: ContentType.DOCS,
          published: true,
          visibility: Visibility.PRIVATE,
        },
        hasPasswordAccess: true,
        share: passwordShare,
      }),
    ).toBe(true);
  });

  it('limits navigable shares to published non-private docs outside the root', () => {
    const navigableShare = {
      ...linkShare,
      navigationScope: ShareNavigationScope.NAVIGABLE,
    };

    expect(
      canShareAccessCommentTarget({
        content: publicDoc,
        hasPasswordAccess: false,
        share: navigableShare,
      }),
    ).toBe(true);
    expect(
      canShareAccessCommentTarget({
        content: privateDoc,
        hasPasswordAccess: false,
        share: navigableShare,
      }),
    ).toBe(false);
    expect(
      canShareAccessCommentTarget({
        content: draftDoc,
        hasPasswordAccess: false,
        share: navigableShare,
      }),
    ).toBe(false);
  });
});
