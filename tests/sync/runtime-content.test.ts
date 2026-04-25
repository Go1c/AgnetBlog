import { describe, expect, it, vi } from 'vitest';

const { findManyMock, upsertMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  upsertMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    directoryPolicy: {
      findMany: findManyMock,
    },
  },
}));

vi.mock('@/lib/db/content-repository', () => ({
  upsertContentItem: upsertMock,
}));

import { ingestAndUpsertMarkdownFiles } from '@/lib/sync/sync-service';
import { ContentType, Visibility } from '@/lib/generated/prisma/client';

describe('runtime content sync', () => {
  it('stores markdown body and tags so public pages can render GitHub notes at runtime', async () => {
    findManyMock.mockResolvedValue([]);
    upsertMock.mockResolvedValue({});

    const result = await ingestAndUpsertMarkdownFiles([
      {
        path: 'content/blog/my-note.md',
        content: `---
title: 我的笔记
contentType: blog
visibility: public
published: true
tags:
  - GitHub
  - 笔记
---
# 我的笔记

这才是仓库里的正文。`,
        sourceHash: 'abc123',
      },
    ]);

    expect(result).toEqual([
      {
        path: 'content/blog/my-note.md',
        operation: 'upserted',
      },
    ]);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: ContentType.BLOG,
          slug: 'my-note',
          title: '我的笔记',
          visibility: Visibility.PUBLIC,
          body: '# 我的笔记\n\n这才是仓库里的正文。',
          tags: ['GitHub', '笔记'],
        }),
        update: expect.objectContaining({
          body: '# 我的笔记\n\n这才是仓库里的正文。',
          tags: ['GitHub', '笔记'],
        }),
      }),
    );
  });
});
