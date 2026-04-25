import { createSyncJob } from '@/lib/db/sync-job-repository';
import { SyncStatus, SyncTrigger } from '@/lib/generated/prisma/client';
import { runReconciliationSync } from '@/lib/sync/sync-service';
import type { ReconcileSyncInput, SyncRunResult } from '@/lib/sync/types';

export async function runReconciliation(input: ReconcileSyncInput): Promise<SyncRunResult> {
  return runReconciliationSync(input);
}

export async function createAndRunReconciliation(requestedBy?: string) {
  const job = await createSyncJob({
    trigger: SyncTrigger.MANUAL,
    status: SyncStatus.QUEUED,
    requestedBy,
    sourceRef: 'reconcile',
    result: {
      queue: {
        mode: 'inline',
        message: 'No background queue is configured; sync executed inline in the request.',
      },
    },
  });

  const result = await runReconciliation({
    jobId: job.id,
  });

  return {
    jobId: job.id,
    status: result.status,
    result,
  };
}
