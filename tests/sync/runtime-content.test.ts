import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { ingestAndUpsertMarkdownFiles, isMarkdownPath } from '@/lib/sync/sync-service';
import { ContentType, Visibility } from '@/lib/generated/prisma/client';

describe('runtime content sync', () => {
  beforeEach(() => {
    findManyMock.mockReset();
    upsertMock.mockReset();
  });

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

  it('syncs ordinary markdown notes outside content roots as private blog content', async () => {
    findManyMock.mockResolvedValue([]);
    upsertMock.mockResolvedValue({});

    const result = await ingestAndUpsertMarkdownFiles([
      {
        path: 'notes/我的笔记.md',
        content: '# 我的笔记\n\n普通笔记也要先进入后台。',
        sourceHash: 'root-note-sha',
      },
    ]);

    expect(result).toEqual([
      {
        path: 'notes/我的笔记.md',
        operation: 'upserted',
      },
    ]);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          type: ContentType.BLOG,
          slug: 'notes/我的笔记',
          title: '我的笔记',
          visibility: Visibility.PRIVATE,
          published: true,
          body: '# 我的笔记\n\n普通笔记也要先进入后台。',
          tags: [],
        }),
      }),
    );
  });

  it('recognizes markdown anywhere in the notes repository', () => {
    expect(isMarkdownPath('content/blog/post.md')).toBe(true);
    expect(isMarkdownPath('notes/post.mdx')).toBe(true);
    expect(isMarkdownPath('中文/我的笔记.md')).toBe(true);
    expect(isMarkdownPath('.github/workflows/deploy.md')).toBe(false);
    expect(isMarkdownPath('node_modules/package/readme.md')).toBe(false);
    expect(isMarkdownPath('image.png')).toBe(false);
  });
});
