import { describe, expect, it } from 'vitest';

import {
  routeSlugSegmentsToContentSlug,
  runtimeContentUrl,
} from '@/lib/content/runtime-content';
import { ContentType } from '@/lib/generated/prisma/client';

describe('runtime content URLs', () => {
  it('encodes each slug path segment for public links', () => {
    expect(
      runtimeContentUrl({
        type: ContentType.BLOG,
        slug: '未命名/4561223',
      }),
    ).toBe('/blog/%E6%9C%AA%E5%91%BD%E5%90%8D/4561223');
  });

  it('decodes route slug segments before querying stored content slugs', () => {
    expect(
      routeSlugSegmentsToContentSlug(['%E6%9C%AA%E5%91%BD%E5%90%8D', '4561223']),
    ).toBe('未命名/4561223');
    expect(routeSlugSegmentsToContentSlug(['work', '逆向', '技术文档'])).toBe(
      'work/逆向/技术文档',
    );
  });
});
