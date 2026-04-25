import { describe, expect, it } from 'vitest';

import { parseManualSyncRequest } from '@/lib/sync/manual-request';

describe('manual sync request parsing', () => {
  it('accepts admin form posts and preserves a safe return path', async () => {
    const request = new Request('https://blog.lumio.games/api/admin/sync', {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        returnTo: '/admin/content',
        mode: 'reconcile',
      }),
    });

    await expect(
      parseManualSyncRequest(request, { allowFormRedirect: true }),
    ).resolves.toEqual({
      ok: true,
      data: {
        mode: 'reconcile',
      },
      responseMode: 'redirect',
      returnTo: '/admin/content',
    });
  });

  it('keeps JSON API callers on JSON responses', async () => {
    const request = new Request('https://blog.lumio.games/api/admin/sync', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'incremental',
        before: 'before-sha',
        after: 'after-sha',
      }),
    });

    await expect(parseManualSyncRequest(request)).resolves.toEqual({
      ok: true,
      data: {
        mode: 'incremental',
        before: 'before-sha',
        after: 'after-sha',
      },
      responseMode: 'json',
    });
  });

  it('rejects unsupported modes before running sync', async () => {
    const request = new Request('https://blog.lumio.games/api/admin/sync', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'bad',
      }),
    });

    await expect(parseManualSyncRequest(request)).resolves.toEqual({
      ok: false,
      error: 'invalid_mode',
      responseMode: 'json',
    });
  });
});
