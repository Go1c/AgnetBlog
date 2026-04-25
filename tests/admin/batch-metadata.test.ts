import { describe, expect, it } from 'vitest';

import { parseBatchMetadataForm } from '@/lib/admin/batch-metadata';

describe('admin batch metadata form parsing', () => {
  it('builds a metadata patch for selected content IDs only', () => {
    const formData = new FormData();
    formData.append('contentId', 'content-1');
    formData.append('contentId', 'content-2');
    formData.set('visibility', 'public');
    formData.set('published', 'true');
    formData.set('contentType', 'keep');
    formData.set('returnTo', '/admin/content?type=docs');

    expect(parseBatchMetadataForm(formData)).toEqual({
      ok: true,
      contentIds: ['content-1', 'content-2'],
      patch: {
        visibility: 'public',
        published: true,
      },
      returnTo: '/admin/content?type=docs',
    });
  });

  it('rejects empty selections and empty batch patches', () => {
    const noSelection = new FormData();
    noSelection.set('visibility', 'public');

    expect(parseBatchMetadataForm(noSelection)).toEqual({
      ok: false,
      error: 'no_content_selected',
    });

    const noPatch = new FormData();
    noPatch.append('contentId', 'content-1');
    noPatch.set('visibility', 'keep');
    noPatch.set('published', 'keep');
    noPatch.set('contentType', 'keep');

    expect(parseBatchMetadataForm(noPatch)).toEqual({
      ok: false,
      error: 'empty_metadata_patch',
    });
  });
});
