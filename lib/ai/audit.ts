import { recordAuditEvent } from '@/lib/audit/audit-service';
import { ActorType } from '@/lib/generated/prisma/client';

type AiAuditTarget = {
  type: string;
  id: string;
  path?: string;
};

type AiAuditDiff = {
  fields: Array<{
    field: string;
    changed: true;
  }>;
  count: number;
};

export type AiAuditResult = { ok: true } | { ok: false; error: 'audit_failed' };

export async function recordAiAuditEvent(input: {
  tokenId: string;
  action: string;
  target: AiAuditTarget;
  diff?: AiAuditDiff;
  metadata?: Record<string, unknown>;
}): Promise<AiAuditResult> {
  try {
    await recordAuditEvent({
      actor: {
        type: ActorType.AI,
        id: input.tokenId,
      },
      action: input.action,
      target: input.target,
      diff: input.diff ?? {
        count: 0,
        fields: [],
      },
      metadata: input.metadata,
    });

    return {
      ok: true,
    };
  } catch {
    return {
      ok: false,
      error: 'audit_failed',
    };
  }
}
