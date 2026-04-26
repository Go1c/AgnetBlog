import { randomBytes } from 'node:crypto';

const SHORT_SHARE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{10,24}$/;

export function generateShortShareToken(byteLength = 9) {
  return randomBytes(byteLength).toString('base64url');
}

export function isShortShareToken(value: string) {
  return SHORT_SHARE_TOKEN_PATTERN.test(value);
}
