import { createHmac, timingSafeEqual } from 'node:crypto';

export type WebhookVerificationResult =
  | {
      ok: true;
      event: 'push';
    }
  | {
      ok: false;
      status: 400 | 401 | 501;
      code:
        | 'missing_secret'
        | 'missing_signature'
        | 'invalid_signature'
        | 'unsupported_signature'
        | 'unsupported_event';
      message: string;
    };

export function verifyGitHubWebhookRequest(
  body: string,
  headers: Headers,
): WebhookVerificationResult {
  const event = headers.get('x-github-event');
  if (event !== 'push') {
    return {
      ok: false,
      status: 501,
      code: 'unsupported_event',
      message: 'Only GitHub push events are supported.',
    };
  }

  const signature = headers.get('x-hub-signature-256');
  const secret = process.env.GITHUB_WEBHOOK_SECRET?.trim();

  if (!secret) {
    return {
      ok: false,
      status: 401,
      code: 'missing_secret',
      message: 'GitHub webhook secret is not configured.',
    };
  }

  if (!signature) {
    return {
      ok: false,
      status: 401,
      code: 'missing_signature',
      message: 'Missing GitHub webhook signature.',
    };
  }

  if (!signature.startsWith('sha256=')) {
    return {
      ok: false,
      status: 401,
      code: 'unsupported_signature',
      message: 'Unsupported GitHub webhook signature format.',
    };
  }

  const expected = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return {
      ok: false,
      status: 401,
      code: 'invalid_signature',
      message: 'Invalid GitHub webhook signature.',
    };
  }

  return {
    ok: true,
    event: 'push',
  };
}
