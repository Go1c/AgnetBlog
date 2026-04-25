import { recordAiAuditEvent } from '@/lib/ai/audit';
import { aiError, requireAiScopes } from '@/lib/ai/guard';
import { createSyncJob } from '@/lib/db/sync-job-repository';
import { SyncStatus, SyncTrigger } from '@/lib/generated/prisma/client';
import { runReconciliation } from '@/lib/sync/reconcile';
import { runIncrementalSync } from '@/lib/sync/sync-service';
import type { ManualSyncRequest } from '@/lib/sync/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const guard = await requireAiScopes(request, ['sync:trigger']);
  if (!guard.ok) {
    return guard.response;
  }

  const parsed = await parseManualSyncRequest(request);
  if (!parsed.ok) {
    return aiError(parsed.error, 400);
  }

  const input = parsed.data;
  const mode = input.mode ?? 'reconcile';
  if (mode === 'incremental' && !input.after) {
    return aiError('missing_after_commit', 400);
  }

  const attemptAudit = await recordAiAuditEvent({
    tokenId: guard.actor.tokenId,
    action: 'sync.trigger.attempt',
    target: {
      type: 'sync_job',
      id: 'pending',
    },
    metadata: {
      mode,
      before: input.before,
      after: input.after,
    },
  });
  if (!attemptAudit.ok) {
    return aiError(attemptAudit.error, 500);
  }

  const sourceRef = mode === 'incremental' ? input.after : 'reconcile';
  const job = await createSyncJob({
    trigger: SyncTrigger.AI,
    status: SyncStatus.QUEUED,
    requestedBy: guard.actor.tokenId,
    sourceRef,
    result: {
      mode,
      queue: {
        mode: 'inline',
        message: 'No background queue is configured; sync executed inline in the request.',
      },
    },
  });
  const result =
    mode === 'incremental'
      ? await runIncrementalSync({
          jobId: job.id,
          before: input.before ?? null,
          after: input.after as string,
        })
      : await runReconciliation({
          jobId: job.id,
          sourceRef: input.after,
        });
  const audit = await recordAiAuditEvent({
    tokenId: guard.actor.tokenId,
    action: 'sync.trigger',
    target: {
      type: 'sync_job',
      id: job.id,
    },
    metadata: {
      mode,
      status: result.status,
      before: input.before,
      after: input.after,
    },
  });

  return Response.json({
    ok: true,
    jobId: job.id,
    status: result.status,
    mode: result.mode,
    queue: result.queue,
    audit,
  });
}

type ManualSyncParseResult =
  | {
      ok: true;
      data: ManualSyncRequest;
    }
  | {
      ok: false;
      error: string;
    };

async function parseManualSyncRequest(request: Request): Promise<ManualSyncParseResult> {
  const text = await request.text();

  if (text.trim().length === 0) {
    return {
      ok: true,
      data: {},
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return {
      ok: false,
      error: 'invalid_json',
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'invalid_body',
    };
  }

  const candidate = parsed as Record<string, unknown>;
  if (
    candidate.mode !== undefined &&
    candidate.mode !== 'reconcile' &&
    candidate.mode !== 'incremental'
  ) {
    return {
      ok: false,
      error: 'invalid_mode',
    };
  }

  if (candidate.before !== undefined && typeof candidate.before !== 'string') {
    return {
      ok: false,
      error: 'invalid_before',
    };
  }

  if (candidate.after !== undefined && typeof candidate.after !== 'string') {
    return {
      ok: false,
      error: 'invalid_after',
    };
  }

  return {
    ok: true,
    data: {
      mode: candidate.mode,
      before: candidate.before,
      after: candidate.after,
    } as ManualSyncRequest,
  };
}
