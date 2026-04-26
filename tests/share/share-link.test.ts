import { describe, expect, it } from 'vitest';

import {
  generateShortShareToken,
  isShortShareToken,
} from '@/lib/share/short-token';
import { hashSharePassword, verifySharePassword } from '@/lib/share/password';
import {
  createShareAccessCookieValue,
  verifyShareAccessCookieValue,
} from '@/lib/share/access-cookie';

describe('share short tokens', () => {
  it('generates compact URL-safe tokens', () => {
    const token = generateShortShareToken();

    expect(token).toMatch(/^[A-Za-z0-9_-]{10,24}$/);
    expect(isShortShareToken(token)).toBe(true);
    expect(isShortShareToken('abc/def')).toBe(false);
    expect(isShortShareToken('abc def')).toBe(false);
  });
});

describe('share passwords', () => {
  it('hashes and verifies passwords without storing the plain text', async () => {
    const hash = await hashSharePassword('correct horse battery staple');

    expect(hash).not.toContain('correct horse battery staple');
    await expect(verifySharePassword('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(verifySharePassword('wrong password', hash)).resolves.toBe(false);
  });
});

describe('share access cookies', () => {
  const secret = 'test-secret-with-enough-entropy';
  const now = new Date('2026-04-26T00:00:00.000Z');
  const expiresAt = new Date('2026-04-26T01:00:00.000Z');

  it('verifies a signed cookie for the matching share token', () => {
    const value = createShareAccessCookieValue({
      token: 'share-token',
      secret,
      expiresAt,
    });

    expect(
      verifyShareAccessCookieValue(value, {
        token: 'share-token',
        secret,
        now,
      }),
    ).toBe(true);
  });

  it('rejects tampered, expired, and wrong-token cookie values', () => {
    const value = createShareAccessCookieValue({
      token: 'share-token',
      secret,
      expiresAt,
    });

    expect(
      verifyShareAccessCookieValue(`${value}tampered`, {
        token: 'share-token',
        secret,
        now,
      }),
    ).toBe(false);
    expect(
      verifyShareAccessCookieValue(value, {
        token: 'share-token',
        secret,
        now: new Date('2026-04-26T01:00:01.000Z'),
      }),
    ).toBe(false);
    expect(
      verifyShareAccessCookieValue(value, {
        token: 'other-token',
        secret,
        now,
      }),
    ).toBe(false);
  });
});
