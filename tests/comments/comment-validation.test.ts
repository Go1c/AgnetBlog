import { describe, expect, it } from 'vitest';

import { validateCommentInput } from '@/lib/comments/validation';

describe('comment validation', () => {
  it('defaults blank display names to anonymous storage', () => {
    expect(
      validateCommentInput({
        contentItemId: 'content-1',
        body: 'hello',
        displayName: '',
      }),
    ).toEqual({
      ok: true,
      data: {
        contentItemId: 'content-1',
        targetKey: null,
        body: 'hello',
        displayName: null,
      },
    });
  });

  it('trims custom display names', () => {
    expect(
      validateCommentInput({
        contentItemId: 'content-1',
        body: 'hello',
        displayName: '  Ada  ',
      }),
    ).toEqual({
      ok: true,
      data: {
        contentItemId: 'content-1',
        targetKey: null,
        body: 'hello',
        displayName: 'Ada',
      },
    });
  });

  it('accepts a static target key instead of a content item id', () => {
    expect(
      validateCommentInput({
        targetKey: 'docs:platform',
        body: 'hello',
      }),
    ).toEqual({
      ok: true,
      data: {
        contentItemId: null,
        targetKey: 'docs:platform',
        body: 'hello',
        displayName: null,
      },
    });
  });

  it('requires a content item id or static target key', () => {
    expect(
      validateCommentInput({
        body: 'hello',
      }),
    ).toEqual({
      ok: false,
      error: 'comment_target_required',
    });
  });

  it('rejects blank bodies', () => {
    expect(
      validateCommentInput({
        contentItemId: 'content-1',
        body: '   ',
      }),
    ).toEqual({
      ok: false,
      error: 'body_required',
    });
  });

  it('rejects bodies longer than 1000 characters after trimming', () => {
    expect(
      validateCommentInput({
        contentItemId: 'content-1',
        body: ` ${'a'.repeat(1001)} `,
      }),
    ).toEqual({
      ok: false,
      error: 'body_too_long',
    });
  });

  it('trims comment bodies', () => {
    expect(
      validateCommentInput({
        contentItemId: 'content-1',
        body: '  hello world  ',
      }),
    ).toEqual({
      ok: true,
      data: {
        contentItemId: 'content-1',
        targetKey: null,
        body: 'hello world',
        displayName: null,
      },
    });
  });

  it('limits display names to 32 characters after trimming', () => {
    expect(
      validateCommentInput({
        contentItemId: 'content-1',
        body: 'hello',
        displayName: ` ${'a'.repeat(33)} `,
      }),
    ).toEqual({
      ok: false,
      error: 'display_name_too_long',
    });
  });
});
