import { describe, expect, it } from 'vitest';

import {
  parseFrontmatterBlock,
  validateFrontmatter,
} from '@/lib/content/frontmatter';

describe('frontmatter validation', () => {
  it('parses supported scalar and list values from markdown frontmatter', () => {
    const parsed = parseFrontmatterBlock(`---
title: Hello World
contentType: blog
visibility: public
published: true
date: 2026-04-25
tags:
  - notes
  - publishing
---
# Hello`);
    const result = validateFrontmatter(parsed);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        title: 'Hello World',
        contentType: 'blog',
        visibility: 'public',
        published: true,
        date: '2026-04-25',
        tags: ['notes', 'publishing'],
      });
    }
  });

  it('rejects invalid content type and visibility values', () => {
    const result = validateFrontmatter({
      contentType: 'note',
      visibility: 'secret',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.map((error) => error.field)).toEqual(['contentType', 'visibility']);
    }
  });
});
