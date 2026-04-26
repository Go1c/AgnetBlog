import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_VERSION = 'v1';

export const SHARE_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

type CreateShareAccessCookieValueInput = {
  token: string;
  secret: string;
  expiresAt: Date;
};

type VerifyShareAccessCookieValueInput = {
  token: string;
  secret: string;
  now?: Date;
};

export function createShareAccessCookieName(token: string) {
  return `share_access_${token}`;
}

export function createShareAccessCookieValue({
  token,
  secret,
  expiresAt,
}: CreateShareAccessCookieValueInput) {
  const expires = String(expiresAt.getTime());
  const payload = `${COOKIE_VERSION}.${token}.${expires}`;
  const signature = signPayload(payload, secret);

  return `${payload}.${signature}`;
}

export function verifyShareAccessCookieValue(
  value: string | null | undefined,
  { token, secret, now = new Date() }: VerifyShareAccessCookieValueInput,
) {
  if (!value || !secret) {
    return false;
  }

  const parts = value.split('.');
  if (parts.length !== 4) {
    return false;
  }

  const [version, cookieToken, expires, signature] = parts;
  if (version !== COOKIE_VERSION || cookieToken !== token) {
    return false;
  }

  const expiresAt = Number(expires);
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now.getTime()) {
    return false;
  }

  const payload = `${version}.${cookieToken}.${expires}`;
  const expectedSignature = signPayload(payload, secret);

  return timingSafeEqualString(signature, expectedSignature);
}

export function getShareAccessCookieSecret() {
  return (
    process.env.SHARE_ACCESS_COOKIE_SECRET ??
    process.env.NEXTAUTH_SECRET ??
    process.env.AUTH_SECRET ??
    ''
  );
}

function signPayload(payload: string, secret: string) {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function timingSafeEqualString(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  if (actualBuffer.byteLength !== expectedBuffer.byteLength) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}
