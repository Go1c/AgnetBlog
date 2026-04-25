import { createSyncJob } from '@/lib/db/sync-job-repository';
import { getConfiguredGitHubBranch } from '@/lib/github/client';
import { verifyGitHubWebhookRequest } from '@/lib/github/webhook';
import { SyncStatus, SyncTrigger } from '@/lib/generated/prisma/client';
import { runReconciliation } from '@/lib/sync/reconcile';
import { runIncrementalSync } from '@/lib/sync/sync-service';
import type { GitHubPushPayload } from '@/lib/sync/types';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const verification = verifyGitHubWebhookRequest(rawBody, request.headers);

  if (!verification.ok) {
    return Response.json(
      {
        ok: false,
        error: verification.code,
        message: verification.message,
      },
      { status: verification.status },
    );
  }

  let payload: GitHubPushPayload;
  try {
    payload = JSON.parse(rawBody) as GitHubPushPayload;
  } catch {
    return Response.json(
      {
        ok: false,
        error: 'invalid_json',
      },
      { status: 400 },
    );
  }

  const configuredRef = `refs/heads/${getConfiguredGitHubBranch()}`;
  if (payload.ref !== configuredRef) {
    return Response.json({
      ok: true,
      ignored: true,
      reason: 'non_configured_branch',
      configuredRef,
    });
  }

  if (!payload.after) {
    return Response.json(
      {
        ok: false,
        error: 'missing_after_commit',
      },
      { status: 400 },
    );
  }

  const job = await createSyncJob({
    trigger: SyncTrigger.WEBHOOK,
    status: SyncStatus.QUEUED,
    requestedBy: payload.pusher?.name ?? payload.pusher?.email ?? 'github-webhook',
    sourceRef: payload.after,
    result: {
      event: 'push',
      ref: payload.ref,
      queue: {
        mode: 'inline',
        message: 'No background queue is configured; sync executed inline in the request.',
      },
    },
  });

  const before = payload.before ?? null;
  const result =
    before && !/^0{40}$/.test(before)
      ? await runIncrementalSync({
          jobId: job.id,
          before,
          after: payload.after,
        })
      : await runReconciliation({
          jobId: job.id,
          sourceRef: payload.after,
        });

  return Response.json({
    ok: true,
    jobId: job.id,
    status: result.status,
    mode: result.mode,
    queue: result.queue,
  });
}
