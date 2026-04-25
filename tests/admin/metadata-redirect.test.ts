import { describe, expect, it } from 'vitest';

import { buildMetadataRedirectLocation, safeAdminReturnPath } from '@/lib/admin/metadata-redirect';

describe('admin metadata redirects', () => {
  it('returns to the current admin detail page after a successful writeback', () => {
    expect(
      buildMetadataRedirectLocation('/admin/content/content-1', {
        statusParam: 'updated',
        contentId: 'content-1',
        jobId: 'job-1',
      }),
    ).toBe('/admin/content/content-1?updated=content-1&job=job-1');
  });

  it('keeps redirect targets relative and inside admin pages', () => {
    expect(safeAdminReturnPath('/admin/content')).toBe('/admin/content');
    expect(safeAdminReturnPath('http://localhost:8080/admin/content')).toBeUndefined();
    expect(safeAdminReturnPath('//blog.lumio.games/admin/content')).toBeUndefined();
    expect(safeAdminReturnPath('/blog')).toBeUndefined();
  });

  it('falls back to the content list for unsafe return targets', () => {
    expect(
      buildMetadataRedirectLocation('http://localhost:8080/admin/content/content-1', {
        error: 'validation_error',
      }),
    ).toBe('/admin/content?error=validation_error');
  });
});
