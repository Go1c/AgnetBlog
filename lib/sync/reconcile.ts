import { createSyncJob } from '@/lib/db/sync-job-repository';
import { SyncStatus, SyncTrigger } from '@/lib/generated/prisma/client';
import { fetchFileContent, listRepoTree } from '@/lib/github/client';
import {
  buildRunResult,
  finishJob,
  ingestAndUpsertMarkdownFiles,
  isMarkdownPath,
  unpublishMissingRepositoryContent,
} from '@/lib/sync/sync-service';
import type { ReconcileSyncInput, SyncFileResult, SyncRunResult } from '@/lib/sync/types';

export async function runReconciliation(input: ReconcileSyncInput): Promise<SyncRunResult> {
  await import('@/lib/db/sync-job-repository').then(({ updateSyncJobStatus }) =>
    updateSyncJobStatus(input.jobId, SyncStatus.RUNNING, {
      startedAt: new Date(),
      errorMessage: null,
    }),
  );

  const tree = await listRepoTree(input.sourceRef);
  if (!tree.ok) {
    return finishJob(input.jobId, {
      mode: 'reconcile',
      sourceRef: input.sourceRef,
      scanned: 1,
      upserted: 0,
      unpublished: 0,
      skipped: 0,
      failed: 1,
      files: [
        {
          path: '(repository-tree)',
          operation: 'failed',
          message: tree.error.message,
        },
      ],
      queue: {
        mode: 'inline',
        message: 'No background queue is configured; sync executed inline in the request.',
      },
      status: SyncStatus.FAILED,
    });
  }

  const markdownFiles = tree.data.filter((item) => item.type === 'blob' && isMarkdownPath(item.path));
  const results: SyncFileResult[] = [];
  const files = [];

  for (const item of markdownFiles) {
    const content = await fetchFileContent(item.path, input.sourceRef);
    if (!content.ok) {
      results.push({
        path: item.path,
        operation: 'failed',
        message: content.error.message,
      });
      continue;
    }

    files.push({
      path: item.path,
      content: content.data,
      sourceHash: item.sha,
    });
  }

  results.push(...(await ingestAndUpsertMarkdownFiles(files)));
  results.push(
    ...(await unpublishMissingRepositoryContent(new Set(markdownFiles.map((item) => item.path)))),
  );

  return finishJob(input.jobId, buildRunResult('reconcile', input.sourceRef, results));
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
