import { withAdminRoute } from '@/lib/auth/admin';
import { createSyncJob } from '@/lib/db/sync-job-repository';
import { SyncStatus, SyncTrigger } from '@/lib/generated/prisma/client';
import { runReconciliation } from '@/lib/sync/reconcile';
import { runIncrementalSync } from '@/lib/sync/sync-service';
import type { ManualSyncRequest } from '@/lib/sync/types';

export const dynamic = 'force-dynamic';

export const POST = withAdminRoute(async (actor, request) => {
  const input = await parseManualSyncRequest(request);
  const mode = input.mode ?? 'reconcile';

  if (mode === 'incremental' && !input.after) {
    return Response.json(
      {
        ok: false,
        error: 'missing_after_commit',
      },
      { status: 400 },
    );
  }

  const sourceRef = mode === 'incremental' ? input.after : 'reconcile';
  const job = await createSyncJob({
    trigger: SyncTrigger.MANUAL,
    status: SyncStatus.QUEUED,
    requestedBy: actor.githubLogin,
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

  return Response.json({
    ok: true,
    jobId: job.id,
    status: result.status,
    mode: result.mode,
    queue: result.queue,
  });
});

async function parseManualSyncRequest(request: Request): Promise<ManualSyncRequest> {
  const text = await request.text();

  if (text.trim().length === 0) {
    return {};
  }

  try {
    const parsed = JSON.parse(text) as ManualSyncRequest;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}
