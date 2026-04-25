import { createHmac } from 'node:crypto';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { verifyGitHubWebhookRequest } from '@/lib/github/webhook';

describe('GitHub webhook signature verification', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('accepts a push event with a valid sha256 signature', () => {
    const body = JSON.stringify({ ref: 'refs/heads/main' });
    vi.stubEnv('GITHUB_WEBHOOK_SECRET', 'secret');

    expect(
      verifyGitHubWebhookRequest(
        body,
        new Headers({
          'x-github-event': 'push',
          'x-hub-signature-256': sign(body, 'secret'),
        }),
      ),
    ).toEqual({
      ok: true,
      event: 'push',
    });
  });

  it('rejects missing secrets, bad signatures, and unsupported events', () => {
    const body = '{}';

    expect(
      verifyGitHubWebhookRequest(body, new Headers({ 'x-github-event': 'push' })),
    ).toMatchObject({
      ok: false,
      code: 'missing_secret',
    });

    vi.stubEnv('GITHUB_WEBHOOK_SECRET', 'secret');
    expect(
      verifyGitHubWebhookRequest(
        body,
        new Headers({
          'x-github-event': 'push',
          'x-hub-signature-256': 'sha256=bad',
        }),
      ),
    ).toMatchObject({
      ok: false,
      code: 'invalid_signature',
    });

    expect(
      verifyGitHubWebhookRequest(
        body,
        new Headers({
          'x-github-event': 'issues',
          'x-hub-signature-256': sign(body, 'secret'),
        }),
      ),
    ).toMatchObject({
      ok: false,
      code: 'unsupported_event',
    });
  });
});

function sign(body: string, secret: string) {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}
