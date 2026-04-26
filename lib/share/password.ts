import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const PASSWORD_HASH_VERSION = 'scrypt-v1';
const KEY_LENGTH = 32;

export async function hashSharePassword(password: string) {
  const salt = randomBytes(16).toString('base64url');
  const key = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  return `${PASSWORD_HASH_VERSION}:${salt}:${key.toString('base64url')}`;
}

export async function verifySharePassword(password: string, storedHash: string | null | undefined) {
  if (!storedHash) {
    return false;
  }

  const [version, salt, expectedHash] = storedHash.split(':');
  if (version !== PASSWORD_HASH_VERSION || !salt || !expectedHash) {
    return false;
  }

  const actual = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(expectedHash, 'base64url');

  if (actual.byteLength !== expected.byteLength) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
