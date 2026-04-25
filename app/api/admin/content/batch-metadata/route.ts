import { parseBatchMetadataForm } from '@/lib/admin/batch-metadata';
import { safeAdminReturnPath } from '@/lib/admin/metadata-redirect';
import { recordAuditEvent } from '@/lib/audit/audit-service';
import { withAdminRoute } from '@/lib/auth/admin';
import { listContentItems } from '@/lib/db/content-repository';
import { createSyncJob } from '@/lib/db/sync-job-repository';
import { ActorType, SyncStatus, SyncTrigger } from '@/lib/generated/prisma/client';
import { writebackFrontmatterPatch } from '@/lib/github/writeback';
import { runReconciliation } from '@/lib/sync/reconcile';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  return withAdminRoute(async (actor, adminRequest) => {
    const formData = await adminRequest.formData();
    const parsed = parseBatchMetadataForm(formData);

    if (!parsed.ok) {
      return redirectToContentList(parsed.returnTo, {
        error: parsed.error,
      });
    }

    const contents = await listContentItems({
      where: {
        id: {
          in: parsed.contentIds,
        },
      },
    });
    const contentById = new Map(contents.map((content) => [content.id, content]));
    let updated = 0;
    let failed = 0;
    let auditFailed = 0;
    let latestCommitSha: string | undefined;

    for (const contentId of parsed.contentIds) {
      const content = contentById.get(contentId);
      if (!content) {
        failed += 1;
        continue;
      }

      const writeback = await writebackFrontmatterPatch({
        path: content.sourcePath,
        patch: parsed.patch,
        actorId: actor.githubLogin,
        contentId: content.id,
        relativePath: toRelativeContentPath(content.sourcePath),
      });

      if (!writeback.ok) {
        failed += 1;
        continue;
      }

      latestCommitSha = writeback.commitSha;
      updated += 1;

      try {
        await recordAuditEvent({
          actor: {
            type: ActorType.ADMIN,
            id: actor.githubLogin,
          },
          action: 'content.metadata.batch_writeback',
          target: {
            type: 'content',
            id: content.id,
            path: content.sourcePath,
          },
          diff: {
            count: writeback.patch.diff.length,
            fields: writeback.patch.diff.map((entry) => ({
              field: entry.field,
              changed: true,
            })),
          },
          metadata: {
            branch: writeback.branch,
            commitSha: writeback.commitSha,
            fileShaBefore: writeback.fileShaBefore,
            fileShaAfter: writeback.fileShaAfter,
          },
        });
      } catch {
        auditFailed += 1;
      }
    }

    const syncJobId = latestCommitSha
      ? await createAndRunBatchSync(actor.githubLogin, latestCommitSha)
      : undefined;

    return redirectToContentList(parsed.returnTo, {
      updated,
      failed,
      auditFailed,
      jobId: syncJobId,
    });
  })(request);
}

async function createAndRunBatchSync(requestedBy: string, sourceRef: string) {
  const job = await createSyncJob({
    trigger: SyncTrigger.MANUAL,
    status: SyncStatus.QUEUED,
    requestedBy,
    sourceRef,
    result: {
      mode: 'reconcile',
      queue: {
        mode: 'inline',
        message: 'No background queue is configured; sync executed inline in the request.',
      },
    },
  });

  await runReconciliation({
    jobId: job.id,
    sourceRef,
    reason: 'Batch metadata writeback completed; reconciliation ran inline.',
  });

  return job.id;
}

function redirectToContentList(
  returnTo: string | undefined,
  result:
    | { error: string }
    | { updated: number; failed: number; auditFailed: number; jobId?: string },
) {
  const target = new URL(safeAdminReturnPath(returnTo) ?? '/admin/content', 'https://local.invalid');

  if ('error' in result) {
    target.searchParams.set('error', result.error);
  } else {
    target.searchParams.set('batch_updated', String(result.updated));
    target.searchParams.set('batch_failed', String(result.failed));

    if (result.auditFailed > 0) {
      target.searchParams.set('batch_audit_failed', String(result.auditFailed));
    }

    if (result.jobId) {
      target.searchParams.set('job', result.jobId);
    }
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: `${target.pathname}${target.search}`,
    },
  });
}

function toRelativeContentPath(sourcePath: string) {
  return sourcePath.replace(/^content\/(?:blog|docs)\/?/, '');
}
