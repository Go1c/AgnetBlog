import { createHmac, randomBytes } from 'node:crypto';

import { db } from '@/lib/db';
import type { AiToken } from '@/lib/generated/prisma/client';

import {
  normalizeAiScopes,
  parseAiScopes,
  type AiScope,
} from './scopes';

export const AI_TOKEN_PREFIX = 'agnet_ai_';

export class AiTokenConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiTokenConfigError';
  }
}

export class AiTokenInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiTokenInputError';
  }
}

export function generateAiTokenSecret() {
  return `${AI_TOKEN_PREFIX}${randomBytes(32).toString('base64url')}`;
}

export function hashAiToken(token: string) {
  const pepper = process.env.AI_TOKEN_PEPPER?.trim();

  if (!pepper) {
    throw new AiTokenConfigError('AI_TOKEN_PEPPER is required for AI token hashing.');
  }

  return createHmac('sha256', pepper).update(token).digest('hex');
}

export async function createAiToken(input: {
  name: string;
  scopes: Iterable<unknown>;
  createdByAdminId?: string;
}): Promise<{ token: string; record: AiToken }> {
  const name = input.name.trim();
  if (name.length === 0) {
    throw new AiTokenInputError('Token name is required.');
  }

  const parsedScopes = parseAiScopes(input.scopes);
  if (!parsedScopes.ok) {
    throw new AiTokenInputError(`Invalid scopes: ${parsedScopes.invalidScopes.join(', ')}`);
  }

  if (parsedScopes.scopes.length === 0) {
    throw new AiTokenInputError('At least one scope is required.');
  }

  const token = generateAiTokenSecret();
  const tokenHash = hashAiToken(token);
  const record = await db.aiToken.create({
    data: {
      name,
      tokenHash,
      scopes: parsedScopes.scopes,
      createdByAdmin: input.createdByAdminId
        ? {
            connect: {
              id: input.createdByAdminId,
            },
          }
        : undefined,
    },
  });

  return {
    token,
    record,
  };
}

export async function findAiTokenBySecret(token: string) {
  return db.aiToken.findUnique({
    where: {
      tokenHash: hashAiToken(token),
    },
  });
}

export async function listAiTokens() {
  return db.aiToken.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      createdByAdmin: true,
    },
  });
}

export async function revokeAiToken(id: string) {
  return db.aiToken.update({
    where: {
      id,
    },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function touchAiTokenLastUsedAt(id: string) {
  return db.aiToken.update({
    where: {
      id,
    },
    data: {
      lastUsedAt: new Date(),
    },
  });
}

export function getStoredAiScopes(token: { scopes?: string[] | null }): AiScope[] {
  return normalizeAiScopes(token.scopes ?? []);
}
