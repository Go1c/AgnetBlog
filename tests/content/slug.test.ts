import { describe, expect, it } from 'vitest';

import {
  normalizeSlug,
  normalizeSlugPath,
  resolveSlugSourcePath,
} from '@/lib/content/slug';

describe('slug normalization', () => {
  it('normalizes explicit slug path segments', () => {
    expect(normalizeSlugPath('  My First Post! / Part 2.md  ')).toBe('my-first-post/part-2.md');
    expect(normalizeSlug(' Docs Intro ', 'content/docs/intro.md')).toEqual({
      success: true,
      slug: 'docs-intro',
    });
  });

  it('rejects explicit slugs that produce no URL-safe segments', () => {
    const result = normalizeSlug('!!!', 'content/blog/post.md');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]?.code).toBe('invalid_explicit_slug');
    }
  });

  it('derives slugs from relative paths or configured source roots', () => {
    expect(
      resolveSlugSourcePath({
        path: 'content/blog/articles/hello-world.md',
        contentType: 'blog',
        sourceRoot: {
          blog: 'content/blog',
        },
      }),
    ).toEqual({
      success: true,
      slug: 'articles/hello-world',
    });

    expect(
      resolveSlugSourcePath({
        path: 'ignored/full/path.md',
        relativePath: 'docs/platform/index.mdx',
        contentType: 'docs',
      }),
    ).toEqual({
      success: true,
      slug: 'docs/platform/index',
    });
  });

  it('preserves Chinese path segments when deriving slugs', () => {
    expect(normalizeSlugPath('文章/我的 第一篇.md')).toBe('文章/我的-第一篇.md');
    expect(normalizeSlug(undefined, 'notes/我的笔记.md')).toEqual({
      success: true,
      slug: 'notes/我的笔记',
    });
  });
});
