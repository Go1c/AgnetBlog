import { describe, expect, it } from 'vitest';

import {
  isDirectlyReadable,
  isPublicListable,
  isPublicSearchable,
} from '@/lib/content/visibility';

describe('content visibility guards', () => {
  it('lists and searches only published public pages', () => {
    expect(isPublicListable({ data: { visibility: 'public', published: true } })).toBe(true);
    expect(isPublicSearchable({ data: { visibility: 'public', published: true } })).toBe(true);
    expect(isPublicListable({ data: { visibility: 'unlisted', published: true } })).toBe(false);
    expect(isPublicListable({ data: { visibility: 'public', published: false } })).toBe(false);
  });

  it('allows direct reads for unlisted content but blocks private or unpublished content', () => {
    expect(isDirectlyReadable({ data: { visibility: 'unlisted', published: true } })).toBe(true);
    expect(isDirectlyReadable({ data: { visibility: 'private', published: true } })).toBe(false);
    expect(isDirectlyReadable({ data: { visibility: 'public', published: false } })).toBe(false);
  });
});
