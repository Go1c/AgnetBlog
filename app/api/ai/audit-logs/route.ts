import { recordAiAuditEvent } from '@/lib/ai/audit';
import { requireAiScopes } from '@/lib/ai/guard';
import { listAuditLogs } from '@/lib/db/audit-log-repository';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await requireAiScopes(request, ['audit:read']);
  if (!guard.ok) {
    return guard.response;
  }

  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get('limit'), 50, 100);
  const cursor = url.searchParams.get('cursor');
  const targetType = url.searchParams.get('targetType')?.trim();
  const targetId = url.searchParams.get('targetId')?.trim();
  const where =
    targetType || targetId
      ? {
          targetType: targetType || undefined,
          targetId: targetId || undefined,
        }
      : undefined;
  const logs = await listAuditLogs({
    where,
    orderBy: {
      createdAt: 'desc',
    },
    take: limit + 1,
    ...(cursor
      ? {
          cursor: {
            id: cursor,
          },
          skip: 1,
        }
      : {}),
  });
  const page = logs.slice(0, limit);
  const nextCursor = logs.length > limit ? logs[limit]?.id : null;
  const audit = await recordAiAuditEvent({
    tokenId: guard.actor.tokenId,
    action: 'audit_logs.read',
    target: {
      type: 'audit_logs',
      id: 'collection',
    },
    metadata: {
      count: page.length,
      targetType,
      targetId,
      limit,
    },
  });
  if (!audit.ok) {
    return Response.json(
      {
        ok: false,
        error: audit.error,
      },
      { status: 500 },
    );
  }

  return Response.json({
    ok: true,
    items: page.map((entry) => ({
      id: entry.id,
      actorType: entry.actorType,
      adminUserId: entry.adminUserId,
      aiTokenId: entry.aiTokenId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: redactSecrets(entry.metadata),
      createdAt: entry.createdAt,
    })),
    nextCursor,
  });
}

function clampLimit(value: string | null, fallback: number, max: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      isSecretKey(key) ? '[redacted]' : redactSecrets(entry),
    ]),
  );
}

function isSecretKey(key: string) {
  return /(token|secret|password|authorization|cookie|key)/i.test(key);
}
