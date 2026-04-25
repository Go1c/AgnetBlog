import { z } from 'zod';

import { recordAiAuditEvent } from '@/lib/ai/audit';
import { canReadContent, serializeContentItem } from '@/lib/ai/content';
import { aiError, requireAiScopes } from '@/lib/ai/guard';
import { hasAiScope } from '@/lib/ai/scopes';
import { findContentItemById } from '@/lib/db/content-repository';
import { createSyncJob } from '@/lib/db/sync-job-repository';
import { SyncStatus, SyncTrigger } from '@/lib/generated/prisma/client';
import {
  writebackFrontmatterPatch,
  type GitHubWritebackErrorCode,
} from '@/lib/github/writeback';
import { runReconciliation } from '@/lib/sync/reconcile';
import { runIncrementalSync } from '@/lib/sync/sync-service';

export const dynamic = 'force-dynamic';

const metadataPatchSchema = z
  .object({
    visibility: z.enum(['private', 'public', 'unlisted']).optional(),
    contentType: z.enum(['blog', 'docs']).optional(),
    published: z.boolean().optional(),
    summary: z.string().trim().optional(),
    tags: z.array(z.string().trim().min(1)).optional(),
    slug: z.string().trim().min(1).optional(),
    date: z.string().trim().min(1).optional(),
    updatedAt: z.string().trim().min(1).optional(),
    docSection: z.string().trim().min(1).optional(),
    cover: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1).optional(),
  })
  .strict();

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const guard = await requireAiScopes(request, ['content:read']);
  if (!guard.ok) {
    return guard.response;
  }

  const { id } = await context.params;
  const item = await findContentItemById(id);
  const includePrivate = hasAiScope(guard.actor.scopes, 'content:read-private');

  if (!item || !canReadContent(item, includePrivate)) {
    return aiError('content_not_found', 404);
  }

  const audit = await recordAiAuditEvent({
    tokenId: guard.actor.tokenId,
    action: 'content.read',
    target: {
      type: 'content',
      id: item.id,
      path: item.sourcePath,
    },
    metadata: {
      includePrivate,
    },
  });
  if (!audit.ok) {
    return aiError(audit.error, 500);
  }

  return Response.json({
    ok: true,
    item: {
      ...serializeContentItem(item),
      assets: item.assets,
      docsNavNodes: item.docsNavNodes,
    },
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const guard = await requireAiScopes(request, ['content:write-metadata']);
  if (!guard.ok) {
    return guard.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return aiError('invalid_json', 400);
  }

  const parsed = metadataPatchSchema.safeParse(body);
  if (!parsed.success) {
    return aiError('invalid_metadata', 400, parsed.error.flatten());
  }

  if (Object.keys(parsed.data).length === 0) {
    return aiError('empty_metadata_patch', 400);
  }

  const { id } = await context.params;
  const content = await findContentItemById(id);
  if (!content) {
    return aiError('content_not_found', 404);
  }

  const patchFields = Object.keys(parsed.data);
  const attemptAudit = await recordAiAuditEvent({
    tokenId: guard.actor.tokenId,
    action: 'content.metadata.writeback.attempt',
    target: {
      type: 'content',
      id: content.id,
      path: content.sourcePath,
    },
    diff: {
      count: patchFields.length,
      fields: patchFields.map((field) => ({
        field,
        changed: true,
      })),
    },
    metadata: {
      requestedFields: patchFields,
    },
  });
  if (!attemptAudit.ok) {
    return aiError(attemptAudit.error, 500);
  }

  const writeback = await writebackFrontmatterPatch({
    path: content.sourcePath,
    patch: parsed.data,
    actorId: `ai:${guard.actor.tokenId}`,
    contentId: content.id,
    relativePath: toRelativeContentPath(content.sourcePath),
  });

  if (!writeback.ok) {
    return aiError(
      writeback.error.code,
      statusForWritebackError(writeback.error.code, writeback.error.status),
      {
        message: writeback.error.message,
        details: writeback.error.details,
      },
    );
  }

  const audit = await recordAiAuditEvent({
    tokenId: guard.actor.tokenId,
    action: 'content.metadata.writeback',
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
  const sync = await createAndRunAiWritebackSync({
    requestedBy: guard.actor.tokenId,
    before: writeback.parentCommitSha,
    after: writeback.commitSha,
  });

  return Response.json({
    ok: true,
    contentId: content.id,
    sourcePath: content.sourcePath,
    diff: {
      fields: writeback.patch.diff.map((entry) => ({
        field: entry.field,
        changed: true,
      })),
    },
    audit,
    writeback: {
      branch: writeback.branch,
      commitSha: writeback.commitSha,
      fileShaBefore: writeback.fileShaBefore,
      fileShaAfter: writeback.fileShaAfter,
    },
    sync,
  });
}

async function createAndRunAiWritebackSync(input: {
  requestedBy: string;
  before?: string;
  after: string;
}) {
  const canIncremental = Boolean(input.before);
  const job = await createSyncJob({
    trigger: SyncTrigger.AI,
    status: SyncStatus.QUEUED,
    requestedBy: input.requestedBy,
    sourceRef: input.after,
    result: {
      mode: canIncremental ? 'incremental' : 'reconcile',
      queue: {
        mode: 'inline',
        message: 'No background queue is configured; sync executed inline in the request.',
      },
    },
  });

  const result =
    canIncremental && input.before
      ? await runIncrementalSync({
          jobId: job.id,
          before: input.before,
          after: input.after,
        })
      : await runReconciliation({
          jobId: job.id,
          sourceRef: input.after,
          reason: 'GitHub writeback response did not include a parent commit; reconciliation ran inline.',
        });

  return {
    jobId: job.id,
    mode: result.mode,
    status: result.status,
    queue: result.queue,
  };
}

function toRelativeContentPath(sourcePath: string) {
  return sourcePath.replace(/^content\/(?:blog|docs)\/?/, '');
}

function statusForWritebackError(code: GitHubWritebackErrorCode, githubStatus?: number) {
  if (code === 'validation_error') {
    return 400;
  }

  if (code === 'conflict') {
    return 409;
  }

  if (code === 'not_found') {
    return 404;
  }

  if (code === 'unauthorized' || code === 'rate_limited') {
    return githubStatus ?? (code === 'unauthorized' ? 401 : 403);
  }

  if (code === 'missing_config') {
    return 500;
  }

  return 502;
}
