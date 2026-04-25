import {
  AiTokenConfigError,
  findAiTokenBySecret,
  getStoredAiScopes,
  touchAiTokenLastUsedAt,
} from '@/lib/ai/token';
import { ActorType } from '@/lib/generated/prisma/client';

import { hasAllAiScopes, type AiScope } from './scopes';

export type AiActor = {
  type: ActorType;
  id: string;
  tokenId: string;
  tokenName: string;
  scopes: AiScope[];
};

export type AiGuardResult =
  | {
      ok: true;
      actor: AiActor;
    }
  | {
      ok: false;
      response: Response;
    };

export async function requireAiScopes(
  request: Request,
  requiredScopes: readonly AiScope[],
): Promise<AiGuardResult> {
  const token = parseBearerToken(request.headers.get('authorization'));
  if (!token) {
    return {
      ok: false,
      response: aiError('missing_bearer_token', 401),
    };
  }

  let record;
  try {
    record = await findAiTokenBySecret(token);
  } catch (error) {
    if (error instanceof AiTokenConfigError) {
      return {
        ok: false,
        response: aiError('ai_token_config_error', 500),
      };
    }

    throw error;
  }

  if (!record || record.revokedAt) {
    return {
      ok: false,
      response: aiError('invalid_ai_token', 401),
    };
  }

  const scopes = getStoredAiScopes(record);
  await touchAiTokenLastUsedAt(record.id);

  if (!hasAllAiScopes(scopes, requiredScopes)) {
    return {
      ok: false,
      response: aiError('insufficient_scope', 403, {
        requiredScopes,
      }),
    };
  }

  return {
    ok: true,
    actor: {
      type: ActorType.AI,
      id: record.id,
      tokenId: record.id,
      tokenName: record.name,
      scopes,
    },
  };
}

export function aiError(error: string, status: number, details?: unknown) {
  return Response.json(
    {
      ok: false,
      error,
      details,
    },
    { status },
  );
}

function parseBearerToken(header: string | null) {
  const match = header?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  return token && token.length > 0 ? token : null;
}
