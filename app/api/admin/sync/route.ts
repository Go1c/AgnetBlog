import { withAdminRoute } from '@/lib/auth/admin';
import { createSyncJob } from '@/lib/db/sync-job-repository';
import { SyncStatus, SyncTrigger } from '@/lib/generated/prisma/client';
import {
  buildManualSyncRedirectLocation,
  parseManualSyncRequest,
} from '@/lib/sync/manual-request';
import { runReconciliation } from '@/lib/sync/reconcile';
import { runIncrementalSync } from '@/lib/sync/sync-service';

export const dynamic = 'force-dynamic';

export const POST = withAdminRoute(async (actor, request) => {
  const parsed = await parseManualSyncRequest(request, {
    allowFormRedirect: true,
  });
  if (!parsed.ok) {
    if (parsed.responseMode === 'redirect') {
      return redirectToAdminPage(request, parsed.returnTo, {
        error: parsed.error,
      });
    }

    return Response.json(
      {
        ok: false,
        error: parsed.error,
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const mode = input.mode ?? 'reconcile';

  if (mode === 'incremental' && !input.after) {
    if (parsed.responseMode === 'redirect') {
      return redirectToAdminPage(request, parsed.returnTo, {
        error: 'missing_after_commit',
      });
    }

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

  if (parsed.responseMode === 'redirect') {
    return redirectToAdminPage(request, parsed.returnTo, {
      jobId: job.id,
      mode: result.mode,
      status: result.status,
      scanned: result.scanned,
      upserted: result.upserted,
      failed: result.failed,
    });
  }

  return Response.json({
    ok: true,
    jobId: job.id,
    status: result.status,
    mode: result.mode,
    queue: result.queue,
  });
});

function redirectToAdminPage(
  _request: Request,
  returnTo: string | undefined,
  result: {
    error?: string;
    jobId?: string;
    mode?: string;
    status?: string;
    scanned?: number;
    upserted?: number;
    failed?: number;
  },
) {
  return new Response(null, {
    status: 303,
    headers: {
      Location: buildManualSyncRedirectLocation(returnTo, result),
    },
  });
}
