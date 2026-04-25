import { createAuditLog } from '@/lib/db/audit-log-repository';
import { db } from '@/lib/db';
import { ActorType, type Prisma } from '@/lib/generated/prisma/client';

export type AuditActor = {
  type: ActorType;
  id: string;
};

export type AuditTarget = {
  type: string;
  id: string;
  path?: string;
};

export type AuditDiffSummary = {
  fields: Array<{
    field: string;
    before: unknown;
    after: unknown;
  }>;
};

export async function recordAuditEvent(input: {
  actor: AuditActor;
  action: string;
  target: AuditTarget;
  diff: AuditDiffSummary;
  metadata?: Record<string, unknown>;
}) {
  const adminUserId =
    input.actor.type === ActorType.ADMIN
      ? await findAdminUserId(input.actor.id)
      : undefined;

  return createAuditLog({
    actorType: input.actor.type,
    adminUser: adminUserId
      ? {
          connect: {
            id: adminUserId,
          },
        }
      : undefined,
    action: input.action,
    targetType: input.target.type,
    targetId: input.target.id,
    metadata: redactSecrets({
      actor: {
        type: input.actor.type,
        id: input.actor.id,
      },
      target: input.target,
      diff: input.diff,
      timestamp: new Date().toISOString(),
      ...(input.metadata ?? {}),
    }) as Prisma.InputJsonValue,
  });
}

async function findAdminUserId(actorId: string) {
  const admin = await db.adminUser.findUnique({
    where: {
      githubLogin: actorId,
    },
    select: {
      id: true,
    },
  });

  return admin?.id;
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
