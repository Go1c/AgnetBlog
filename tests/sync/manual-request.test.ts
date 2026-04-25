import { describe, expect, it } from 'vitest';

import {
  buildManualSyncRedirectLocation,
  parseManualSyncRequest,
} from '@/lib/sync/manual-request';

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

  it('builds relative redirect locations so proxies cannot leak localhost hosts', () => {
    expect(
      buildManualSyncRedirectLocation('/admin/content', {
        jobId: 'job-1',
        mode: 'reconcile',
        status: 'SUCCESS',
      }),
    ).toBe('/admin/content?sync_job=job-1&sync_mode=reconcile&sync_status=SUCCESS');

    expect(
      buildManualSyncRedirectLocation('http://localhost:8080/admin/content', {
        error: 'invalid_mode',
      }),
    ).toBe('/admin/sync-jobs?sync_error=invalid_mode');
  });
});
