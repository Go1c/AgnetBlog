import type { Root } from 'fumadocs-core/page-tree';
import { describe, expect, it } from 'vitest';

import { buildDocsPageTree } from '@/lib/content/docs-page-tree';
import { ContentType } from '@/lib/generated/prisma/client';

const staticTree = {
  type: 'root',
  name: '文档',
  children: [
    {
      type: 'page',
      name: '文档首页',
      url: '/docs',
    },
    {
      type: 'page',
      name: '平台结构',
      url: '/docs/platform',
    },
  ],
} satisfies Root;

describe('docs page tree', () => {
  it('adds public runtime docs to the Fumadocs sidebar tree', () => {
    const pageTree = buildDocsPageTree({
      publicUrls: new Set(['/docs', '/docs/platform']),
      runtimeDocs: [
        {
          type: ContentType.DOCS,
          slug: 'doc/api/帮助文档',
          title: 'Dragon API 帮助文档',
          description: null,
        },
      ],
      staticTree,
    });

    expect(pageTree.children).toContainEqual(
      expect.objectContaining({
        type: 'folder',
        name: '公开文档',
        children: [
          expect.objectContaining({
            type: 'page',
            name: 'Dragon API 帮助文档',
            url: '/docs/doc/api/%E5%B8%AE%E5%8A%A9%E6%96%87%E6%A1%A3',
          }),
        ],
      }),
    );
  });
});
